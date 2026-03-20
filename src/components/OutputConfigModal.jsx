import { useState, useEffect, useMemo } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useNodes, useEdges } from 'reactflow';
import { getToolConfigSync } from '../utils/toolRegistry.js';
import '../styles/outputConfigModal.css';

/**
 * Traverse edges backwards from the Output node to find all upstream non-dummy nodes.
 * Uses BFS in reverse direction (following edges from target to source).
 */
function discoverUpstreamNodes(outputNodeId, allNodes, allEdges) {
    const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

    // Build reverse adjacency: target -> [source IDs]
    const reverseAdj = new Map();
    for (const edge of allEdges) {
        if (!reverseAdj.has(edge.target)) reverseAdj.set(edge.target, []);
        reverseAdj.get(edge.target).push(edge.source);
    }

    const visited = new Set();
    const upstreamNodes = [];
    const queue = [outputNodeId];
    visited.add(outputNodeId);

    while (queue.length > 0) {
        const currentId = queue.shift();
        const sourceIds = reverseAdj.get(currentId) || [];

        for (const sourceId of sourceIds) {
            if (visited.has(sourceId)) continue;
            visited.add(sourceId);

            const sourceNode = nodeMap.get(sourceId);
            if (!sourceNode) continue;

            // Collect non-dummy tool nodes
            if (!sourceNode.data?.isDummy) {
                upstreamNodes.push(sourceNode);
            }

            // Continue traversal through all nodes to reach further upstream
            queue.push(sourceId);
        }
    }

    return upstreamNodes;
}

/**
 * Get all outputs for a tool node from the tool registry.
 * Handles both regular tool nodes and custom workflow nodes.
 */
function getNodeOutputs(nodeData) {
    if (nodeData.isCustomWorkflow && nodeData.internalNodes) {
        const { internalNodes = [], internalEdges = [] } = nodeData;
        const nonDummyNodes = internalNodes.filter((n) => !n.isDummy);

        // Find intermediate outputs consumed by other internal nodes
        const consumedOutputs = new Set();
        for (const edge of internalEdges) {
            const srcNode = internalNodes.find((n) => n.id === edge.source);
            const tgtNode = internalNodes.find((n) => n.id === edge.target);
            if (srcNode && tgtNode && !srcNode.isDummy && !tgtNode.isDummy) {
                for (const m of edge.data?.mappings || []) {
                    consumedOutputs.add(`${edge.source}/${m.sourceOutput}`);
                }
            }
        }

        const outputs = [];
        nonDummyNodes.forEach((node) => {
            const tool = getToolConfigSync(node.label);
            if (!tool) return;
            Object.entries(tool.outputs).forEach(([name, def]) => {
                const namespacedName = `${node.id}/${name}`;
                if (consumedOutputs.has(namespacedName)) return;
                outputs.push({
                    name,
                    type: def.type || 'File',
                    label: def.label || name,
                    group: node.label,
                });
            });
        });
        return outputs;
    }

    // Regular tool node
    const tool = getToolConfigSync(nodeData.label);
    if (!tool) return [{ name: 'output', type: 'File', label: 'Output' }];

    return Object.entries(tool.outputs).map(([name, def]) => ({
        name,
        type: def.type || 'File',
        label: def.label || name,
    }));
}

const OutputConfigModal = ({ show, onHide, outputNodeId, outputNodeData, scatteredNodeIds, onSave }) => {
    const allNodes = useNodes();
    const allEdges = useEdges();
    const [selections, setSelections] = useState({});

    // Discover upstream nodes and their outputs
    const upstreamData = useMemo(() => {
        if (!show || !outputNodeId) return [];

        const upstreamNodes = discoverUpstreamNodes(outputNodeId, allNodes, allEdges);

        return upstreamNodes.map((node) => ({
            nodeId: node.id,
            label: node.data.displayLabel || node.data.label,
            isCustomWorkflow: node.data.isCustomWorkflow || false,
            isScattered: scatteredNodeIds?.has(node.id) || false,
            outputs: getNodeOutputs(node.data),
        }));
    }, [show, outputNodeId, allNodes, allEdges, scatteredNodeIds]);

    // Initialize selections when modal opens
    useEffect(() => {
        if (!show) return;

        const existingSelections = outputNodeData?.selectedOutputs;
        const newSelections = {};

        for (const group of upstreamData) {
            for (const output of group.outputs) {
                const key = `${group.nodeId}/${output.name}`;
                // Default to selected if no prior config, otherwise restore
                newSelections[key] = existingSelections ? existingSelections[key] !== false : true;
            }
        }

        setSelections(newSelections);
    }, [show, upstreamData, outputNodeData]);

    const handleToggle = (key) => {
        setSelections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSelectAll = () => {
        setSelections((prev) => {
            const all = {};
            for (const key of Object.keys(prev)) all[key] = true;
            return all;
        });
    };

    const handleSelectNone = () => {
        setSelections((prev) => {
            const none = {};
            for (const key of Object.keys(prev)) none[key] = false;
            return none;
        });
    };

    const selectedCount = Object.values(selections).filter(Boolean).length;
    const totalCount = Object.keys(selections).length;

    const handleSave = () => {
        onSave({
            selectedOutputs: selections,
        });
        onHide();
    };

    return (
        <Modal show={show} onHide={onHide} centered size="lg" className="output-config-modal">
            <Modal.Header closeButton closeVariant="white">
                <Modal.Title>Configure Workflow Outputs</Modal.Title>
            </Modal.Header>
            <Modal.Body onClick={(e) => e.stopPropagation()}>
                {upstreamData.length === 0 ? (
                    <div className="output-config-empty">
                        No upstream tool nodes found. Connect this Output node to your workflow.
                    </div>
                ) : (
                    <>
                        <div className="output-config-toolbar">
                            <span className="output-config-count">
                                {selectedCount} of {totalCount} output{totalCount !== 1 ? 's' : ''} selected
                            </span>
                            <div className="output-config-actions">
                                <Button variant="link" size="sm" onClick={handleSelectAll}>
                                    Select All
                                </Button>
                                <Button variant="link" size="sm" onClick={handleSelectNone}>
                                    Select None
                                </Button>
                            </div>
                        </div>

                        <div className="output-config-groups">
                            {upstreamData.map((group) => (
                                <div key={group.nodeId} className="output-config-group">
                                    <div className="output-config-group-header">
                                        {group.label}
                                        {group.isScattered && (
                                            <span className="output-config-scatter-badge">scattered</span>
                                        )}
                                        {group.isCustomWorkflow && (
                                            <span className="output-config-custom-badge">workflow</span>
                                        )}
                                    </div>
                                    {group.outputs.map((output) => {
                                        const key = `${group.nodeId}/${output.name}`;
                                        const isSelected = selections[key] || false;

                                        return (
                                            <div
                                                key={key}
                                                className={`output-config-item ${isSelected ? 'selected' : ''}`}
                                                onClick={() => handleToggle(key)}
                                            >
                                                <div className="io-item-main">
                                                    <span className="io-name">{output.label}</span>
                                                    <span className="io-type">{output.type}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={selectedCount === 0}>
                    Save ({selectedCount})
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default OutputConfigModal;
