import { topoSort } from './topoSort.js';

const DEFAULT_CONFIG = {
    nodeWidth: 140,
    nodeHeight: 60,
    horizontalSpacing: 60,
    verticalSpacing: 40,
};

/**
 * Compute a layered DAG layout for the given nodes and edges.
 * Returns a new array of nodes with updated position properties.
 *
 * Algorithm (simplified Sugiyama):
 *  1. Topological sort (Kahn's) for ordering
 *  2. Layer assignment via longest incoming path
 *  3. Barycenter heuristic for cross-minimization within layers
 *  4. Centered horizontal positioning per layer
 */
export function layoutGraph(nodes, edges, config = {}) {
    if (nodes.length <= 1) return nodes;

    const cfg = { ...DEFAULT_CONFIG, ...config };

    // 1. Topological order
    let order;
    try {
        order = topoSort(nodes, edges);
    } catch {
        // Graph has cycles — cannot layout, return unchanged
        return nodes;
    }

    // 2. Build incoming adjacency for layer assignment
    const incomingMap = new Map(nodes.map((n) => [n.id, []]));
    for (const e of edges) {
        incomingMap.get(e.target)?.push(e.source);
    }

    // 3. Assign layers (longest-path from sources)
    const layerOf = new Map();
    for (const id of order) {
        const parents = incomingMap.get(id) || [];
        const maxParentLayer = parents.reduce((max, pid) => Math.max(max, layerOf.get(pid) ?? -1), -1);
        layerOf.set(id, maxParentLayer + 1);
    }

    // 4. Group nodes by layer
    const layers = [];
    for (const id of order) {
        const layer = layerOf.get(id);
        if (!layers[layer]) layers[layer] = [];
        layers[layer].push(id);
    }

    // 5. Barycenter cross-minimization (single pass)
    const positionInLayer = new Map();
    layers[0].forEach((id, i) => positionInLayer.set(id, i));

    for (let l = 1; l < layers.length; l++) {
        const barycenters = layers[l].map((id) => {
            const parents = (incomingMap.get(id) || []).filter((pid) => layerOf.get(pid) < l);
            if (parents.length === 0) return { id, bc: 0 };
            const avg = parents.reduce((sum, pid) => sum + (positionInLayer.get(pid) ?? 0), 0) / parents.length;
            return { id, bc: avg };
        });

        barycenters.sort((a, b) => a.bc - b.bc);
        layers[l] = barycenters.map((b) => b.id);
        layers[l].forEach((id, i) => positionInLayer.set(id, i));
    }

    // 6. Assign x, y positions (left-to-right: layers along x, nodes within layer along y)
    const cellWidth = cfg.nodeWidth + cfg.horizontalSpacing;
    const cellHeight = cfg.nodeHeight + cfg.verticalSpacing;
    const maxLayerSize = Math.max(...layers.map((l) => l.length));
    const totalHeight = maxLayerSize * cellHeight;

    const newPositions = new Map();
    for (let l = 0; l < layers.length; l++) {
        const layerHeight = layers[l].length * cellHeight;
        const yOffset = (totalHeight - layerHeight) / 2;
        for (let i = 0; i < layers[l].length; i++) {
            newPositions.set(layers[l][i], {
                x: l * cellWidth,
                y: yOffset + i * cellHeight,
            });
        }
    }

    // 7. Return nodes with updated positions
    return nodes.map((n) => ({
        ...n,
        position: newPositions.get(n.id) || n.position,
    }));
}
