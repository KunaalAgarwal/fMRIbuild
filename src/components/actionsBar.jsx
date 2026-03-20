import '../styles/actionsBar.css';
import '../styles/workflowItem.css';

const ActionsBar = ({
    onNewWorkspace,
    onClearWorkspace,
    onRemoveWorkspace,
    workspaceCount,
    onGenerateWorkflow,
    onSaveWorkflow,
    onRevertWorkflow,
    isSavedWorkflow,
    workflowHasChanges,
}) => {
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
            <button className="actions-button" onClick={onRemoveWorkspace} disabled={workspaceCount === 1}>
                Remove Workspace
            </button>
            <div className="separator"></div>
            {isSavedWorkflow ? (
                <button className="actions-button btn-revert" onClick={onRevertWorkflow} disabled={!workflowHasChanges}>
                    Staged Changes
                </button>
            ) : (
                <button className="actions-button btn-save" onClick={onSaveWorkflow}>
                    Save Workflow
                </button>
            )}
            <div className="separator"></div>
            <button className="actions-button btn-generate" onClick={onGenerateWorkflow}>
                Generate Workflow
            </button>
        </div>
    );
};

export default ActionsBar;
