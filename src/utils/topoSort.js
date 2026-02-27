/**
 * Topological sort via Kahn's algorithm.
 * @param {Array<{id: string}>} nodes  - Nodes with at least an `id` field.
 * @param {Array<{source: string, target: string}>} edges - Directed edges.
 * @returns {string[]} Node IDs in topological order.
 * @throws {Error} If the graph contains a cycle.
 */
export function topoSort(nodes, edges) {
    const incoming = Object.fromEntries(nodes.map(n => [n.id, 0]));
    const outgoing = new Map(nodes.map(n => [n.id, []]));

    for (const e of edges) {
        if (incoming[e.target] !== undefined) incoming[e.target]++;
        outgoing.get(e.source)?.push(e.target);
    }

    const queue = nodes.filter(n => incoming[n.id] === 0).map(n => n.id);
    const order = [];
    let head = 0;

    while (head < queue.length) {
        const id = queue[head++];
        order.push(id);
        for (const t of (outgoing.get(id) || [])) {
            if (--incoming[t] === 0) queue.push(t);
        }
    }

    if (order.length !== nodes.length) {
        throw new Error('Workflow graph has cycles.');
    }

    return order;
}
