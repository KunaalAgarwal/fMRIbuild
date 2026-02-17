import { createContext } from 'react';

// Context for scatter propagation - lets NodeComponent show inherited scatter badges
// and know which nodes are source nodes (no incoming edges).
export const ScatterPropagationContext = createContext({
    propagatedIds: new Set(),
    sourceNodeIds: new Set()
});
