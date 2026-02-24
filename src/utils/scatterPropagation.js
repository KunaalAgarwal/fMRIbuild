/**
 * Compute which nodes are scattered (either directly enabled or inherited from upstream).
 * Uses adjacency map for O(V+E) performance.
 * Gather-enabled nodes act as barriers: they ARE marked as scattered (they receive
 * scattered input) but do NOT propagate scatter to their downstream neighbours.
 *
 * @param {Array} nodes - Array of nodes with { id, data: { scatterEnabled, gatherEnabled } }
 * @param {Array} edges - Array of edges with { source, target }
 * @returns {{ scatteredNodeIds: Set<string>, sourceNodeIds: Set<string>, gatherNodeIds: Set<string> }}
 */
export function computeScatteredNodes(nodes, edges) {
    // Compute source node IDs (nodes with no incoming edges)
    const targetIds = new Set(edges.map(e => e.target));
    const sourceNodeIds = new Set(
        nodes.filter(n => !targetIds.has(n.id)).map(n => n.id)
    );

    // Build adjacency list (outgoing edges per node) for O(V+E) traversal
    const outgoing = new Map();
    for (const node of nodes) {
        outgoing.set(node.id, []);
    }
    for (const edge of edges) {
        outgoing.get(edge.source)?.push(edge.target);
    }

    // Collect gather-enabled node IDs (scatter propagation barriers)
    const gatherNodeIds = new Set(
        nodes.filter(n => n.data?.gatherEnabled).map(n => n.id)
    );

    // BFS from scatter-enabled nodes, propagating to all downstream.
    // Seeds: source nodes with scatterEnabled, OR custom workflow nodes with internal scatter.
    // Note: mid-pipeline nodes without scatter are NOT seeded here, but they will still be
    // added to scatteredNodeIds by the BFS traversal if an upstream node is scattered.
    const scatteredNodeIds = new Set();
    const queue = [];
    for (const node of nodes) {
        const isSource = sourceNodeIds.has(node.id);
        const hasTopLevelScatter = node.data?.scatterEnabled;
        const hasInternalScatter = node.data?.isCustomWorkflow &&
            node.data?.internalNodes?.some(n => n.scatterEnabled);

        if ((hasTopLevelScatter && isSource) || hasInternalScatter) {
            scatteredNodeIds.add(node.id);
            queue.push(node.id);
        }
    }

    while (queue.length) {
        const nodeId = queue.shift();
        for (const targetId of (outgoing.get(nodeId) || [])) {
            if (!scatteredNodeIds.has(targetId)) {
                scatteredNodeIds.add(targetId);
                // Gather nodes receive scattered input but do NOT propagate further
                if (!gatherNodeIds.has(targetId)) {
                    queue.push(targetId);
                }
            }
        }
    }

    return { scatteredNodeIds, sourceNodeIds, gatherNodeIds };
}
