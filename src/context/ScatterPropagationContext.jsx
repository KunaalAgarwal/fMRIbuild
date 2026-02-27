import { createContext } from 'react';

// Stable defaults — frozen to prevent accidental mutation and ensure referential equality
const EMPTY_SET = Object.freeze(new Set());
const EMPTY_MAP = Object.freeze(new Map());

// Context for scatter propagation - lets NodeComponent show per-input scatter state
// and know which nodes are source nodes (no incoming edges).
export const ScatterPropagationContext = createContext({
    propagatedIds: EMPTY_SET,
    sourceNodeIds: EMPTY_SET,
    scatteredUpstreamInputs: EMPTY_MAP, // nodeId → Set<inputName> (inputs from scattered upstream)
    gatherNodeIds: EMPTY_SET,
});
