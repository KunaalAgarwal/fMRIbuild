import { useMemo } from 'react';

/**
 * Memoized Map<nodeId, node> for O(1) node lookups.
 * Replaces O(n) nodes.find() calls with O(1) Map lookups.
 *
 * @param {Array} nodes - Array of ReactFlow nodes
 * @returns {Map} Map from node ID to node object
 */
export function useNodeLookup(nodes) {
    return useMemo(() => {
        const map = new Map();
        for (const node of nodes) {
            map.set(node.id, node);
        }
        return map;
    }, [nodes]);
}
