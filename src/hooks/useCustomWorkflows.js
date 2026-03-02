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
    // Snapshot for return value (best-effort at call time)
    const existingIndex = customWorkflows.findIndex(w => w.name === workflowData.name);
    if (existingIndex >= 0) {
      const existingId = customWorkflows[existingIndex].id;
      setCustomWorkflows(prev => {
        // Re-find inside updater to avoid stale index from outer closure
        const idx = prev.findIndex(w => w.name === workflowData.name);
        if (idx < 0) return [...prev, { ...workflowData, id: crypto.randomUUID(), createdAt: Date.now(), updatedAt: Date.now() }];
        const updated = [...prev];
        updated[idx] = {
          ...workflowData,
          id: prev[idx].id,
          createdAt: prev[idx].createdAt,
          updatedAt: Date.now()
        };
        return updated;
      });
      return { result: 'updated', id: existingId };
    }

    // New workflow
    const newId = crypto.randomUUID();
    setCustomWorkflows(prev => [...prev, {
      ...workflowData,
      id: newId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }]);
    return { result: 'created', id: newId };
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
