/**
 * Workflow serialization and diff utilities.
 * Moved from main.jsx and extended with structured diff computation.
 */

/**
 * Serialize workspace nodes for saving as a custom workflow.
 * Strips non-serializable data (callbacks) and normalizes shape.
 */
export function serializeNodes(nodes) {
    return nodes.map(n => ({
        id: n.id,
        label: n.data?.label || n.label || '',
        isDummy: n.data?.isDummy || n.isDummy || false,
        isBIDS: n.data?.isBIDS || false,
        bidsStructure: n.data?.bidsStructure || null,
        bidsSelections: n.data?.bidsSelections || null,
        notes: n.data?.notes || '',
        parameters: n.data?.parameters || {},
        dockerVersion: n.data?.dockerVersion || 'latest',
        scatterInputs: n.data?.scatterInputs,
        scatterMethod: n.data?.scatterMethod || n.scatterMethod,
        linkMergeOverrides: n.data?.linkMergeOverrides || {},
        whenExpression: n.data?.whenExpression || '',
        expressions: n.data?.expressions || {},
        position: n.position || { x: 0, y: 0 }
    }));
}

export function serializeEdges(edges) {
    return edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: { mappings: e.data?.mappings || [] }
    }));
}

/**
 * Compare workspace content against a saved custom workflow (ignoring node positions).
 * Returns true if there are differences (unsaved changes).
 */
export function hasUnsavedChanges(workspace, savedWorkflow) {
    if (!workspace || !savedWorkflow) return false;

    if ((workspace.workflowName || '') !== (savedWorkflow.name || '')) return true;
    if ((workspace.name || '') !== (savedWorkflow.outputName || '')) return true;

    const wsNodes = serializeNodes(workspace.nodes || []).map(({ position, ...rest }) => rest);
    const savedNodes = savedWorkflow.nodes.map(({ position, ...rest }) => rest);

    const wsEdges = serializeEdges(workspace.edges || []);
    const savedEdges = serializeEdges(savedWorkflow.edges || []);

    return JSON.stringify(wsNodes) !== JSON.stringify(savedNodes) ||
           JSON.stringify(wsEdges) !== JSON.stringify(savedEdges);
}

/* ── Diff helpers ─────────────────────────────────────────────── */

const DISPLAY_NAMES = {
    dockerVersion: 'Docker Version',
    scatterInputs: 'Scatter',
    scatterMethod: 'Scatter Method',
    linkMergeOverrides: 'Multiple Input',
    whenExpression: 'When Expression',
    expressions: 'Expressions',
    parameters: 'Parameters',
    notes: 'Notes',
    label: 'Label',
    isDummy: 'I/O Node',
    isBIDS: 'BIDS Node',
    bidsStructure: 'BIDS Structure',
    bidsSelections: 'BIDS Selections',
};

/** Properties compared per-node, by node type. */
const IO_NODE_PROPS = ['label', 'notes'];
const BIDS_NODE_PROPS = ['label', 'notes', 'bidsSelections'];
const OPERATIONAL_NODE_PROPS = [
    'label', 'parameters', 'dockerVersion', 'whenExpression', 'expressions',
    'scatterInputs', 'scatterMethod', 'linkMergeOverrides', 'notes',
];

function getCompareProps(node) {
    if (node.isBIDS) return BIDS_NODE_PROPS;
    if (node.isDummy) return IO_NODE_PROPS;
    return OPERATIONAL_NODE_PROPS;
}

/** Properties that are key-value objects and should get sub-property drilling. */
const OBJECT_PROPS = new Set(['parameters', 'expressions', 'linkMergeOverrides', 'bidsSelections']);

function valuesEqual(a, b) {
    if (a === b) return true;
    if (a == null && b == null) return true;
    return JSON.stringify(a) === JSON.stringify(b);
}

function formatValue(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

/**
 * Compute sub-property diffs for key-value objects (parameters, expressions, etc.).
 */
function diffObject(saved, current) {
    const savedObj = saved && typeof saved === 'object' ? saved : {};
    const currentObj = current && typeof current === 'object' ? current : {};
    const allKeys = new Set([...Object.keys(savedObj), ...Object.keys(currentObj)]);
    const subChanges = [];

    for (const key of allKeys) {
        const sVal = savedObj[key];
        const cVal = currentObj[key];
        if (!valuesEqual(sVal, cVal)) {
            subChanges.push({
                key,
                saved: formatValue(sVal),
                current: formatValue(cVal),
                type: sVal === undefined ? 'added' : cVal === undefined ? 'removed' : 'modified',
            });
        }
    }
    return subChanges;
}

/**
 * Compute per-property diffs between two serialized nodes.
 */
function diffNode(savedNode, currentNode) {
    const compareProps = getCompareProps(currentNode);
    const changes = [];
    for (const prop of compareProps) {
        const sVal = savedNode[prop];
        const cVal = currentNode[prop];
        if (!valuesEqual(sVal, cVal)) {
            const change = {
                property: prop,
                displayName: DISPLAY_NAMES[prop] || prop,
                saved: formatValue(sVal),
                current: formatValue(cVal),
            };
            if (OBJECT_PROPS.has(prop)) {
                change.subChanges = diffObject(sVal, cVal);
            }
            changes.push(change);
        }
    }
    return changes;
}

/**
 * Compute structured diff between a saved workflow and the current workspace.
 *
 * @param {Object} savedWorkflow - The saved custom workflow { name, outputName, nodes, edges, ... }
 * @param {Object} currentWorkspace - The current workspace { workflowName, name, nodes, edges, ... }
 * @returns {Object} Structured diff object
 */
export function computeWorkflowDiff(savedWorkflow, currentWorkspace) {
    const result = {
        metadata: [],
        nodes: { added: [], removed: [], modified: [] },
        edges: { added: [], removed: [], modified: [] },
        hasDifferences: false,
    };

    // ── Metadata ────────────────────────────────────────────────
    const savedName = savedWorkflow.name || '';
    const currentName = currentWorkspace.workflowName || '';
    if (savedName !== currentName) {
        result.metadata.push({ field: 'Workflow Name', saved: savedName, current: currentName });
    }

    const savedOutput = savedWorkflow.outputName || '';
    const currentOutput = currentWorkspace.name || '';
    if (savedOutput !== currentOutput) {
        result.metadata.push({ field: 'Output Name', saved: savedOutput, current: currentOutput });
    }

    // ── Nodes ───────────────────────────────────────────────────
    const wsNodes = serializeNodes(currentWorkspace.nodes || []);
    const savedNodes = savedWorkflow.nodes || [];

    // Strip position for comparison
    const wsNodesClean = wsNodes.map(({ position, ...rest }) => rest);
    const savedNodesClean = savedNodes.map(({ position, ...rest }) => rest);

    const savedNodeMap = new Map(savedNodesClean.map(n => [n.id, n]));
    const currentNodeMap = new Map(wsNodesClean.map(n => [n.id, n]));

    // Build label lookup for edge display (combine both sets)
    const nodeLabelMap = new Map();
    for (const n of savedNodesClean) nodeLabelMap.set(n.id, n.label);
    for (const n of wsNodesClean) nodeLabelMap.set(n.id, n.label);

    for (const [id, node] of currentNodeMap) {
        if (!savedNodeMap.has(id)) {
            result.nodes.added.push(node);
        } else {
            const changes = diffNode(savedNodeMap.get(id), node);
            if (changes.length > 0) {
                result.nodes.modified.push({
                    id,
                    label: node.label,
                    savedLabel: savedNodeMap.get(id).label,
                    isDummy: node.isDummy,
                    isBIDS: node.isBIDS,
                    changes,
                });
            }
        }
    }

    for (const [id, node] of savedNodeMap) {
        if (!currentNodeMap.has(id)) {
            result.nodes.removed.push(node);
        }
    }

    // ── Edges ───────────────────────────────────────────────────
    const wsEdges = serializeEdges(currentWorkspace.edges || []);
    const savedEdges = serializeEdges(savedWorkflow.edges || []);

    const savedEdgeMap = new Map(savedEdges.map(e => [e.id, e]));
    const currentEdgeMap = new Map(wsEdges.map(e => [e.id, e]));

    for (const [id, edge] of currentEdgeMap) {
        const enriched = {
            ...edge,
            sourceLabel: nodeLabelMap.get(edge.source) || edge.source,
            targetLabel: nodeLabelMap.get(edge.target) || edge.target,
        };
        if (!savedEdgeMap.has(id)) {
            result.edges.added.push(enriched);
        } else {
            const savedEdge = savedEdgeMap.get(id);
            const changes = [];
            if (edge.source !== savedEdge.source) {
                changes.push({ property: 'source', saved: savedEdge.source, current: edge.source });
            }
            if (edge.target !== savedEdge.target) {
                changes.push({ property: 'target', saved: savedEdge.target, current: edge.target });
            }
            if (!valuesEqual(edge.data?.mappings, savedEdge.data?.mappings)) {
                changes.push({
                    property: 'mappings',
                    saved: savedEdge.data?.mappings || [],
                    current: edge.data?.mappings || [],
                });
            }
            if (changes.length > 0) {
                result.edges.modified.push({ ...enriched, changes });
            }
        }
    }

    for (const [id, edge] of savedEdgeMap) {
        if (!currentEdgeMap.has(id)) {
            result.edges.removed.push({
                ...edge,
                sourceLabel: nodeLabelMap.get(edge.source) || edge.source,
                targetLabel: nodeLabelMap.get(edge.target) || edge.target,
            });
        }
    }

    // ── Summary ─────────────────────────────────────────────────
    result.hasDifferences =
        result.metadata.length > 0 ||
        result.nodes.added.length > 0 ||
        result.nodes.removed.length > 0 ||
        result.nodes.modified.length > 0 ||
        result.edges.added.length > 0 ||
        result.edges.removed.length > 0 ||
        result.edges.modified.length > 0;

    return result;
}
