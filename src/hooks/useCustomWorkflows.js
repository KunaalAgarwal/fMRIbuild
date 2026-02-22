import { useState } from 'react';
import { useDebouncedStorage } from './useDebouncedStorage.js';

export function useCustomWorkflows() {
  const [customWorkflows, setCustomWorkflows] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('customWorkflows'));
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  useDebouncedStorage('customWorkflows', customWorkflows, 300);

  const getNextDefaultName = () => {
    const pattern = /^Custom Workflow (\d+)$/;
    const usedNumbers = customWorkflows
      .map(w => w.name.match(pattern))
      .filter(Boolean)
      .map(m => parseInt(m[1], 10));
    const next = usedNumbers.length === 0 ? 1 : Math.max(...usedNumbers) + 1;
    return `Custom Workflow ${next}`;
  };

  const saveWorkflow = (workflowData) => {
    // Check if a workflow with the same name already exists (update it)
    const existingIndex = customWorkflows.findIndex(w => w.name === workflowData.name);
    if (existingIndex >= 0) {
      setCustomWorkflows(prev => {
        const updated = [...prev];
        updated[existingIndex] = {
          ...workflowData,
          id: prev[existingIndex].id,
          createdAt: prev[existingIndex].createdAt,
          updatedAt: Date.now()
        };
        return updated;
      });
      return 'updated';
    }

    // New workflow
    setCustomWorkflows(prev => [...prev, {
      ...workflowData,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }]);
    return 'created';
  };

  const updateWorkflow = (id, updates) => {
    setCustomWorkflows(prev => prev.map(w =>
      w.id === id ? { ...w, ...updates, updatedAt: Date.now() } : w
    ));
  };

  const deleteWorkflow = (id) => {
    setCustomWorkflows(prev => prev.filter(w => w.id !== id));
  };

  return {
    customWorkflows,
    saveWorkflow,
    updateWorkflow,
    deleteWorkflow,
    getNextDefaultName
  };
}
