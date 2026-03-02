import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import IONodeModal from './IONodeModal.jsx';
import OutputConfigModal from './OutputConfigModal.jsx';
import { labelFontSize } from './nodeUtils.js';

/**
 * Renders I/O dummy nodes (Input/Output) with green-styled 3-row layout.
 */
const IONodeComponent = ({ data, id, isScatterInherited, isGatherNode, propagatedIds }) => {
    const [showIOModal, setShowIOModal] = useState(false);
    const [showOutputConfigModal, setShowOutputConfigModal] = useState(false);

    const isOutputNode = data.isOutputNode === true || data.label === 'Output';
    const outputCount = isOutputNode && data.selectedOutputs
        ? Object.values(data.selectedOutputs).filter(Boolean).length
        : null;

    return (
        <>
            <div className="node-wrapper node-io" onDoubleClick={() => setShowIOModal(true)}>
                <div className="node-top-row">
                    <span className="node-version-spacer"></span>
                    <span className="node-info-spacer"></span>
                </div>
                <div className="node-content">
                    <Handle type="target" position={Position.Left} />
                    <span className="handle-label">IN</span>
                    <span className="node-label" style={{ fontSize: labelFontSize(data.displayLabel || data.label) }}>{data.displayLabel || data.label}</span>
                    <span className="handle-label">OUT</span>
                    <Handle type="source" position={Position.Right} />
                </div>
                <div className="node-bottom-row">
                    <span className="node-bottom-left">
                        {isScatterInherited && <span className="node-scatter-badge">&#x21BB;</span>}
                        {isGatherNode && <span className="node-gather-badge">G</span>}
                        {data.whenExpression && <span className="node-when-badge">?</span>}
                        {data.expressions && Object.keys(data.expressions).length > 0 && <span className="node-fx-badge">fx</span>}
                        {data.notes && <span className="node-notes-badge">N</span>}
                    </span>
                    {isOutputNode ? (
                        <span
                            className="node-output-config-btn"
                            onClick={(e) => { e.stopPropagation(); setShowOutputConfigModal(true); }}
                        >
                            {outputCount !== null ? `config (${outputCount})` : 'config'}
                        </span>
                    ) : (
                        <span className="node-info-spacer"></span>
                    )}
                </div>
            </div>
            <IONodeModal
                show={showIOModal}
                onHide={() => setShowIOModal(false)}
                label={data.label}
                notes={data.notes || ''}
                onSave={(updated) => data.onSaveIO?.(updated)}
            />
            {isOutputNode && (
                <OutputConfigModal
                    show={showOutputConfigModal}
                    onHide={() => setShowOutputConfigModal(false)}
                    outputNodeId={id}
                    outputNodeData={data}
                    scatteredNodeIds={propagatedIds}
                    onSave={(updated) => data.onSaveOutputConfig?.(updated)}
                />
            )}
        </>
    );
};

export default IONodeComponent;
