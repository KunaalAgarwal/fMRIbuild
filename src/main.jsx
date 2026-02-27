import { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import ActionsBar from './components/actionsBar';
import HeaderBar from './components/headerBar';
import WorkflowMenu from './components/workflowMenu';
import ToggleWorkflowBar from './components/toggleWorkflowBar';
import WorkflowCanvas from './components/workflowCanvas'
import OutputNameInput from './components/outputNameInput';
import WorkflowNameInput from './components/workflowNameInput';
import Footer from "./components/footer";
import CWLPreviewPanel from './components/CWLPreviewPanel';
import { useWorkspaces } from './hooks/useWorkspaces';
import { useGenerateWorkflow } from './hooks/generateWorkflow';
import { ToastProvider, useToast } from './context/ToastContext.jsx';
import { CustomWorkflowsProvider, useCustomWorkflowsContext } from './context/CustomWorkflowsContext.jsx';
import { TOOL_ANNOTATIONS } from './utils/toolAnnotations.js';
import { preloadAllCWL } from './utils/cwlParser.js';
import { invalidateMergeCache } from './utils/toolRegistry.js';
import { topoSort } from './utils/topoSort.js';

import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/background.css';

/** Get the Set of IDs for dummy nodes (supports both flat and data-nested shapes). */
const getDummyIds = (nodes) =>
    new Set(nodes.filter(n => n.isDummy || n.data?.isDummy).map(n => n.id));

/**
 * Compute boundary nodes (first/last non-dummy in topological order)
 * for a set of internal nodes and edges.
 */
function computeBoundaryNodes(nodes, edges) {
    const nonDummyNodes = nodes.filter(n => !n.isDummy && !n.data?.isDummy);
    if (nonDummyNodes.length === 0) return { firstNonDummy: null, lastNonDummy: null };

    const dummyIds = getDummyIds(nodes);
    const realEdges = edges.filter(e => !dummyIds.has(e.source) && !dummyIds.has(e.target));

    let order;
    try { order = topoSort(nonDummyNodes, realEdges); } catch { return { firstNonDummy: null, lastNonDummy: null }; }

    const nodeById = new Map(nonDummyNodes.map(n => [n.id, n]));
    const firstNode = nodeById.get(order[0]);
    const lastNode = nodeById.get(order[order.length - 1]);

    return {
        firstNonDummy: firstNode?.label || firstNode?.data?.label || null,
        lastNonDummy: lastNode?.label || lastNode?.data?.label || null
    };
}

/**
 * Serialize workspace nodes for saving as a custom workflow.
 * Strips non-serializable data (callbacks) and normalizes shape.
 */
function serializeNodes(nodes) {
    return nodes.map(n => ({
        id: n.id,
        label: n.data?.label || n.label || '',
        isDummy: n.data?.isDummy || n.isDummy || false,
        isBIDS: n.data?.isBIDS || false,
        bidsStructure: n.data?.bidsStructure || null,
        bidsSelections: n.data?.bidsSelections || null,
        notes: n.data?.notes || '',
        parameters: n.data?.parameters || {},
        dockerVersion: n.data?.dockerVersion || 'latest',
        scatterInputs: n.data?.scatterInputs,
        linkMergeOverrides: n.data?.linkMergeOverrides || {},
        whenExpression: n.data?.whenExpression || '',
        expressions: n.data?.expressions || {},
        position: n.position || { x: 0, y: 0 }
    }));
}

function serializeEdges(edges) {
    return edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: { mappings: e.data?.mappings || [] }
    }));
}

/**
 * Compare workspace content against a saved custom workflow (ignoring node positions).
 * Returns true if there are differences (unsaved changes).
 */
function hasUnsavedChanges(workspace, savedWorkflow) {
    if (!workspace || !savedWorkflow) return false;

    const wsNodes = serializeNodes(workspace.nodes || []).map(({ position, ...rest }) => rest);
    const savedNodes = savedWorkflow.nodes.map(({ position, ...rest }) => rest);

    const wsEdges = serializeEdges(workspace.edges || []);
    const savedEdges = serializeEdges(savedWorkflow.edges || []);

    return JSON.stringify(wsNodes) !== JSON.stringify(savedNodes) ||
           JSON.stringify(wsEdges) !== JSON.stringify(savedEdges);
}

/**
 * Validate internal edges of a workflow before saving.
 * Returns true if any validation warnings exist.
 */
// Disabled — adjacency matrix has too many cross-modality false positives;
// type/extension validation in EdgeMappingModal is sufficient.
function validateWorkflowEdges(/* nodes, edges */) {
    return false;
}

function App() {
    const {
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        addNewWorkspace,
        addNewWorkspaceWithData,
        clearCurrentWorkspace,
        updateCurrentWorkspaceItems,
        removeCurrentWorkspace,
        updateWorkspaceName,
        updateWorkflowName,
        updateSavedWorkflowId,
        removeWorkflowNodesFromAll,
        saveViewportForWorkspace
    } = useWorkspaces();

    const currentOutputName = workspaces[currentWorkspace]?.name || '';
    const currentWorkflowName = workspaces[currentWorkspace]?.workflowName || '';
    const savedWorkflowId = workspaces[currentWorkspace]?.savedWorkflowId || null;

    // This state will eventually hold a function returned by WorkflowCanvas
    const [getWorkflowData, setGetWorkflowData] = useState(null);
    const [cwlReady, setCwlReady] = useState(false);

    const { generateWorkflow } = useGenerateWorkflow();
    const { showError, showSuccess, showWarning, showInfo } = useToast();
    const { saveWorkflow, updateWorkflow, deleteWorkflow, getNextDefaultName, customWorkflows } = useCustomWorkflowsContext();

    // Preload all CWL files on mount so getToolConfigSync() works synchronously
    useEffect(() => {
        const cwlPaths = Object.values(TOOL_ANNOTATIONS)
            .map(ann => ann.cwlPath)
            .filter(Boolean);
        preloadAllCWL(cwlPaths)
            .then(() => {
                invalidateMergeCache();
                setCwlReady(true);
            })
            .catch(err => {
                console.error('[App] CWL preload failed:', err);
                showError('Failed to load tool definitions. Some tools may not work correctly.');
                setCwlReady(true); // still allow rendering so the app isn't stuck
            });
    }, []);

    const handleDeleteWorkflow = useCallback((wfId) => {
        deleteWorkflow(wfId);
        removeWorkflowNodesFromAll(wfId);
    }, [deleteWorkflow, removeWorkflowNodesFromAll]);

    const handleSaveAsCustomNode = useCallback(() => {
        if (!getWorkflowData) {
            showError('No workflow data available to save.');
            return;
        }

        const data = getWorkflowData();
        if (!data || !data.nodes || data.nodes.length === 0) {
            showError('Cannot save an empty workspace as a custom node.');
            return;
        }

        // Need at least 1 non-dummy node
        const nonDummyNodes = data.nodes.filter(n => !n.data?.isDummy);
        if (nonDummyNodes.length === 0) {
            showError('Cannot save a workspace with only I/O nodes as a custom node.');
            return;
        }

        // Use the workflow name from the input, or auto-generate one
        const name = currentWorkflowName.trim() || getNextDefaultName();

        // Serialize nodes and edges (strip callbacks)
        const serializedNodes = serializeNodes(data.nodes);
        const serializedEdges = serializeEdges(data.edges);

        // Validate
        const hasWarnings = validateWorkflowEdges(serializedNodes, serializedEdges);
        if (hasWarnings) {
            showWarning('Workflow has connection warnings but will still be saved.');
        }

        // Compute boundary nodes
        const boundaryNodes = computeBoundaryNodes(serializedNodes, serializedEdges);

        const workflowData = {
            name,
            nodes: serializedNodes,
            edges: serializedEdges,
            hasValidationWarnings: hasWarnings,
            boundaryNodes
        };

        if (savedWorkflowId) {
            // Workspace is bound — update existing workflow by ID
            updateWorkflow(savedWorkflowId, workflowData);
            showSuccess(`Updated custom node "${name}"`);
        } else {
            // New save — create and bind
            const { result, id } = saveWorkflow(workflowData);
            updateSavedWorkflowId(id);
            if (result === 'updated') {
                showSuccess(`Updated custom node "${name}"`);
            } else {
                showSuccess(`Saved as custom node "${name}"`);
            }
        }

        // If the workflow name input was empty, auto-fill it with the generated name
        if (!currentWorkflowName.trim()) {
            updateWorkflowName(name);
        }
    }, [getWorkflowData, currentWorkflowName, savedWorkflowId, saveWorkflow, updateWorkflow, updateSavedWorkflowId, getNextDefaultName, showError, showSuccess, showWarning, updateWorkflowName]);

    const handleWorkflowNameChange = useCallback((newName) => {
        updateWorkflowName(newName);
        // If workspace is bound to a saved workflow, rename it in-place
        if (savedWorkflowId) {
            updateWorkflow(savedWorkflowId, { name: newName });
        }
    }, [savedWorkflowId, updateWorkflowName, updateWorkflow]);

    const handleWorkspaceSwitch = useCallback((newIndex) => {
        // Warn if leaving a workspace with unsaved custom workflow changes
        const currentWs = workspaces[currentWorkspace];
        const currentWfName = currentWs?.workflowName?.trim();
        if (currentWfName) {
            const savedWf = customWorkflows.find(w => w.name === currentWfName);
            if (savedWf && hasUnsavedChanges(currentWs, savedWf)) {
                showWarning(`Workflow "${currentWfName}" has unsaved changes`);
            }
        }

        // Notify if arriving at a workspace editing a custom workflow
        const targetWs = workspaces[newIndex];
        const targetWfName = targetWs?.workflowName?.trim();
        if (targetWfName) {
            const targetSaved = customWorkflows.find(w => w.name === targetWfName);
            if (targetSaved) {
                showInfo(`Editing custom workflow "${targetWfName}"`);
            }
        }

        setCurrentWorkspace(newIndex);
    }, [workspaces, currentWorkspace, customWorkflows, setCurrentWorkspace, showWarning, showInfo]);

    const handleEditWorkflow = useCallback((workflow) => {
        // Check if this workflow is already open in an existing workspace
        const existingIndex = workspaces.findIndex(ws => ws.savedWorkflowId === workflow.id);
        if (existingIndex !== -1) {
            handleWorkspaceSwitch(existingIndex);
            return;
        }

        // Convert serialized nodes back to canvas format
        const nodes = workflow.nodes.map(n => ({
            id: n.id,
            type: 'default',
            data: {
                label: n.label,
                isDummy: n.isDummy,
                isBIDS: n.isBIDS || false,
                bidsStructure: n.bidsStructure || null,
                bidsSelections: n.bidsSelections || null,
                notes: n.notes || '',
                parameters: n.parameters || {},
                dockerVersion: n.dockerVersion || 'latest',
                scatterInputs: n.scatterInputs,
                linkMergeOverrides: n.linkMergeOverrides || {},
                whenExpression: n.whenExpression || '',
                expressions: n.expressions || {},
            },
            position: n.position || { x: 0, y: 0 },
        }));

        const edges = workflow.edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            data: e.data || { mappings: [] },
        }));

        addNewWorkspaceWithData({
            nodes,
            edges,
            workflowName: workflow.name,
            savedWorkflowId: workflow.id
        });
        showInfo(`Editing "${workflow.name}" in new workspace`);
    }, [addNewWorkspaceWithData, showInfo, workspaces, handleWorkspaceSwitch]);

    const saveButtonLabel = savedWorkflowId ? 'Update Workflow' : 'Save Workflow';

    return (
            <div className="app-layout">
                <HeaderBar />
                <div className="toolbar-row">
                    <ActionsBar
                        onNewWorkspace={addNewWorkspace}
                        onClearWorkspace={clearCurrentWorkspace}
                        onRemoveWorkspace={removeCurrentWorkspace}
                        workspaceCount={workspaces.length}
                        onGenerateWorkflow={() => generateWorkflow(getWorkflowData, currentOutputName)}
                        onSaveWorkflow={handleSaveAsCustomNode}
                        saveButtonLabel={saveButtonLabel}
                    />
                    <div className="workflow-names-container">
                        <OutputNameInput
                            name={currentOutputName}
                            onNameChange={updateWorkspaceName}
                        />
                        <WorkflowNameInput
                            name={currentWorkflowName}
                            onNameChange={handleWorkflowNameChange}
                            placeholder={getNextDefaultName()}
                        />
                    </div>
                </div>
                <div className="workflow-content">
                    <div className="workflow-content-main">
                        <WorkflowMenu onEditWorkflow={handleEditWorkflow} onDeleteWorkflow={handleDeleteWorkflow} />
                        {cwlReady ? (
                            <WorkflowCanvas
                                workflowItems={workspaces[currentWorkspace]}
                                updateCurrentWorkspaceItems={updateCurrentWorkspaceItems}
                                onSetWorkflowData={setGetWorkflowData}
                                currentWorkspaceIndex={currentWorkspace}
                                saveViewportForWorkspace={saveViewportForWorkspace}
                            />
                        ) : (
                            <div className="workflow-canvas-loading" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                Loading tool definitions…
                            </div>
                        )}
                        <CWLPreviewPanel
                            getWorkflowData={getWorkflowData}
                        />
                    </div>
                    <ToggleWorkflowBar
                        current={currentWorkspace}
                        workspaces={workspaces}
                        onChange={handleWorkspaceSwitch}
                    />
                </div>
                <Footer />
            </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <ToastProvider>
        <CustomWorkflowsProvider>
            <App />
        </CustomWorkflowsProvider>
    </ToastProvider>
);
