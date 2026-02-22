import { createContext, useContext } from 'react';
import { useCustomWorkflows } from '../hooks/useCustomWorkflows.js';

const CustomWorkflowsContext = createContext(null);

export function CustomWorkflowsProvider({ children }) {
  const hook = useCustomWorkflows();
  return (
    <CustomWorkflowsContext.Provider value={hook}>
      {children}
    </CustomWorkflowsContext.Provider>
  );
}

export const useCustomWorkflowsContext = () => useContext(CustomWorkflowsContext);
