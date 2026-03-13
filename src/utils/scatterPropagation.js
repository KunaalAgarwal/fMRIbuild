/**
 * Compute which nodes are scattered, which are gather nodes, and provide
 * per-node auto-suggest data.
 *
 * A node is scattered if:
 *   1. It has explicit scatterInputs (non-empty array), OR
 *   2. It has internal scatter (custom workflow nodes), OR
 *   3. It is any downstream node reachable from a scattered upstream node
 *      whose incoming edge mappings target scalar-typed inputs.
 *
 * A node is a gather node when ALL incoming edges from scattered sources
 * map exclusively to array-typed inputs (the array naturally consumes the
 * scattered output). Gather nodes are NOT under scatter, and scatter does
 * NOT propagate through them.
 *
 * @param {Array} nodes  - Array of nodes with { id, data: { scatterInputs? } }
 * @param {Array} edges  - Array of edges with { source, target, data?: { mappings? } }
 * @param {Map}   arrayTypedInputs - Map<nodeId, Set<inputName>> of inputs whose CWL type is already an array
 * @returns {{ scatteredNodeIds: Set, sourceNodeIds: Set, scatteredUpstreamInputs: Map, gatherNodeIds: Set }}
 */
export function computeScatteredNodes(nodes, edges, arrayTypedInputs = new Map()) {
    // Source nodes: nodes with no incoming edges
    const targetIds = new Set(edges.map(e => e.target));
    const sourceNodeIds = new Set(
        nodes.filter(n => !targetIds.has(n.id)).map(n => n.id)
    );

    // Build adjacency list (outgoing edges per node) for O(V+E) traversal
    const outgoing = new Map();
    for (const node of nodes) outgoing.set(node.id, []);
    for (const edge of edges) outgoing.get(edge.source)?.push(edge);

    // Collect BIDS node IDs for filtering bids_directory mappings
    const bidsNodeIds = new Set();

    // Phase 1: identify scatter sources
    // - Nodes with explicit scatterInputs
    // - Custom workflow nodes with internal scatter
    // - BIDS nodes with selections (they output File[] arrays)
    const scatteredNodeIds = new Set();
    for (const node of nodes) {
        if (node.data?.isBIDS) bidsNodeIds.add(node.id);

        if ((node.data?.scatterInputs?.length || 0) > 0) {
            scatteredNodeIds.add(node.id);
        } else if (node.data?.isCustomWorkflow &&
            node.data?.internalNodes?.some(n => (n.scatterInputs?.length || 0) > 0)) {
            scatteredNodeIds.add(node.id);
        } else if (node.data?.isBIDS && node.data?.bidsSelections) {
            scatteredNodeIds.add(node.id);
        }
    }

    // Phase 2: propagate scatter downstream with order-independent gather detection.
    // Pass 2a: BFS from scattered sources, collecting per-target edge classification
    //          without committing nodes to scatter or gather yet.
    // Pass 2b: Classify each target — ALL gather edges → gather; ANY scalar edge → scatter.
    const gatherNodeIds = new Set();

    // targetEdgeInfo: Map<targetId, { hasGatherEdge, hasScatterEdge }>
    const targetEdgeInfo = new Map();
    const queue = [...scatteredNodeIds];
    let head = 0;

    while (head < queue.length) {
        const nodeId = queue[head++];
        for (const edge of (outgoing.get(nodeId) || [])) {
            const targetId = edge.target;
            if (scatteredNodeIds.has(targetId)) continue;

            let mappings = edge.data?.mappings || [];
            const targetArrayInputs = arrayTypedInputs.get(targetId) || new Set();

            // Skip bids_directory mappings from BIDS nodes — they don't carry scatter
            if (bidsNodeIds.has(nodeId)) {
                mappings = mappings.filter(m => m.sourceOutput !== 'bids_directory');
                if (mappings.length === 0) continue;
            }

            const isGatherEdge = mappings.length > 0 &&
                mappings.every(m => targetArrayInputs.has(m.targetInput));

            if (!targetEdgeInfo.has(targetId)) {
                targetEdgeInfo.set(targetId, { hasGatherEdge: false, hasScatterEdge: false });
            }
            const info = targetEdgeInfo.get(targetId);
            if (isGatherEdge) {
                info.hasGatherEdge = true;
            } else {
                info.hasScatterEdge = true;
            }
        }

        // Pass 2b: after processing all outgoing edges from this node,
        // classify any targets that have ALL their incoming scattered edges resolved.
        // A target is resolved when no remaining queued scattered node feeds into it.
        for (const [targetId, info] of targetEdgeInfo) {
            if (scatteredNodeIds.has(targetId) || gatherNodeIds.has(targetId)) continue;
            if (info.hasScatterEdge) {
                // At least one scalar mapping — scatter propagates
                scatteredNodeIds.add(targetId);
                queue.push(targetId);
                targetEdgeInfo.delete(targetId);
            }
        }
    }

    // Remaining unresolved targets only had gather edges — confirm as gather nodes
    for (const [targetId, info] of targetEdgeInfo) {
        if (!scatteredNodeIds.has(targetId) && info.hasGatherEdge) {
            gatherNodeIds.add(targetId);
        }
    }

    // Per-node: which inputs come from scattered upstream (for UI auto-suggest).
    // Skip inputs that are array-typed (gather inputs) — those don't need scatter.
    // Also skip bids_directory mappings from BIDS nodes — they don't carry scatter.
    const scatteredUpstreamInputs = new Map(); // nodeId → Set<inputName>
    for (const edge of edges) {
        if (!scatteredNodeIds.has(edge.source)) continue;
        let mappings = edge.data?.mappings || [];
        if (mappings.length === 0) continue;

        if (bidsNodeIds.has(edge.source)) {
            mappings = mappings.filter(m => m.sourceOutput !== 'bids_directory');
            if (mappings.length === 0) continue;
        }

        const targetArrayInputs = arrayTypedInputs.get(edge.target) || new Set();
        if (!scatteredUpstreamInputs.has(edge.target)) {
            scatteredUpstreamInputs.set(edge.target, new Set());
        }
        const targetInputs = scatteredUpstreamInputs.get(edge.target);
        for (const m of mappings) {
            if (!targetArrayInputs.has(m.targetInput)) {
                targetInputs.add(m.targetInput);
            }
        }
    }

    return { scatteredNodeIds, sourceNodeIds, scatteredUpstreamInputs, gatherNodeIds };
}
