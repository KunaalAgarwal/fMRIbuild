import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';

import 'reactflow/dist/style.css';
import '../styles/workflowCanvas.css';
import '../styles/actionsBar.css';

import NodeComponent from './NodeComponent';
import EdgeMappingModal from './EdgeMappingModal';
import BIDSDataModal from './BIDSDataModal';
import { useNodeLookup } from '../hooks/useNodeLookup.js';
import { ScatterPropagationContext } from '../context/ScatterPropagationContext.jsx';
import { WiredInputsContext } from '../context/WiredInputsContext.jsx';
import { computeScatteredNodes } from '../utils/scatterPropagation.js';
import { useCustomWorkflowsContext } from '../context/CustomWorkflowsContext.jsx';
import { parseBIDSDirectory } from '../utils/bidsParser.js';
import { useToast } from '../context/ToastContext.jsx';

// Define node types.
const nodeTypes = { default: NodeComponent };

// Shared edge arrow marker config
const EDGE_ARROW = { type: MarkerType.ArrowClosed, width: 10, height: 10 };

// Consistent default viewport so every workspace starts with the same canvas size
const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };

function WorkflowCanvas({ workflowItems, updateCurrentWorkspaceItems, onSetWorkflowData, currentWorkspaceIndex, saveViewportForWorkspace }) {
  const { customWorkflows } = useCustomWorkflowsContext();
  const reactFlowWrapper = useRef(null);
  const prevWorkspaceRef = useRef(currentWorkspaceIndex);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Memoized node lookup for O(1) access
  const nodeMap = useNodeLookup(nodes);
  // Refs to track current nodes/edges for closures (fixes stale closure issue)
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const edgesRef = useRef(edges);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Deferred workspace sync: flag-based to avoid setState-during-render.
  // Only syncs when explicitly marked (user actions), not on drag/selection changes.
  const needsSyncRef = useRef(false);
  const markForSync = useCallback(() => { needsSyncRef.current = true; }, []);

  useEffect(() => {
    if (needsSyncRef.current) {
      needsSyncRef.current = false;
      if (updateCurrentWorkspaceItems) {
        const viewport = reactFlowInstance?.getViewport() || null;
        updateCurrentWorkspaceItems({ nodes, edges, viewport });
      }
    }
  }, [nodes, edges, updateCurrentWorkspaceItems]);

  // Compute which nodes inherit scatter from upstream (BFS propagation).
  // Used by NodeComponent via ScatterPropagationContext to show badges.
  // BIDS nodes participate in scatter (they output File[] arrays) but regular dummy nodes don't.
  const scatterContext = useMemo(() => {
    const dummyIds = new Set(nodes.filter(n => n.data?.isDummy && !n.data?.isBIDS).map(n => n.id));
    const realNodes = nodes.filter(n => !n.data?.isDummy || n.data?.isBIDS);
    const realEdges = edges.filter(e => !dummyIds.has(e.source) && !dummyIds.has(e.target));
    const { scatteredNodeIds, sourceNodeIds, gatherNodeIds } = computeScatteredNodes(realNodes, realEdges);
    return { propagatedIds: scatteredNodeIds, sourceNodeIds, gatherNodeIds };
  }, [nodes, edges]);

  // Compute which inputs on each node are wired from upstream edge mappings.
  // Used by NodeComponent via WiredInputsContext to show wired/unwired state.
  // Value: Map<nodeId, Map<inputName, Array<{ sourceNodeId, sourceNodeLabel, sourceOutput }>>>
  const wiredContext = useMemo(() => {
    const wiredMap = new Map();
    edges.forEach(edge => {
      if (!edge.data?.mappings) return;
      edge.data.mappings.forEach(mapping => {
        if (!wiredMap.has(edge.target)) wiredMap.set(edge.target, new Map());
        const nodeInputs = wiredMap.get(edge.target);
        const sourceNode = nodeMap.get(edge.source);
        const sourceInfo = {
          sourceNodeId: edge.source,
          sourceNodeLabel: sourceNode?.data?.label || 'Unknown',
          sourceOutput: mapping.sourceOutput
        };
        if (nodeInputs.has(mapping.targetInput)) {
          nodeInputs.get(mapping.targetInput).push(sourceInfo);
        } else {
          nodeInputs.set(mapping.targetInput, [sourceInfo]);
        }
      });
    });
    return wiredMap;
  }, [edges, nodeMap]);

  // Sync on-canvas custom workflow nodes when saved workflows change.
  // Also removes orphaned nodes whose workflow was deleted.
  useEffect(() => {
    if (!customWorkflows) return;

    let changed = false;
    const removedIds = new Set();
    const updatedNodes = nodes.map(node => {
      if (!node.data?.isCustomWorkflow || !node.data?.customWorkflowId) return node;
      const saved = customWorkflows.find(w => w.id === node.data.customWorkflowId);
      if (!saved) {
        // Workflow was deleted — mark node for removal
        changed = true;
        removedIds.add(node.id);
        return null;
      }

      // Compare serialized internal data to detect changes
      const currentInternal = JSON.stringify(node.data.internalNodes);
      const savedInternal = JSON.stringify(saved.nodes);
      if (currentInternal === savedInternal &&
          node.data.label === saved.name &&
          node.data.hasValidationWarnings === saved.hasValidationWarnings) {
        return node;
      }

      changed = true;
      return {
        ...node,
        data: {
          ...node.data,
          label: saved.name,
          internalNodes: structuredClone(saved.nodes),
          internalEdges: structuredClone(saved.edges),
          boundaryNodes: { ...saved.boundaryNodes },
          hasValidationWarnings: saved.hasValidationWarnings,
        }
      };
    }).filter(Boolean);

    if (changed) {
      if (removedIds.size > 0) {
        setEdges(prev => prev.filter(e => !removedIds.has(e.source) && !removedIds.has(e.target)));
      }
      setNodes(updatedNodes);
      markForSync();
    }
  }, [customWorkflows]);

  // Compute display labels for duplicate node names (e.g., "flirt (1)", "flirt (2)").
  // Runs as an effect to avoid infinite re-render loops from mutating nodes in useMemo.
  const prevLabelKeyRef = useRef('');
  useEffect(() => {
    // Build a key from node ids + labels to detect meaningful changes
    const labelKey = nodes.map(n => `${n.id}:${n.data?.label}`).join('|');
    if (labelKey === prevLabelKeyRef.current) return;
    prevLabelKeyRef.current = labelKey;

    // Count occurrences of each label
    const labelCounts = {};
    for (const n of nodes) {
      const label = n.data?.label || '';
      labelCounts[label] = (labelCounts[label] || 0) + 1;
    }

    // Assign display labels only for duplicates
    const labelSeq = {};
    let anyChange = false;
    const updated = nodes.map(n => {
      const label = n.data?.label || '';
      let displayLabel;
      if (labelCounts[label] > 1) {
        labelSeq[label] = (labelSeq[label] || 0) + 1;
        displayLabel = `${label} (${labelSeq[label]})`;
      } else {
        displayLabel = label;
      }
      if (n.data?.displayLabel !== displayLabel) {
        anyChange = true;
        return { ...n, data: { ...n.data, displayLabel } };
      }
      return n;
    });

    if (anyChange) {
      setNodes(updated);
    }
  }, [nodes]);

  // Edge mapping modal state
  const [showEdgeModal, setShowEdgeModal] = useState(false);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [editingEdge, setEditingEdge] = useState(null);
  const [edgeModalData, setEdgeModalData] = useState(null);

  // BIDS modal state
  const [showBIDSModal, setShowBIDSModal] = useState(false);
  const [bidsModalNodeId, setBidsModalNodeId] = useState(null);
  const bidsFileInputRef = useRef(null);
  const bidsPickerTargetRef = useRef(null);
  const { showError, showWarning, showInfo } = useToast();

  // --- INITIALIZATION & Synchronization ---
  // This effect watches for changes in the persistent workspace.
  // When the clear workspace button is pressed, workflowItems becomes empty,
  // and this effect clears the canvas accordingly.
  // Also triggers when workspace index changes (switching workspaces).
  useEffect(() => {
    if (workflowItems && typeof workflowItems.nodes !== 'undefined') {
      const workspaceSwitched = prevWorkspaceRef.current !== currentWorkspaceIndex;
      // Save outgoing workspace's viewport before switching
      if (workspaceSwitched && reactFlowInstance && saveViewportForWorkspace) {
        saveViewportForWorkspace(prevWorkspaceRef.current, reactFlowInstance.getViewport());
      }
      prevWorkspaceRef.current = currentWorkspaceIndex;

      if (workspaceSwitched || workflowItems.nodes.length !== nodes.length) {
        let anyCustomSynced = false;
        const initialNodes = (workflowItems.nodes || []).map((node) => {
          const restoredData = {
            ...node.data,
            // Reattach callbacks so nodes remain interactive.
            onSaveParameters: node.data.isDummy
              ? null
              : node.data.isCustomWorkflow
                ? (newData) => handleCustomNodeUpdate(node.id, newData)
                : (newParams) => handleNodeUpdate(node.id, newParams),
            // Reattach BIDS callback
            ...(node.data.isBIDS ? { onUpdateBIDS: (updates) => handleBIDSNodeUpdate(node.id, updates) } : {}),
            // Reattach I/O edit callback for dummy nodes
            onSaveIO: node.data.isDummy ? (data) => handleIONodeUpdate(node.id, data) : null,
          };

          // Sync custom workflow nodes with latest saved workflow data
          if (restoredData.isCustomWorkflow && restoredData.customWorkflowId && customWorkflows) {
            const saved = customWorkflows.find(w => w.id === restoredData.customWorkflowId);
            if (saved) {
              const currentInternal = JSON.stringify(restoredData.internalNodes);
              const savedInternal = JSON.stringify(saved.nodes);
              if (currentInternal !== savedInternal ||
                  restoredData.label !== saved.name ||
                  restoredData.hasValidationWarnings !== saved.hasValidationWarnings) {
                anyCustomSynced = true;
                Object.assign(restoredData, {
                  label: saved.name,
                  internalNodes: structuredClone(saved.nodes),
                  internalEdges: structuredClone(saved.edges),
                  boundaryNodes: { ...saved.boundaryNodes },
                  hasValidationWarnings: saved.hasValidationWarnings,
                });
              }
            }
          }

          return { ...node, data: restoredData };
        });
        // Restore edges with styling and data (mappings)
        const initialEdges = (workflowItems.edges || []).map((edge, index) => ({
          ...edge,
          // Ensure edge has an ID (fallback for old saved data)
          id: edge.id || `${edge.source}-${edge.target}-${index}`,
          animated: true,
          markerEnd: EDGE_ARROW,
          style: { strokeWidth: 2 },
        }));
        setNodes(initialNodes);
        setEdges(initialEdges);

        // Restore saved viewport or fitView for new/empty workspaces
        if (workspaceSwitched && reactFlowInstance) {
          const savedViewport = workflowItems.viewport;
          // Defer to next frame so nodes render before viewport is set
          setTimeout(() => {
            if (savedViewport) {
              reactFlowInstance.setViewport(savedViewport);
            } else {
              reactFlowInstance.setViewport(DEFAULT_VIEWPORT);
            }
          }, 0);
        }

        // Persist synced custom workflow data back to workspace state
        if (anyCustomSynced) {
          markForSync();
        }
      }
    }
  }, [workflowItems, nodes.length, currentWorkspaceIndex]);

  // Update a node's parameters and dockerVersion.
  const handleNodeUpdate = (nodeId, updatedData) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
          node.id === nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    parameters: updatedData.params || updatedData,
                    dockerVersion: updatedData.dockerVersion || node.data.dockerVersion || 'latest',
                    scatterEnabled: updatedData.scatterEnabled !== undefined
                        ? updatedData.scatterEnabled
                        : (node.data.scatterEnabled || false),
                    gatherEnabled: updatedData.gatherEnabled !== undefined
                        ? updatedData.gatherEnabled
                        : (node.data.gatherEnabled || false),
                    linkMergeOverrides: updatedData.linkMergeOverrides || node.data.linkMergeOverrides || {},
                    whenExpression: updatedData.whenExpression !== undefined
                        ? updatedData.whenExpression
                        : (node.data.whenExpression || ''),
                    expressions: updatedData.expressions || node.data.expressions || {},
                    notes: updatedData.notes ?? node.data.notes ?? '',
                  }
                }
              : node
      )
    );
    markForSync();
  };

  // Update a custom workflow node's internal nodes (parameter edits).
  const handleCustomNodeUpdate = (nodeId, updatedData) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                internalNodes: updatedData.internalNodes || node.data.internalNodes,
                notes: updatedData.notes ?? node.data.notes ?? '',
              }
            }
          : node
      )
    );
    markForSync();
  };

  // Update an I/O (dummy) node's label and notes.
  const handleIONodeUpdate = (nodeId, updatedData) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                label: updatedData.label ?? node.data.label,
                notes: updatedData.notes ?? node.data.notes ?? '',
              }
            }
          : node
      )
    );
    markForSync();
  };

  // --- BIDS node handlers ---
  const handleBIDSNodeUpdate = (nodeId, updates) => {
    // Handle signal actions from NodeComponent
    if (updates._openModal) {
      setBidsModalNodeId(nodeId);
      setShowBIDSModal(true);
      return;
    }
    if (updates._pickDirectory) {
      bidsPickerTargetRef.current = nodeId;
      bidsFileInputRef.current?.click();
      return;
    }
    // Normal data update
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      )
    );
    markForSync();
  };

  const triggerBIDSDirectoryPicker = (nodeId) => {
    bidsPickerTargetRef.current = nodeId;
    bidsFileInputRef.current?.click();
  };

  const handleBIDSDirectorySelected = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const nodeId = bidsPickerTargetRef.current;
    if (!nodeId) return;

    const result = await parseBIDSDirectory(files);

    if (result.errors.length > 0) {
      result.errors.forEach(e => showError(e, 6000));
      // Reset file input
      event.target.value = '';
      return;
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach(w => showWarning(w, 5000));
    }

    if (result.info.length > 0) {
      showInfo(result.info.join(' '));
    }

    // Store structure on the node and open modal
    handleBIDSNodeUpdate(nodeId, { bidsStructure: result.bidsStructure });
    setBidsModalNodeId(nodeId);
    setShowBIDSModal(true);

    // Reset file input so same directory can be re-selected
    event.target.value = '';
  };

  const handleBIDSModalClose = (bidsSelections) => {
    if (bidsSelections && bidsModalNodeId) {
      handleBIDSNodeUpdate(bidsModalNodeId, {
        bidsSelections,
        scatterEnabled: true, // BIDS outputs are always arrays
      });
    }
    setShowBIDSModal(false);
    setBidsModalNodeId(null);
  };

  // Build a flat node-info object for the EdgeMappingModal from a ReactFlow node.
  const buildEdgeModalNode = (node) => ({
    id: node.id,
    label: node.data.label,
    isDummy: node.data.isDummy || false,
    isBIDS: node.data.isBIDS || false,
    bidsSelections: node.data.bidsSelections || null,
    isCustomWorkflow: node.data.isCustomWorkflow || false,
    internalNodes: node.data.internalNodes || [],
    internalEdges: node.data.internalEdges || [],
    isScattered: scatterContext.propagatedIds.has(node.id),
  });

  // Connect edges - open modal to configure mapping.
  const onConnect = useCallback(
      (connection) => {
        setPendingConnection(connection);
        setEditingEdge(null);

        const sourceNode = nodeMap.get(connection.source);
        const targetNode = nodeMap.get(connection.target);

        if (sourceNode && targetNode) {
          setEdgeModalData({
            sourceNode: buildEdgeModalNode(sourceNode),
            targetNode: buildEdgeModalNode(targetNode),
            existingMappings: [],
            adjacencyWarning: null, // disabled — cross-modality false positives; type/extension validation is sufficient
          });
          setShowEdgeModal(true);
        }
      },
      [nodeMap]
  );

  // Handle double-click on edge to edit mapping
  const onEdgeDoubleClick = useCallback(
      (event, edge) => {
        event.stopPropagation();
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);

        if (sourceNode && targetNode) {
          setEditingEdge(edge);
          setPendingConnection(null);
          setEdgeModalData({
            sourceNode: buildEdgeModalNode(sourceNode),
            targetNode: buildEdgeModalNode(targetNode),
            existingMappings: edge.data?.mappings || [],
            adjacencyWarning: null, // disabled — cross-modality false positives; type/extension validation is sufficient
          });
          setShowEdgeModal(true);
        }
      },
      [nodeMap]
  );

  // Handle saving edge mappings from modal
  const handleEdgeMappingSave = useCallback(
      (mappings) => {
        if (editingEdge) {
          // Update existing edge
          setEdges((eds) =>
            eds.map((e) =>
                e.id === editingEdge.id
                    ? { ...e, data: { ...e.data, mappings } }
                    : e
            )
          );
        } else if (pendingConnection) {
          // Create new edge with mappings
          const newEdge = {
            id: `${pendingConnection.source}-${pendingConnection.target}-${crypto.randomUUID()}`,
            source: pendingConnection.source,
            target: pendingConnection.target,
            animated: true,
            markerEnd: EDGE_ARROW,
            style: { strokeWidth: 2 },
            data: { mappings }
          };
          setEdges((eds) => [...eds, newEdge]);
        }

        markForSync();

        // Reset modal state
        setShowEdgeModal(false);
        setPendingConnection(null);
        setEditingEdge(null);
        setEdgeModalData(null);
      },
      [pendingConnection, editingEdge]
  );

  // Handle closing edge modal without saving
  const handleEdgeModalClose = useCallback(() => {
    setShowEdgeModal(false);
    setPendingConnection(null);
    setEditingEdge(null);
    setEdgeModalData(null);
  }, []);

  // Wrap onEdgesChange to sync edge deletions to localStorage
  // Uses nodesRef to avoid stale closure capturing nodes
  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);

    // Sync edge deletions to localStorage
    const deletions = changes.filter(c => c.type === 'remove');
    if (deletions.length > 0) {
      markForSync();
    }
  }, [onEdgesChange, markForSync]);

  // Handle drag over.
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // On drop, create a new node.
  const handleDrop = (event) => {
    event.preventDefault();
    const name = event.dataTransfer.getData('node/name') || 'Unnamed Node';
    const isDummy = event.dataTransfer.getData('node/isDummy') === 'true';
    const isBIDS = event.dataTransfer.getData('node/isBIDS') === 'true';
    const customWorkflowId = event.dataTransfer.getData('node/customWorkflowId');
    if (!reactFlowInstance) return;

    const flowPosition = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Helper: create a node with common defaults, apply type-specific overrides
    const createNode = (dataOverrides, afterAdd) => {
      const newNodeId = crypto.randomUUID();
      const newNode = {
        id: newNodeId,
        type: 'default',
        position: flowPosition,
        data: {
          label: name,
          isDummy: false,
          parameters: '',
          dockerVersion: 'latest',
          scatterEnabled: false,
          gatherEnabled: false,
          linkMergeOverrides: {},
          whenExpression: '',
          expressions: {},
          notes: '',
          ...dataOverrides(newNodeId),
        },
      };
      setNodes((prevNodes) => [...prevNodes, newNode]);
      markForSync();
      if (afterAdd) afterAdd(newNodeId);
    };

    if (isBIDS) {
      createNode((id) => ({
        isDummy: true,
        isBIDS: true,
        bidsStructure: null,
        bidsSelections: null,
        onSaveParameters: null,
        onSaveIO: (data) => handleIONodeUpdate(id, data),
        onUpdateBIDS: (updates) => handleBIDSNodeUpdate(id, updates),
      }), (id) => triggerBIDSDirectoryPicker(id));
    } else if (customWorkflowId) {
      const savedWorkflow = customWorkflows.find(w => w.id === customWorkflowId);
      if (!savedWorkflow) return;
      createNode((id) => ({
        label: savedWorkflow.name,
        isCustomWorkflow: true,
        customWorkflowId: savedWorkflow.id,
        internalNodes: structuredClone(savedWorkflow.nodes),
        internalEdges: structuredClone(savedWorkflow.edges),
        boundaryNodes: { ...savedWorkflow.boundaryNodes },
        hasValidationWarnings: savedWorkflow.hasValidationWarnings,
        parameters: {},
        onSaveParameters: (newData) => handleCustomNodeUpdate(id, newData),
      }));
    } else {
      createNode((id) => ({
        isDummy: isDummy,
        onSaveParameters: isDummy ? null : (newData) => handleNodeUpdate(id, newData),
        onSaveIO: isDummy ? (data) => handleIONodeUpdate(id, data) : null,
      }));
    }
  };

  // Delete nodes and corresponding edges.
  // Uses Set for O(1) lookups instead of O(n) array.some()
  const onNodesDelete = useCallback(
      (deletedNodes) => {
        // Pre-compute Set for O(1) lookups (fixes O(n²) -> O(n))
        const deletedIds = new Set(deletedNodes.map(n => n.id));

        setNodes((prevNodes) =>
          prevNodes.filter((node) => !deletedIds.has(node.id))
        );
        setEdges((prevEdges) =>
          prevEdges.filter((edge) => !deletedIds.has(edge.source) && !deletedIds.has(edge.target))
        );
        markForSync();
      },
      [markForSync]
  );

  // --- Global Key Listener for "Delete" Key ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete') {
        if (reactFlowInstance) {
          const selectedNodes = reactFlowInstance.getNodes().filter((node) => node.selected);
          if (selectedNodes.length > 0) {
            onNodesDelete(selectedNodes);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reactFlowInstance, onNodesDelete]);

  // Provide complete workflow data for exporting.
  const getWorkflowData = () => ({
    nodes: nodes.map((node) => ({
      id: node.id,
      data: node.data,
      position: node.position,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,  // Required for ReactFlow to manage edges
      source: edge.source,
      target: edge.target,
      data: edge.data,  // Include mapping data
    })),
  });

  useEffect(() => {
    if (onSetWorkflowData) {
      onSetWorkflowData(() => getWorkflowData);
    }
  }, [nodes, edges, onSetWorkflowData]);

  return (
      <div className="workflow-canvas">
        <div
            ref={reactFlowWrapper}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="workflow-canvas-container"
        >
          <ScatterPropagationContext.Provider value={scatterContext}>
          <WiredInputsContext.Provider value={wiredContext}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={onConnect}
                onNodesDelete={onNodesDelete}
                onEdgeDoubleClick={onEdgeDoubleClick}
                nodeTypes={nodeTypes}
                onInit={(instance) => {
                  setReactFlowInstance(instance);
                  // Initial fitView on first load (before any workspace viewport is restored)
                  const savedViewport = workflowItems?.viewport;
                  if (savedViewport) {
                    instance.setViewport(savedViewport);
                  } else {
                    instance.setViewport(DEFAULT_VIEWPORT);
                  }
                }}
            >
              <MiniMap
                nodeColor="var(--color-primary)"
                maskColor="var(--minimap-mask)"
                style={{ backgroundColor: 'var(--minimap-bg)' }}
              />
              <Background variant="dots" gap={12} size={1} />
              <Controls />
            </ReactFlow>
          </WiredInputsContext.Provider>
          </ScatterPropagationContext.Provider>
        </div>

        {/* Edge Mapping Modal */}
        <EdgeMappingModal
            show={showEdgeModal}
            onClose={handleEdgeModalClose}
            onSave={handleEdgeMappingSave}
            sourceNode={edgeModalData?.sourceNode}
            targetNode={edgeModalData?.targetNode}
            existingMappings={edgeModalData?.existingMappings || []}
            adjacencyWarning={edgeModalData?.adjacencyWarning || null}
            sourceIsScattered={edgeModalData?.sourceNode?.isScattered || false}
        />

        {/* Hidden directory picker for BIDS nodes */}
        <input
            ref={bidsFileInputRef}
            type="file"
            webkitdirectory=""
            style={{ display: 'none' }}
            onChange={handleBIDSDirectorySelected}
        />

        {/* BIDS Data Modal */}
        <BIDSDataModal
            show={showBIDSModal}
            onClose={handleBIDSModalClose}
            bidsStructure={bidsModalNodeId ? nodeMap.get(bidsModalNodeId)?.data?.bidsStructure : null}
        />
      </div>
  );
}

export default WorkflowCanvas;
