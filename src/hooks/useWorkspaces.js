import { useState } from 'react';
import { useDebouncedStorage } from './useDebouncedStorage.js';

const DEFAULT_WORKSPACES = [{ id: crypto.randomUUID(), nodes: [], edges: [], name: '' }];

export function useWorkspaces() {
  // Initialize state from localStorage or use defaults if nothing is stored.
  // Each workspace is now an object with 'nodes' and 'edges'
  const [workspaces, setWorkspaces] = useState(() => {
    try {
      const savedWorkspaces = JSON.parse(localStorage.getItem('workspaces'));
      if (savedWorkspaces) {
        // Migrate existing data to include name and id fields
        return savedWorkspaces.map(ws => ({
          id: ws.id || crypto.randomUUID(),
          nodes: ws.nodes || [],
          edges: ws.edges || [],
          name: ws.name || ''
        }));
      }
    } catch {
      // Corrupted localStorage — fall through to default
    }
    return DEFAULT_WORKSPACES;
  });

  const [currentWorkspace, setCurrentWorkspace] = useState(() => {
    const savedIndex = parseInt(localStorage.getItem('currentWorkspace'), 10);
    return !isNaN(savedIndex) ? savedIndex : 0; // Default to the first workspace
  });

  // Debounced localStorage writes (300ms delay prevents main thread blocking)
  useDebouncedStorage('workspaces', workspaces, 300);
  useDebouncedStorage('currentWorkspace', currentWorkspace, 300);

  const addNewWorkspace = () => {
    setWorkspaces((prev) => [...prev, { id: crypto.randomUUID(), nodes: [], edges: [], name: '' }]);
    setCurrentWorkspace((prev) => prev + 1);
  };

  const clearCurrentWorkspace = () => {
    setWorkspaces((prevWorkspaces) => {
      const updatedWorkspaces = [...prevWorkspaces];
      // Preserve the id and name when clearing
      const ws = updatedWorkspaces[currentWorkspace];
      updatedWorkspaces[currentWorkspace] = { id: ws?.id || crypto.randomUUID(), nodes: [], edges: [], name: ws?.name || '' };
      return updatedWorkspaces;
    });
  };

  const updateCurrentWorkspaceItems = (newItems) => {
    // newItems is expected to be an object with shape: { nodes, edges }
    setWorkspaces((prevWorkspaces) => {
      const updatedWorkspaces = [...prevWorkspaces];
      // Preserve the id and name when updating nodes/edges
      const ws = updatedWorkspaces[currentWorkspace];
      updatedWorkspaces[currentWorkspace] = {
        ...newItems,
        id: ws?.id || crypto.randomUUID(),
        name: ws?.name || ''
      };
      return updatedWorkspaces;
    });
  };

  const removeCurrentWorkspace = () => {
    if (workspaces.length === 1) return;
    setWorkspaces((prevWorkspaces) =>
      prevWorkspaces.filter((_, index) => index !== currentWorkspace)
    );
    setCurrentWorkspace((prev) => (prev >= workspaces.length - 1 ? workspaces.length - 2 : prev));
  };

  const updateWorkspaceName = (newName) => {
    setWorkspaces((prevWorkspaces) => {
      const updatedWorkspaces = [...prevWorkspaces];
      updatedWorkspaces[currentWorkspace] = {
        ...updatedWorkspaces[currentWorkspace],
        name: newName
      };
      return updatedWorkspaces;
    });
  };

  return {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    addNewWorkspace,
    clearCurrentWorkspace,
    updateCurrentWorkspaceItems,
    removeCurrentWorkspace,
    updateWorkspaceName
  };
}
