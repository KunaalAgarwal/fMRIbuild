import { useCallback, useRef, useState } from 'react';

/**
 * Structural signature of a canvas — the parts that undo/redo cares about:
 * node identity + position, and edge identity + wiring + mappings. Deliberately
 * EXCLUDES node.data (parameters), selection, and drag flags, so a parameter
 * edit or a selection change does not register as an undoable step.
 */
function structuralSig(nodes, edges) {
    const n = (nodes || [])
        .map((nd) => `${nd.id}@${Math.round(nd.position?.x ?? 0)},${Math.round(nd.position?.y ?? 0)}`)
        .join(';');
    const e = (edges || [])
        .map(
            (ed) =>
                `${ed.id}:${ed.source}>${ed.target}:${ed.sourceHandle ?? ''}>${ed.targetHandle ?? ''}:${JSON.stringify(
                    ed.data?.mappings ?? [],
                )}`,
        )
        .join(';');
    return `${n}||${e}`;
}

/**
 * Undo/redo for canvas STRUCTURE — adding/removing nodes and edges, moving
 * nodes, and rewiring edge mappings. Parameter edits are intentionally not
 * undoable (see structuralSig).
 *
 * The model is the classic past / present / future triple over `{nodes, edges}`
 * snapshots:
 *   - `record(nodes, edges)` is the commit point. Call it whenever the canvas
 *     settles after a meaningful change (in this app, the same place that
 *     persists to the workspace). If the structure changed it pushes the prior
 *     snapshot onto the undo stack and clears redo; if only parameters changed
 *     it just refreshes the present snapshot so a later undo keeps live params.
 *   - `reset(nodes, edges)` re-baselines and clears both stacks — call it when a
 *     workspace loads, so history never bleeds across workspaces.
 *   - `undo` / `redo` restore a snapshot and invoke `onRestore` (used here to
 *     re-persist the restored state). The restore is idempotent: the resulting
 *     `record` sees an unchanged signature and adds no entry.
 *
 * Snapshots are bounded (`limit`, default 50) so memory stays flat.
 */
export function useCanvasHistory({ setNodes, setEdges, onRestore, limit = 50 }) {
    const present = useRef({ nodes: [], edges: [], sig: structuralSig([], []) });
    const past = useRef([]);
    const future = useRef([]);
    // Bump to re-render consumers (toolbar buttons) when canUndo/canRedo flip.
    const [, force] = useState(0);
    const bump = useCallback(() => force((v) => v + 1), []);

    const reset = useCallback(
        (nodes, edges) => {
            present.current = { nodes, edges, sig: structuralSig(nodes, edges) };
            past.current = [];
            future.current = [];
            bump();
        },
        [bump],
    );

    const record = useCallback(
        (nodes, edges) => {
            const sig = structuralSig(nodes, edges);
            if (sig === present.current.sig) {
                // Non-structural change (e.g. a parameter edit): keep the latest
                // content so a future undo restores up-to-date params, but don't
                // add a history entry.
                present.current = { nodes, edges, sig };
                return;
            }
            past.current.push(present.current);
            if (past.current.length > limit) past.current.shift();
            future.current = [];
            present.current = { nodes, edges, sig };
            bump();
        },
        [bump, limit],
    );

    const undo = useCallback(() => {
        if (past.current.length === 0) return;
        const prev = past.current.pop();
        future.current.push(present.current);
        present.current = prev;
        setNodes(prev.nodes);
        setEdges(prev.edges);
        onRestore?.();
        bump();
    }, [setNodes, setEdges, onRestore, bump]);

    const redo = useCallback(() => {
        if (future.current.length === 0) return;
        const next = future.current.pop();
        past.current.push(present.current);
        present.current = next;
        setNodes(next.nodes);
        setEdges(next.edges);
        onRestore?.();
        bump();
    }, [setNodes, setEdges, onRestore, bump]);

    return {
        record,
        reset,
        undo,
        redo,
        canUndo: past.current.length > 0,
        canRedo: future.current.length > 0,
    };
}
