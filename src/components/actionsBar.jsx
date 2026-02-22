import '../styles/actionsBar.css';
import '../styles/workflowItem.css';


const ActionsBar = ({ onNewWorkspace, onClearWorkspace, onRemoveWorkspace, workspaceCount, onGenerateWorkflow, onSaveWorkflow, saveButtonLabel }) => {
    return (
        <div className="actions-bar" style={{ position: 'relative' }}>
            <button className="actions-button" onClick={onNewWorkspace}>
                New Workspace
            </button>
            <div className="separator"></div>
            <button className="actions-button" onClick={onClearWorkspace}>
                Clear Workspace
            </button>
            <div className="separator"></div>
            <button
                className="actions-button"
                onClick={onRemoveWorkspace}
                disabled={workspaceCount === 1}
            >
                Remove Workspace
            </button>
            <div className="separator"></div>
            <button className="actions-button btn-save" onClick={onSaveWorkflow}>
                {saveButtonLabel || 'Save Workflow'}
            </button>
            <div className="separator"></div>
            <button className="actions-button btn-generate" onClick={onGenerateWorkflow}>
                Generate Workflow
            </button>
        </div>
    );
};

export default ActionsBar;
