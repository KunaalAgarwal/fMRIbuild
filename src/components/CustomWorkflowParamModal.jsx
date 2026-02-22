import { useState, useMemo, useEffect, useRef } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { getToolConfigSync } from '../utils/toolRegistry.js';
import { DOCKER_IMAGES, DOCKER_TAGS } from '../utils/toolAnnotations.js';
import { EXPRESSION_TEMPLATES } from '../utils/expressionTemplates.js';
import TagDropdown from './TagDropdown.jsx';
import '../styles/workflowItem.css';

const VALID_OPERATORS = ['==', '!=', '>=', '<=', '>', '<'];

const LIBRARY_MAP = {
    fsl: 'FSL', afni: 'AFNI', ants: 'ANTs', freesurfer: 'FreeSurfer',
    mrtrix3: 'MRtrix3', fmriprep: 'fMRIPrep', mriqc: 'MRIQC',
    connectome_workbench: 'Connectome Workbench', amico: 'AMICO'
};

const IMAGE_TO_LIBRARY = new Map(
    Object.entries(DOCKER_IMAGES).map(([key, img]) => [img, LIBRARY_MAP[key]])
);

const getLibraryFromDockerImage = (dockerImage) => {
    const baseImage = dockerImage.split(':')[0];
    return IMAGE_TO_LIBRARY.get(baseImage) || null;
};

const CustomWorkflowParamModal = ({ show, onClose, workflowName, internalNodes, internalEdges, wiredInputs }) => {
    const nonDummyNodes = useMemo(
        () => (internalNodes || []).filter(n => !n.isDummy),
        [internalNodes]
    );

    // Compute topological order for scatter propagation
    const { firstNodeIndex, downstreamIndices } = useMemo(() => {
        if (nonDummyNodes.length === 0) return { firstNodeIndex: 0, downstreamIndices: [] };

        const nodeIds = new Set(nonDummyNodes.map(n => n.id));
        const dummyIds = new Set((internalNodes || []).filter(n => n.isDummy).map(n => n.id));
        const realEdges = (internalEdges || []).filter(
            e => !dummyIds.has(e.source) && !dummyIds.has(e.target) && nodeIds.has(e.source) && nodeIds.has(e.target)
        );

        // Kahn's topo sort
        const incoming = Object.fromEntries(nonDummyNodes.map(n => [n.id, 0]));
        const outgoing = new Map(nonDummyNodes.map(n => [n.id, []]));
        realEdges.forEach(e => {
            if (incoming[e.target] !== undefined) incoming[e.target]++;
            outgoing.get(e.source)?.push(e.target);
        });

        const queue = nonDummyNodes.filter(n => incoming[n.id] === 0).map(n => n.id);
        const order = [];
        let head = 0;
        while (head < queue.length) {
            const id = queue[head++];
            order.push(id);
            for (const t of (outgoing.get(id) || [])) {
                if (--incoming[t] === 0) queue.push(t);
            }
        }

        // Map topo order IDs back to nonDummyNodes indices
        const idToIndex = new Map(nonDummyNodes.map((n, i) => [n.id, i]));
        const topoIndices = order.map(id => idToIndex.get(id)).filter(i => i !== undefined);
        const first = topoIndices.length > 0 ? topoIndices[0] : 0;
        const downstream = topoIndices.slice(1);

        return { firstNodeIndex: first, downstreamIndices: downstream };
    }, [nonDummyNodes, internalEdges, internalNodes]);

    const [currentIndex, setCurrentIndex] = useState(0);

    // Per-node state for the currently viewed node
    const [paramValues, setParamValues] = useState({});
    const [dockerVersion, setDockerVersion] = useState('latest');
    const [versionValid, setVersionValid] = useState(true);
    const [versionWarning, setVersionWarning] = useState('');
    const [scatterEnabled, setScatterEnabled] = useState(false);
    const [whenParam, setWhenParam] = useState('');
    const [whenCondition, setWhenCondition] = useState('');
    const [whenTouched, setWhenTouched] = useState(false);
    const [expressionValues, setExpressionValues] = useState({});
    const [expressionToggles, setExpressionToggles] = useState({});
    const [linkMergeValues, setLinkMergeValues] = useState({});

    // Deep clone of internal nodes to track edits
    const [editedNodes, setEditedNodes] = useState([]);
    const editedNodesRef = useRef([]);

    // Load a node's data into all form state variables
    const loadNodeState = (node) => {
        if (!node) return;

        const existing = node.parameters;
        if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
            setParamValues({ ...existing });
        } else if (typeof existing === 'string' && existing.trim()) {
            try { setParamValues(JSON.parse(existing)); } catch { setParamValues({}); }
        } else {
            setParamValues({});
        }

        setDockerVersion(node.dockerVersion || 'latest');
        setVersionValid(true);
        setVersionWarning('');
        setScatterEnabled(node.scatterEnabled || false);
        setLinkMergeValues(node.linkMergeOverrides || {});

        const whenExpr = node.whenExpression || '';
        const whenMatch = whenExpr.match(/^\$\(inputs\.(\w+)\s+(.*)\)$/);
        if (whenMatch) {
            setWhenParam(whenMatch[1]);
            setWhenCondition(whenMatch[2]);
        } else {
            setWhenParam('');
            setWhenCondition('');
        }
        setWhenTouched(false);

        const savedExpressions = node.expressions || {};
        const displayExpressions = {};
        const toggles = {};
        Object.entries(savedExpressions).forEach(([k, v]) => {
            if (v) {
                const match = v.match(/^\$\((.*)\)$/s);
                displayExpressions[k] = match ? match[1] : v;
                toggles[k] = true;
            }
        });
        setExpressionValues(displayExpressions);
        setExpressionToggles(toggles);
    };

    // Initialize edited nodes and load first node state when modal opens
    useEffect(() => {
        if (show) {
            const freshNodes = structuredClone(nonDummyNodes);
            setEditedNodes(freshNodes);
            editedNodesRef.current = freshNodes;
            setCurrentIndex(0);
            loadNodeState(freshNodes[0]);
        }
    }, [show]);

    // Load node state when navigating between nodes (index changes only)
    useEffect(() => {
        if (!show) return;
        const node = editedNodesRef.current[currentIndex];
        if (node) loadNodeState(node);
    }, [currentIndex]);

    // Save current node's state back to editedNodes before navigating
    const saveCurrentNodeState = () => {
        const current = editedNodesRef.current;
        if (current.length === 0) return current;

        const finalDockerVersion = dockerVersion.trim() || 'latest';
        const cleanedExpressions = {};
        Object.entries(expressionValues).forEach(([k, v]) => {
            if (v && v.trim()) {
                const trimmed = v.trim();
                cleanedExpressions[k] = trimmed.startsWith('$(') ? trimmed : `$(${trimmed})`;
            }
        });

        const whenExpression = whenParam && whenCondition.trim() && !whenWarning
            ? `$(inputs.${whenParam} ${whenCondition.trim()})`
            : '';

        const updated = [...current];
        updated[currentIndex] = {
            ...updated[currentIndex],
            parameters: paramValues,
            dockerVersion: finalDockerVersion,
            scatterEnabled,
            linkMergeOverrides: linkMergeValues,
            whenExpression,
            expressions: cleanedExpressions,
        };

        // Propagate scatter from first node to all downstream nodes
        if (currentIndex === firstNodeIndex) {
            const firstScatter = updated[firstNodeIndex].scatterEnabled;
            for (const idx of downstreamIndices) {
                updated[idx] = { ...updated[idx], scatterEnabled: firstScatter };
            }
        }

        editedNodesRef.current = updated;
        return updated;
    };

    const navigateTo = (newIndex) => {
        const updated = saveCurrentNodeState();
        setEditedNodes(updated);
        setCurrentIndex(newIndex);
    };

    const handleClose = () => {
        const finalNodes = saveCurrentNodeState();
        // Map back to original internal nodes (including dummy nodes)
        const allUpdated = (internalNodes || []).map(origNode => {
            if (origNode.isDummy) return origNode;
            const edited = finalNodes.find(e => e.id === origNode.id);
            return edited || origNode;
        });
        onClose(allUpdated);
    };

    // Get tool definition for current node
    const currentNode = editedNodes[currentIndex];

    // Filter wired inputs to the current internal node
    const currentNodeWiredInputs = useMemo(() => {
        if (!wiredInputs || !currentNode) return new Map();
        const prefix = `${currentNode.id}/`;
        const filtered = new Map();
        for (const [key, sources] of wiredInputs.entries()) {
            if (key.startsWith(prefix)) filtered.set(key.slice(prefix.length), sources);
        }
        return filtered;
    }, [wiredInputs, currentNode?.id]);

    const tool = currentNode ? getToolConfigSync(currentNode.label) : null;
    const dockerImage = tool?.dockerImage || null;

    const allParams = useMemo(() => {
        if (!tool) return { required: [], optional: [] };
        const required = Object.entries(tool.requiredInputs || {})
            .filter(([_, def]) => def.type !== 'record')
            .map(([name, def]) => ({ name, ...def }));
        const optional = Object.entries(tool.optionalInputs || {})
            .filter(([_, def]) => def.type !== 'record')
            .map(([name, def]) => ({ name, ...def }));
        return { required, optional };
    }, [tool]);

    // Validate conditional (when) expression
    const whenWarning = useMemo(() => {
        if (!whenParam) return null;
        const cond = whenCondition.trim();
        if (!cond) return whenTouched ? 'Enter a condition (e.g., == true)' : null;
        const hasOperator = VALID_OPERATORS.some(op => cond.startsWith(op));
        if (!hasOperator) return `Condition should start with an operator: ${VALID_OPERATORS.join(', ')}`;
        const afterOp = cond.replace(/^(==|!=|>=|<=|>|<)\s*/, '');
        if (!afterOp) return 'Missing value after operator';
        return null;
    }, [whenParam, whenCondition, whenTouched]);

    const expressionWarnings = useMemo(() => {
        const warnings = {};
        Object.entries(expressionValues).forEach(([name, expr]) => {
            if (!expr?.trim()) return;
            const trimmed = expr.trim();
            const opens = (trimmed.match(/\(/g) || []).length;
            const closes = (trimmed.match(/\)/g) || []).length;
            if (opens !== closes) warnings[name] = 'Unmatched parentheses';
        });
        return warnings;
    }, [expressionValues]);

    const library = dockerImage ? getLibraryFromDockerImage(dockerImage) : null;
    const knownTags = library ? (DOCKER_TAGS[library] || ['latest']) : ['latest'];

    const validateDockerVersion = (version) => {
        const trimmed = version.trim();
        if (!trimmed || trimmed === 'latest') {
            setVersionValid(true);
            setVersionWarning('');
            return;
        }
        if (knownTags.includes(trimmed)) {
            setVersionValid(true);
            setVersionWarning('');
        } else {
            setVersionValid(false);
            const displayTags = knownTags.length > 4
                ? `${knownTags.slice(0, 4).join(', ')}...`
                : knownTags.join(', ');
            setVersionWarning(`Unknown tag. Known: ${displayTags}`);
        }
    };

    const updateParam = (name, value) => {
        setParamValues(prev => ({ ...prev, [name]: value }));
    };

    const clampToBounds = (name, param) => {
        const val = paramValues[name];
        if (val === null || val === undefined || !param.bounds) return;
        const [min, max] = param.bounds;
        if (val < min) updateParam(name, min);
        else if (val > max) updateParam(name, max);
    };

    const updateLinkMerge = (inputName, value) => {
        setLinkMergeValues(prev => ({ ...prev, [inputName]: value }));
    };

    const handleToggleFx = (paramName) => {
        setExpressionToggles(prev => {
            const wasActive = prev[paramName];
            if (wasActive) {
                setExpressionValues(prevExpr => {
                    const next = { ...prevExpr };
                    delete next[paramName];
                    return next;
                });
            }
            return { ...prev, [paramName]: !wasActive };
        });
    };

    const renderParamControl = (param) => {
        const isFileType = param.type === 'File' || param.type === 'Directory';

        if (isFileType) {
            return (
                <div className="param-control">
                    <span
                        className={`expression-toggle${expressionToggles[param.name] ? ' active' : ''}`}
                        onClick={() => handleToggleFx(param.name)}
                        title={expressionToggles[param.name] ? 'Switch to value mode' : 'Switch to expression mode'}
                    >fx</span>
                </div>
            );
        }

        const isExpressionMode = expressionToggles[param.name] || false;

        if (isExpressionMode) {
            return (
                <div className="param-control">
                    <span className="expression-toggle active" onClick={() => handleToggleFx(param.name)} title="Switch to value mode">fx</span>
                </div>
            );
        }

        const control = param.type === 'boolean' ? (
            <Form.Check
                type="switch"
                id={`cwp-param-${currentNode?.id}-${param.name}`}
                checked={paramValues[param.name] === true}
                onChange={(e) => updateParam(param.name, e.target.checked)}
                className="param-switch"
            />
        ) : param.options ? (
            <Form.Select
                size="sm"
                className={`param-select${paramValues[param.name] != null && paramValues[param.name] !== '' ? ' filled' : ''}`}
                value={paramValues[param.name] ?? ''}
                onChange={(e) => updateParam(param.name, e.target.value || null)}
            >
                <option value="">-- default --</option>
                {param.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </Form.Select>
        ) : (param.type === 'int' || param.type === 'double' || param.type === 'float' || param.type === 'long') ? (
            <Form.Control
                type="number"
                size="sm"
                className={`param-number${paramValues[param.name] != null && paramValues[param.name] !== '' ? ' filled' : ''}`}
                step={param.type === 'int' || param.type === 'long' ? 1 : 0.01}
                min={param.bounds ? param.bounds[0] : undefined}
                max={param.bounds ? param.bounds[1] : undefined}
                placeholder={param.bounds ? `${param.bounds[0]}..${param.bounds[1]}` : ''}
                value={paramValues[param.name] ?? ''}
                onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                        updateParam(param.name, null);
                    } else {
                        updateParam(param.name, param.type === 'int' || param.type === 'long' ? parseInt(val, 10) : parseFloat(val));
                    }
                }}
                onBlur={() => clampToBounds(param.name, param)}
            />
        ) : (
            <Form.Control
                type="text"
                size="sm"
                className={`param-text${paramValues[param.name] != null && paramValues[param.name] !== '' ? ' filled' : ''}`}
                value={paramValues[param.name] ?? ''}
                onChange={(e) => updateParam(param.name, e.target.value || null)}
            />
        );

        return (
            <div className="param-control">
                <div className="expression-row">
                    <span className="expression-toggle" onClick={() => handleToggleFx(param.name)} title="Switch to expression mode">fx</span>
                    {control}
                </div>
            </div>
        );
    };

    if (!currentNode) return null;

    return (
        <Modal
            show={show}
            onHide={handleClose}
            centered
            className="custom-modal"
            size="lg"
        >
            <Modal.Header>
                <Modal.Title style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '1rem', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{workflowName} - Parameters</span>
                    </div>
                    <div className="custom-workflow-nav">
                        <Button
                            variant="outline-light"
                            size="sm"
                            disabled={currentIndex === 0}
                            onClick={() => navigateTo(currentIndex - 1)}
                            className="custom-workflow-nav-btn"
                        >
                            &larr;
                        </Button>
                        <span className="custom-workflow-nav-label">
                            {currentNode.label} ({currentIndex + 1} of {nonDummyNodes.length})
                        </span>
                        <Button
                            variant="outline-light"
                            size="sm"
                            disabled={currentIndex === nonDummyNodes.length - 1}
                            onClick={() => navigateTo(currentIndex + 1)}
                            className="custom-workflow-nav-btn"
                        >
                            &rarr;
                        </Button>
                    </div>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body onClick={(e) => e.stopPropagation()}>
                <Form>
                    {/* Docker Version Input */}
                    {dockerImage && (
                        <Form.Group className="docker-version-group">
                            <Form.Label className="modal-label">Docker Image</Form.Label>
                            <TagDropdown
                                value={dockerVersion}
                                onChange={setDockerVersion}
                                onBlur={() => validateDockerVersion(dockerVersion)}
                                tags={knownTags}
                                placeholder="latest"
                                isValid={versionValid}
                                prefix={`${dockerImage}:`}
                            />
                            {versionWarning && (
                                <div className="docker-warning-text">{versionWarning}</div>
                            )}
                            <div className="docker-help-text">Select a tag or enter a custom version</div>
                        </Form.Group>
                    )}

                    {/* Scatter Toggle */}
                    <Form.Group className="scatter-toggle-group">
                        <div className="scatter-toggle-row">
                            <Form.Label className="modal-label" style={{ marginBottom: 0 }}>
                                Scatter (Batch Processing)
                            </Form.Label>
                            <Form.Check
                                type="switch"
                                id={`cwp-scatter-${currentNode.id}`}
                                checked={scatterEnabled}
                                onChange={(e) => setScatterEnabled(e.target.checked)}
                                className="scatter-switch"
                                disabled={currentIndex !== firstNodeIndex}
                            />
                        </div>
                        {currentIndex === firstNodeIndex ? (
                            <div className="scatter-help-text">Enabling scatter propagates to all downstream nodes</div>
                        ) : (
                            <div className="scatter-help-text">
                                Inherited from first node ({nonDummyNodes[firstNodeIndex]?.label || 'root'})
                            </div>
                        )}
                    </Form.Group>

                    {/* Conditional Expression Builder */}
                    <Form.Group className="when-expression-group">
                        <Form.Label className="modal-label" style={{ marginBottom: 6 }}>
                            Conditional (when)
                        </Form.Label>
                        <div className="when-builder-row">
                            <Form.Select
                                size="sm"
                                className="when-param-select"
                                value={whenParam}
                                onChange={(e) => { setWhenParam(e.target.value); if (!e.target.value) setWhenCondition(''); }}
                            >
                                <option value="">None</option>
                                {[...allParams.required, ...allParams.optional].map(p => (
                                    <option key={p.name} value={p.name}>{p.name}</option>
                                ))}
                            </Form.Select>
                            {whenParam && (
                                <Form.Control
                                    type="text"
                                    size="sm"
                                    className={`when-condition-input${whenCondition.trim() ? ' filled' : ''}${whenWarning ? ' invalid' : ''}`}
                                    placeholder="== true"
                                    value={whenCondition}
                                    onChange={(e) => { setWhenCondition(e.target.value); setWhenTouched(true); }}
                                    onBlur={() => setWhenTouched(true)}
                                />
                            )}
                        </div>
                        {whenParam && whenCondition.trim() && !whenWarning && (
                            <div className="when-preview">
                                $(inputs.{whenParam} {whenCondition.trim()})
                            </div>
                        )}
                        {whenWarning && (
                            <div className="when-warning-text">{whenWarning}</div>
                        )}
                    </Form.Group>

                    {/* Parameters */}
                    <div className="params-scroll">
                        {[
                            { params: allParams.required, label: 'Required' },
                            { params: allParams.optional, label: 'Optional' },
                        ].map(({ params: sectionParams, label: sectionLabel }) =>
                            sectionParams.length > 0 && (
                                <div key={sectionLabel} className="param-section">
                                    <div className="param-section-header">{sectionLabel}</div>
                                    {sectionParams.map((param) => {
                                        const isFileType = param.type === 'File' || param.type === 'Directory';
                                        const wiredSources = currentNodeWiredInputs.get(param.name) || [];
                                        return (
                                            <div key={param.name} className={`param-card ${isFileType && wiredSources.length > 0 ? 'input-wired' : ''} ${expressionValues[param.name] ? 'has-expression' : ''}`}>
                                                <div className="param-card-header">
                                                    <span className="param-name">{param.name}</span>
                                                    <span className="param-type-badge">{param.type}</span>
                                                    {renderParamControl(param)}
                                                </div>
                                                {isFileType && wiredSources.length === 1 && (
                                                    <div className="input-source-single">
                                                        <span className="input-source">
                                                            from {wiredSources[0].sourceNodeLabel} / {wiredSources[0].sourceOutput}
                                                        </span>
                                                    </div>
                                                )}
                                                {isFileType && wiredSources.length > 1 && (
                                                    <div className="input-source-multi-details">
                                                        <div className="input-source-multi-row">
                                                            <div className="input-source-multi-sources">
                                                                {wiredSources.map((src, i) => (
                                                                    <span key={i} className="input-source input-source-detail">
                                                                        {src.sourceNodeLabel} / {src.sourceOutput}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <Form.Select
                                                                size="sm"
                                                                className="link-merge-select"
                                                                value={linkMergeValues[param.name] || 'merge_flattened'}
                                                                onChange={(e) => updateLinkMerge(param.name, e.target.value)}
                                                            >
                                                                <option value="merge_flattened">merge_flattened</option>
                                                                <option value="merge_nested">merge_nested</option>
                                                            </Form.Select>
                                                        </div>
                                                        <div className="merge-help-text">
                                                            flattened combines all into one list [x1, x2] — nested preserves grouping per source [[x1], [x2]]
                                                        </div>
                                                    </div>
                                                )}
                                                {isFileType && expressionToggles[param.name] && (() => {
                                                    const exprVal = expressionValues[param.name] || '';
                                                    const exprWarning = expressionWarnings[param.name];
                                                    const fileTemplates = EXPRESSION_TEMPLATES.filter(t => t.applicableTypes.includes(param.type));
                                                    return (
                                                        <div className="expression-file-details">
                                                            <div className="expression-input-row">
                                                                <Form.Control type="text" size="sm"
                                                                    className={`expression-input${exprVal ? ' filled' : ''}${exprWarning ? ' invalid' : ''}`}
                                                                    placeholder="self.nameroot"
                                                                    value={exprVal}
                                                                    onChange={(e) => setExpressionValues(prev => ({ ...prev, [param.name]: e.target.value }))}
                                                                />
                                                                {fileTemplates.length > 0 && (
                                                                    <Form.Select size="sm" className="expression-template-select"
                                                                        value={fileTemplates.find(t => t.expression === exprVal)?.expression || ''}
                                                                        onChange={(e) => { if (e.target.value) setExpressionValues(prev => ({ ...prev, [param.name]: e.target.value })); }}>
                                                                        <option value="">Templates</option>
                                                                        {fileTemplates.map(t => (
                                                                            <option key={t.label} value={t.expression} title={t.description}>{t.label}</option>
                                                                        ))}
                                                                    </Form.Select>
                                                                )}
                                                            </div>
                                                            {exprVal.trim() && !exprWarning && (
                                                                <div className="expression-preview">valueFrom: $({exprVal.trim()})</div>
                                                            )}
                                                            {exprWarning && (
                                                                <div className="expression-warning-text">{exprWarning}</div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                                {!isFileType && expressionToggles[param.name] && (() => {
                                                    const exprVal = expressionValues[param.name] || '';
                                                    const exprWarning = expressionWarnings[param.name];
                                                    const applicableTemplates = EXPRESSION_TEMPLATES.filter(
                                                        t => t.applicableTypes.includes(param.type)
                                                    );
                                                    return (
                                                        <div className="expression-scalar-details">
                                                            <div className="expression-input-row">
                                                                <Form.Control type="text" size="sm"
                                                                    className={`expression-input${exprVal ? ' filled' : ''}${exprWarning ? ' invalid' : ''}`}
                                                                    placeholder={param.type === 'string' ? 'self.toUpperCase()' : 'self + 1'}
                                                                    value={exprVal}
                                                                    onChange={(e) => setExpressionValues(prev => ({ ...prev, [param.name]: e.target.value }))}
                                                                />
                                                                {applicableTemplates.length > 0 && (
                                                                    <Form.Select size="sm" className="expression-template-select"
                                                                        value={applicableTemplates.find(t => t.expression === exprVal)?.expression || ''}
                                                                        onChange={(e) => { if (e.target.value) setExpressionValues(prev => ({ ...prev, [param.name]: e.target.value })); }}>
                                                                        <option value="">Templates</option>
                                                                        {applicableTemplates.map(t => (
                                                                            <option key={t.label} value={t.expression} title={t.description}>{t.label}</option>
                                                                        ))}
                                                                    </Form.Select>
                                                                )}
                                                            </div>
                                                            {exprVal.trim() && !exprWarning && (
                                                                <div className="expression-preview">valueFrom: $({exprVal.trim()})</div>
                                                            )}
                                                            {exprWarning && (
                                                                <div className="expression-warning-text">{exprWarning}</div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                                {param.label && (
                                                    <div className="param-description">{param.label}</div>
                                                )}
                                                {param.bounds && (
                                                    <div className="param-bounds">bounds: {param.bounds[0]} – {param.bounds[1]}</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}

                        {!tool && (
                            <div className="param-section">
                                <div className="param-section-header">Parameters</div>
                                <div className="param-description" style={{ padding: '8px 0' }}>
                                    Tool not fully defined — parameters unavailable.
                                </div>
                            </div>
                        )}
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default CustomWorkflowParamModal;
