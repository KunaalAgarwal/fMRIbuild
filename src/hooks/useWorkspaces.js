import { useState, useEffect } from 'react';

export function useWorkspaces() {
  // Initialize state from localStorage or use defaults if nothing is stored.
  // Each workspace is now an object with 'nodes' and 'edges'
  const [workspaces, setWorkspaces] = useState(() => {
    const savedWorkspaces = JSON.parse(localStorage.getItem('workspaces'));
    if (savedWorkspaces) {
      // Migrate existing data to include name field
      return savedWorkspaces.map(ws => ({
        nodes: ws.nodes || [],
        edges: ws.edges || [],
        name: ws.name || ''
      }));
    }
    return [{ nodes: [], edges: [], name: '' }];
  });

  const [currentWorkspace, setCurrentWorkspace] = useState(() => {
    const savedIndex = parseInt(localStorage.getItem('currentWorkspace'), 10);
    return !isNaN(savedIndex) ? savedIndex : 0; // Default to the first workspace
  });

  // Save workspaces to localStorage whenever they change.
  useEffect(() => {
    localStorage.setItem('workspaces', JSON.stringify(workspaces));
  }, [workspaces]);

  // Save the current workspace index to localStorage whenever it changes.
  useEffect(() => {
    localStorage.setItem('currentWorkspace', currentWorkspace);
  }, [currentWorkspace]);

  const addNewWorkspace = () => {
    setWorkspaces((prevWorkspaces) => [
      ...prevWorkspaces,
      { nodes: [], edges: [], name: '' }
    ]);
    setCurrentWorkspace(workspaces.length); // Switch to the new workspace
  };

  const clearCurrentWorkspace = () => {
    setWorkspaces((prevWorkspaces) => {
      const updatedWorkspaces = [...prevWorkspaces];
      // Preserve the name when clearing
      const currentName = updatedWorkspaces[currentWorkspace]?.name || '';
      updatedWorkspaces[currentWorkspace] = { nodes: [], edges: [], name: currentName };
      return updatedWorkspaces;
    });
  };

  const updateCurrentWorkspaceItems = (newItems) => {
    // newItems is expected to be an object with shape: { nodes, edges }
    setWorkspaces((prevWorkspaces) => {
      const updatedWorkspaces = [...prevWorkspaces];
      // Preserve the name when updating nodes/edges
      const currentName = updatedWorkspaces[currentWorkspace]?.name || '';
      updatedWorkspaces[currentWorkspace] = {
        ...newItems,
        name: currentName
      };
      return updatedWorkspaces;
    });
  };

  const removeCurrentWorkspace = () => {
    setWorkspaces((prevWorkspaces) => {
      if (prevWorkspaces.length === 1) {
        // Prevent removing the last remaining workspace.
        return prevWorkspaces;
      }
      const updatedWorkspaces = prevWorkspaces.filter(
          (_, index) => index !== currentWorkspace
      );
      if (currentWorkspace >= updatedWorkspaces.length) {
        setCurrentWorkspace(updatedWorkspaces.length - 1);
      }
      return updatedWorkspaces;
    });
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
