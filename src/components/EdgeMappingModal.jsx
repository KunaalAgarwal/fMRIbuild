import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { getToolConfigSync } from '../utils/toolRegistry.js';
import { parseExtensionsFromGlob, checkExtensionCompatibility } from '../utils/extensionValidation.js';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/edgeMappingModal.css';

/**
 * Type compatibility checking utilities
 */
const getBaseType = (type) => {
    // Remove nullable (?) and array ([]) modifiers
    return type?.replace(/[\?\[\]]/g, '') || 'File';
};

const isArrayType = (type) => type?.includes('[]') || false;

const checkTypeCompatibility = (outputType, inputType, outputExtensions = null, inputAcceptedExtensions = null) => {
    if (!outputType || !inputType) return { compatible: true };

    const outBase = getBaseType(outputType);
    const inBase = getBaseType(inputType);

    // 'any' type (used by dummy I/O nodes) is always compatible
    if (outBase === 'any' || inBase === 'any') return { compatible: true };

    const outArray = isArrayType(outputType);
    const inArray = isArrayType(inputType);

    // Array mismatch check
    if (outArray !== inArray) {
        return { compatible: false, reason: `Array mismatch: ${outputType} → ${inputType}` };
    }

    // Base type check (File vs non-File)
    if (outBase !== inBase) {
        return { compatible: false, reason: `Type mismatch: ${outputType} → ${inputType}` };
    }

    // Extension compatibility check for File types
    if (outBase === 'File' && (outputExtensions || inputAcceptedExtensions)) {
        const extCompat = checkExtensionCompatibility(outputExtensions, inputAcceptedExtensions);
        if (!extCompat.compatible) {
            return {
                compatible: false,
                reason: extCompat.reason,
                isExtensionMismatch: true
            };
        }
        if (extCompat.warning) {
            return {
                compatible: true,
                warning: true,
                reason: extCompat.reason,
                isExtensionWarning: true
            };
        }
    }

    return { compatible: true };
};

// Export for use in workflowCanvas
export { checkTypeCompatibility, getBaseType, isArrayType };

/**
 * Get tool inputs/outputs, with fallback for undefined tools.
 * Includes file extension metadata for validation.
 */
const getToolIO = (toolLabel, isDummy = false) => {
    // Dummy I/O nodes accept any data type
    if (isDummy) {
        return {
            outputs: [{ name: 'output', type: 'any', label: 'Output', extensions: [] }],
            inputs: [{ name: 'input', type: 'any', label: 'Input', acceptedExtensions: null }],
            isGeneric: true,
            isDummy: true
        };
    }
    const tool = getToolConfigSync(toolLabel);
    if (tool) {
        return {
            outputs: Object.entries(tool.outputs).map(([name, def]) => ({
                name,
                type: def.type,
                label: def.label || name,
                extensions: parseExtensionsFromGlob(def.glob)
            })),
            inputs: Object.entries(tool.requiredInputs)
                .filter(([_, def]) => def.passthrough)
                .map(([name, def]) => ({
                    name,
                    type: def.type,
                    label: def.label || name,
                    acceptedExtensions: def.acceptedExtensions || null
                })),
            isGeneric: false
        };
    }
    // Fallback for undefined tools
    return {
        outputs: [{ name: 'output', type: 'File', label: 'Output', extensions: [] }],
        inputs: [{ name: 'input', type: 'File', label: 'Input', acceptedExtensions: null }],
        isGeneric: true
    };
};

const EdgeMappingModal = ({
    show,
    onClose,
    onSave,
    sourceNode,
    targetNode,
    existingMappings = [],
    hasTypeMismatch = false
}) => {
    const { showWarning } = useToast();
    const [mappings, setMappings] = useState([]);
    const [selectedOutput, setSelectedOutput] = useState(null);
    const outputRefs = useRef({});
    const inputRefs = useRef({});
    const containerRef = useRef(null);
    const [linePositions, setLinePositions] = useState([]);

    const sourceIO = getToolIO(sourceNode?.label, sourceNode?.isDummy);
    const targetIO = getToolIO(targetNode?.label, targetNode?.isDummy);

    // Initialize mappings when modal opens
    useEffect(() => {
        if (show) {
            if (existingMappings.length > 0) {
                setMappings(existingMappings);
            } else {
                // Default mapping: first output to first input
                const defaultMapping = [];
                if (sourceIO.outputs.length > 0 && targetIO.inputs.length > 0) {
                    // For defined tools, use primaryOutputs if available
                    const tool = getToolConfigSync(sourceNode?.label);
                    const primaryOutput = tool?.primaryOutputs?.[0] || sourceIO.outputs[0].name;
                    defaultMapping.push({
                        sourceOutput: primaryOutput,
                        targetInput: targetIO.inputs[0].name
                    });
                }
                setMappings(defaultMapping);
            }
            setSelectedOutput(null);
        }
    }, [show, sourceNode?.label, targetNode?.label]);

    // Calculate line positions after render
    useEffect(() => {
        if (show && containerRef.current) {
            const timer = setTimeout(() => {
                calculateLinePositions();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [show, mappings]);

    const calculateLinePositions = () => {
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const newPositions = mappings.map(mapping => {
            const outputEl = outputRefs.current[mapping.sourceOutput];
            const inputEl = inputRefs.current[mapping.targetInput];

            if (!outputEl || !inputEl) return null;

            const outputRect = outputEl.getBoundingClientRect();
            const inputRect = inputEl.getBoundingClientRect();

            return {
                x1: outputRect.right - containerRect.left,
                y1: outputRect.top + outputRect.height / 2 - containerRect.top,
                x2: inputRect.left - containerRect.left,
                y2: inputRect.top + inputRect.height / 2 - containerRect.top,
                key: `${mapping.sourceOutput}-${mapping.targetInput}`
            };
        }).filter(Boolean);

        setLinePositions(newPositions);
    };

    const handleOutputClick = (outputName) => {
        setSelectedOutput(outputName);
    };

    const handleInputClick = (inputName) => {
        if (selectedOutput) {
            // Check if this exact mapping exists (to toggle off)
            const existingExactMatch = mappings.findIndex(
                m => m.sourceOutput === selectedOutput && m.targetInput === inputName
            );

            if (existingExactMatch >= 0) {
                // Remove existing mapping (toggle off)
                setMappings(prev => prev.filter((_, i) => i !== existingExactMatch));
            } else {
                // Enforce one-to-one: remove any existing mapping TO this input, then add new one
                setMappings(prev => [
                    ...prev.filter(m => m.targetInput !== inputName),
                    { sourceOutput: selectedOutput, targetInput: inputName }
                ]);
            }
            setSelectedOutput(null);
        }
    };

    const handleLineClick = (mapping) => {
        // Remove mapping when clicking on line
        setMappings(prev => prev.filter(
            m => !(m.sourceOutput === mapping.sourceOutput && m.targetInput === mapping.targetInput)
        ));
    };

    const handleSave = () => {
        if (mappings.length === 0) {
            showWarning('Please create at least one mapping before saving.');
            return;
        }
        onSave(mappings);
    };

    const handleCancel = () => {
        setMappings([]);
        setSelectedOutput(null);
        onClose();
    };

    const isOutputMapped = (outputName) => {
        return mappings.some(m => m.sourceOutput === outputName);
    };

    const isInputMapped = (inputName) => {
        return mappings.some(m => m.targetInput === inputName);
    };

    // Check type compatibility for a specific output-input pair
    const getMappingCompatibility = (outputName, inputName) => {
        const output = sourceIO.outputs.find(o => o.name === outputName);
        const input = targetIO.inputs.find(i => i.name === inputName);
        return checkTypeCompatibility(
            output?.type,
            input?.type,
            output?.extensions,
            input?.acceptedExtensions
        );
    };

    // Check if any current mappings have type issues
    const hasIncompatibleMappings = mappings.some(m => {
        const { compatible } = getMappingCompatibility(m.sourceOutput, m.targetInput);
        return !compatible;
    });

    if (!sourceNode || !targetNode) return null;

    return (
        <Modal
            show={show}
            onHide={handleCancel}
            centered
            size="lg"
            className="edge-mapping-modal"
        >
            <Modal.Header>
                <Modal.Title>
                    Connect: {sourceNode.label} → {targetNode.label}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/* Type mismatch warning banner */}
                {(hasTypeMismatch || hasIncompatibleMappings) && (
                    <div className="type-warning-banner">
                        <span className="warning-icon">⚠️</span>
                        <span>Type mismatch detected. The output and input types may not be compatible.</span>
                    </div>
                )}

                <div className="mapping-container" ref={containerRef}>
                    {/* Outputs Column */}
                    <div className="io-column outputs-column">
                        <div className="column-header">
                            Outputs ({sourceNode.label})
                            {sourceIO.isGeneric && <span className="generic-badge">generic</span>}
                        </div>
                        {sourceIO.outputs.map(output => {
                            // Check if this output is mapped to an incompatible input
                            const mapping = mappings.find(m => m.sourceOutput === output.name);
                            const compatibility = mapping
                                ? getMappingCompatibility(output.name, mapping.targetInput)
                                : { compatible: true };

                            return (
                                <div
                                    key={output.name}
                                    ref={el => outputRefs.current[output.name] = el}
                                    className={`io-item output-item ${
                                        selectedOutput === output.name ? 'selected' : ''
                                    } ${isOutputMapped(output.name) ? 'mapped' : ''} ${
                                        !compatibility.compatible ? 'mismatch-warning' : ''
                                    }`}
                                    onClick={() => handleOutputClick(output.name)}
                                >
                                    <div className="io-item-main">
                                        <span className="io-name">{output.label}</span>
                                        <span className="io-type">{output.type}</span>
                                        {!compatibility.compatible && <span className="warning-icon" title={compatibility.reason}>⚠️</span>}
                                    </div>
                                    {output.extensions?.length > 0 && (
                                        <span className="io-extensions" title={output.extensions.join(', ')}>
                                            {output.extensions.join(', ')}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Connection Lines SVG */}
                    <svg className="connection-lines">
                        {linePositions.map(pos => {
                            const mapping = mappings.find(
                                m => `${m.sourceOutput}-${m.targetInput}` === pos.key
                            );
                            const compatibility = mapping
                                ? getMappingCompatibility(mapping.sourceOutput, mapping.targetInput)
                                : { compatible: true };

                            return (
                                <g key={pos.key} onClick={() => {
                                    if (mapping) handleLineClick(mapping);
                                }}>
                                    <line
                                        x1={pos.x1}
                                        y1={pos.y1}
                                        x2={pos.x2}
                                        y2={pos.y2}
                                        className={`connection-line ${!compatibility.compatible ? 'warning-line' : ''}`}
                                    />
                                    <line
                                        x1={pos.x1}
                                        y1={pos.y1}
                                        x2={pos.x2}
                                        y2={pos.y2}
                                        className="connection-line-hitarea"
                                    />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Inputs Column */}
                    <div className="io-column inputs-column">
                        <div className="column-header">
                            Inputs ({targetNode.label})
                            {targetIO.isGeneric && <span className="generic-badge">generic</span>}
                        </div>
                        {targetIO.inputs.map(input => {
                            // Check if this input is mapped from an incompatible output
                            const mapping = mappings.find(m => m.targetInput === input.name);
                            const compatibility = mapping
                                ? getMappingCompatibility(mapping.sourceOutput, input.name)
                                : { compatible: true };

                            // Also check if currently selected output would be incompatible
                            const selectedCompatibility = selectedOutput
                                ? getMappingCompatibility(selectedOutput, input.name)
                                : { compatible: true };

                            return (
                                <div
                                    key={input.name}
                                    ref={el => inputRefs.current[input.name] = el}
                                    className={`io-item input-item ${
                                        isInputMapped(input.name) ? 'mapped' : ''
                                    } ${selectedOutput ? 'clickable' : ''} ${
                                        !compatibility.compatible ? 'mismatch-warning' : ''
                                    } ${selectedOutput && !selectedCompatibility.compatible ? 'mismatch-warning-preview' : ''}`}
                                    onClick={() => handleInputClick(input.name)}
                                    title={!selectedCompatibility.compatible ? selectedCompatibility.reason : ''}
                                >
                                    <div className="io-item-main">
                                        <span className="io-name">{input.label}</span>
                                        <span className="io-type">{input.type}</span>
                                        {!compatibility.compatible && <span className="warning-icon" title={compatibility.reason}>⚠️</span>}
                                    </div>
                                    {input.acceptedExtensions?.length > 0 && (
                                        <span className="io-extensions" title={input.acceptedExtensions.join(', ')}>
                                            {input.acceptedExtensions.join(', ')}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mapping-instructions">
                    Click an output, then click an input to create a connection.
                    Click on a line to remove it.
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleCancel}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleSave}>
                    Save
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default EdgeMappingModal;
