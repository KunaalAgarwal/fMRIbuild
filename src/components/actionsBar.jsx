import '../styles/actionsBar.css';
import '../styles/workflowItem.css';


const ActionsBar = ({ onNewWorkspace, onClearWorkspace, onRemoveWorkspace, workspaceCount, onGenerateWorkflow, onSaveWorkflow, saveButtonLabel, onRevertWorkflow, showRevert, workflowHasChanges }) => {
    const isUpdate = saveButtonLabel === 'Update Workflow';
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
            <button
                className="actions-button btn-save"
                onClick={onSaveWorkflow}
                disabled={isUpdate && !workflowHasChanges}
            >
                {saveButtonLabel || 'Save Workflow'}
            </button>
            {showRevert && (
                <>
                    <div className="separator"></div>
                    <button
                        className="actions-button btn-revert"
                        onClick={onRevertWorkflow}
                        disabled={!workflowHasChanges}
                    >
                        Revert Changes
                    </button>
                </>
            )}
            <div className="separator"></div>
            <button className="actions-button btn-generate" onClick={onGenerateWorkflow}>
                Generate Workflow
            </button>
        </div>
    );
};

export default ActionsBar;
