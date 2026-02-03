import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import ActionsBar from './components/actionsBar';
import HeaderBar from './components/headerBar';
import WorkflowMenu from './components/workflowMenu';
import ToggleWorkflowBar from './components/toggleWorkflowBar';
import WorkflowCanvas from './components/workflowCanvas'
import WorkflowNameInput from './components/workflowNameInput';
import Footer from "./components/footer";
import { useWorkspaces } from './hooks/useWorkspaces';
import { useGenerateWorkflow } from './hooks/generateWorkflow';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/background.css';

function App() {
    const {
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        addNewWorkspace,
        clearCurrentWorkspace,
        updateCurrentWorkspaceItems,
        removeCurrentWorkspace,
        updateWorkspaceName
    } = useWorkspaces();

    const currentWorkflowName = workspaces[currentWorkspace]?.name || '';

    // This state will eventually hold a function returned by WorkflowCanvas
    const [getWorkflowData, setGetWorkflowData] = useState(null);

    const { generateWorkflow } = useGenerateWorkflow();

    return (
        <div>
            <div className="app-layout">
                <HeaderBar />
                <div className="toolbar-row">
                    <ActionsBar
                        onNewWorkspace={addNewWorkspace}
                        onClearWorkspace={clearCurrentWorkspace}
                        onRemoveWorkspace={removeCurrentWorkspace}
                        workspaceCount={workspaces.length}
                        // On click, we pass our function to generateWorkflow
                        onGenerateWorkflow={() => generateWorkflow(getWorkflowData, currentWorkflowName)}
                    />
                    <WorkflowNameInput
                        name={currentWorkflowName}
                        onNameChange={updateWorkspaceName}
                    />
                </div>
                <div className="workflow-content">
                    <div className="workflow-content-main">
                        <WorkflowMenu />
                        <WorkflowCanvas
                            workflowItems={workspaces[currentWorkspace]}
                            updateCurrentWorkspaceItems={updateCurrentWorkspaceItems}
                            onSetWorkflowData={setGetWorkflowData}
                        />
                    </div>
                    <ToggleWorkflowBar
                        current={currentWorkspace}
                        workspaces={workspaces}
                        onChange={setCurrentWorkspace}
                    />
                </div>
                <Footer />
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
