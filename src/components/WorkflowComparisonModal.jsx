import { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import '../styles/workflowComparisonModal.css';

function DiffSection({ title, children, badgeCounts, defaultExpanded }) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const totalCount = Object.values(badgeCounts).reduce((a, b) => a + b, 0);

    return (
        <div className="diff-section">
            <div className="diff-section-header" onClick={() => setExpanded(e => !e)}>
                <span className={`diff-section-chevron ${expanded ? 'expanded' : ''}`}>&#9654;</span>
                <span className="diff-section-title">{title}</span>
                {badgeCounts.added > 0 && (
                    <span className="diff-count-badge added">+{badgeCounts.added}</span>
                )}
                {badgeCounts.removed > 0 && (
                    <span className="diff-count-badge removed">-{badgeCounts.removed}</span>
                )}
                {badgeCounts.modified > 0 && (
                    <span className="diff-count-badge modified">~{badgeCounts.modified}</span>
                )}
                {totalCount === 0 && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #888)' }}>
                        No changes
                    </span>
                )}
            </div>
            {expanded && totalCount > 0 && (
                <div className="diff-section-body">{children}</div>
            )}
        </div>
    );
}

function ValueDisplay({ saved, current }) {
    return (
        <div className="diff-property-values">
            <span className={`diff-value-saved ${saved == null ? 'diff-value-empty' : ''}`}>
                {saved ?? '(none)'}
            </span>
            <span className="diff-value-arrow">&#8594;</span>
            <span className={`diff-value-current ${current == null ? 'diff-value-empty' : ''}`}>
                {current ?? '(none)'}
            </span>
        </div>
    );
}

function SubChanges({ subChanges }) {
    if (!subChanges || subChanges.length === 0) return null;
    return (
        <div className="diff-sub-changes">
            {subChanges.map(sc => (
                <div key={sc.key} className="diff-sub-change">
                    <span className="diff-sub-key">{sc.key}</span>
                    {sc.type === 'added' ? (
                        <>
                            <span className="diff-value-arrow">+</span>
                            <span className="diff-sub-value-current">{sc.current}</span>
                        </>
                    ) : sc.type === 'removed' ? (
                        <>
                            <span className="diff-value-arrow">-</span>
                            <span className="diff-sub-value-saved">{sc.saved}</span>
                        </>
                    ) : (
                        <>
                            <span className="diff-sub-value-saved">{sc.saved}</span>
                            <span className="diff-value-arrow">&#8594;</span>
                            <span className="diff-sub-value-current">{sc.current}</span>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}

function formatScatterMethod(method) {
    if (!method) return null;
    const labels = { dotproduct: 'Dot Product', flat_crossproduct: 'Flat Cross Product', nested_crossproduct: 'Nested Cross Product' };
    return labels[method] || method;
}

const MERGE_METHOD_LABELS = { merge_flattened: 'Merge Flattened', merge_nested: 'Merge Nested' };

function formatMergeMethodLabel(method) {
    return MERGE_METHOD_LABELS[method] || method;
}

function formatLinkMerge(overrides) {
    if (!overrides || typeof overrides !== 'object') return null;
    const entries = Object.entries(overrides).filter(([, v]) => v);
    if (entries.length === 0) return null;
    return entries.map(([k, v]) => `${k}: ${formatMergeMethodLabel(v)}`).join(', ');
}

/** Property display configs by node type. */
const IO_DISPLAY_PROPS = [
    { key: 'notes', label: 'Notes' },
];
const BIDS_DISPLAY_PROPS = [
    { key: 'notes', label: 'Notes' },
    { key: 'bidsSelections', label: 'BIDS Selections', isObject: true },
];
const OPERATIONAL_DISPLAY_PROPS = [
    { key: 'dockerVersion', label: 'Docker Version' },
    { key: 'parameters', label: 'Parameters', isObject: true },
    { key: 'whenExpression', label: 'Conditional' },
    { key: 'expressions', label: 'Expressions', isObject: true },
    { key: 'scatterInputs', label: 'Scatter' },
    { key: 'scatterMethod', label: 'Scatter Method' },
    { key: 'linkMergeOverrides', label: 'Multiple Input', isObject: true },
    { key: 'operationOrder', label: 'Operation Order' },
    { key: 'notes', label: 'Notes' },
];

function getDisplayProps(node) {
    if (node.isBIDS) return BIDS_DISPLAY_PROPS;
    if (node.isDummy) return IO_DISPLAY_PROPS;
    return OPERATIONAL_DISPLAY_PROPS;
}

function getNodeTypeLabel(node) {
    if (node.isBIDS) return 'BIDS Node';
    if (node.isDummy) return 'I/O Node';
    return null;
}

function formatSimpleValue(key, value) {
    if (value === undefined || value === null) return null;
    if (key === 'scatterInputs') {
        if (!Array.isArray(value) || value.length === 0) return null;
        return value.join(', ');
    }
    if (key === 'scatterMethod') return formatScatterMethod(value);
    if (typeof value === 'string' && value.trim() === '') return null;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function objectToSubChanges(value, changeType, propKey) {
    if (!value || typeof value !== 'object') return [];
    const entries = Object.entries(value).filter(([, v]) => v !== undefined && v !== null && v !== '');
    const isLinkMerge = propKey === 'linkMergeOverrides';
    return entries.map(([k, v]) => {
        const formatted = isLinkMerge ? formatMergeMethodLabel(v) : (typeof v === 'object' ? JSON.stringify(v) : String(v));
        return {
            key: k,
            ...(changeType === 'added' ? { current: formatted } : { saved: formatted }),
            type: changeType,
        };
    });
}

function NodeCard({ node, type }) {
    const cardClass = `diff-card diff-card-${type}`;
    const nodeTypeLabel = getNodeTypeLabel(node);

    if (type === 'added' || type === 'removed') {
        const displayProps = getDisplayProps(node);
        const properties = [];
        for (const { key, label, isObject } of displayProps) {
            if (isObject) {
                const subs = objectToSubChanges(node[key], type === 'added' ? 'added' : 'removed', key);
                if (subs.length > 0) properties.push({ displayName: label, subChanges: subs });
            } else {
                const formatted = formatSimpleValue(key, node[key]);
                if (formatted) properties.push({ displayName: label, value: formatted });
            }
        }
        return (
            <div className={cardClass}>
                <div className="diff-card-title">{node.label}</div>
                {nodeTypeLabel && <div className="diff-card-summary">{nodeTypeLabel}</div>}
                {properties.length > 0 && (
                    <div className="diff-property-list">
                        {properties.map(p => (
                            <div key={p.displayName} className="diff-property-row">
                                <span className="diff-property-label">{p.displayName}</span>
                                {p.subChanges ? (
                                    <SubChanges subChanges={p.subChanges} />
                                ) : (
                                    <span className={type === 'added' ? 'diff-value-current' : 'diff-value-saved'}>{p.value}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Modified node
    const modifiedLabel = node.savedLabel !== node.label
        ? <>{node.savedLabel} <span className="diff-value-arrow">&#8594;</span> {node.label}</>
        : node.label;
    const modifiedTypeLabel = getNodeTypeLabel(node);

    return (
        <div className={cardClass}>
            <div className="diff-card-title">{modifiedLabel}</div>
            {modifiedTypeLabel && <div className="diff-card-summary">{modifiedTypeLabel}</div>}
            <div className="diff-property-list">
                {node.changes.map(change => (
                    <div key={change.property} className="diff-property-row">
                        <span className="diff-property-label">{change.displayName}</span>
                        {change.subChanges ? (
                            <SubChanges subChanges={change.subChanges} />
                        ) : (
                            <ValueDisplay saved={change.saved} current={change.current} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function EdgeCard({ edge, type }) {
    const cardClass = `diff-card diff-card-${type}`;
    const title = `${edge.sourceLabel} → ${edge.targetLabel}`;

    if (type === 'added' || type === 'removed') {
        const mappings = edge.data?.mappings || [];
        return (
            <div className={cardClass}>
                <div className="diff-card-title">{title}</div>
                {mappings.length > 0 && (
                    <div className="diff-mapping-list">
                        {mappings.map((m, i) => (
                            <div key={i} className="diff-mapping-item">
                                {m.sourceOutput} → {m.targetInput}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Modified edge
    return (
        <div className={cardClass}>
            <div className="diff-card-title">{title}</div>
            <div className="diff-property-list">
                {edge.changes.map((change, i) => (
                    <div key={i} className="diff-property-row">
                        <span className="diff-property-label">{change.property}</span>
                        {change.property === 'mappings' ? (
                            <div>
                                <div style={{ marginBottom: 4 }}>
                                    <span className="diff-value-saved" style={{ maxWidth: '100%' }}>
                                        {(change.saved || []).map(m => `${m.sourceOutput} → ${m.targetInput}`).join(', ') || '(none)'}
                                    </span>
                                </div>
                                <span className="diff-value-arrow" style={{ display: 'block', margin: '2px 0' }}>&#8595;</span>
                                <div>
                                    <span className="diff-value-current" style={{ maxWidth: '100%' }}>
                                        {(change.current || []).map(m => `${m.sourceOutput} → ${m.targetInput}`).join(', ') || '(none)'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <ValueDisplay saved={change.saved} current={change.current} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function WorkflowComparisonModal({ show, onHide, diffData, onRevert, onSave, savedName }) {
    if (!diffData) return null;

    const nodeTotal = diffData.nodes.added.length + diffData.nodes.removed.length + diffData.nodes.modified.length;
    const edgeTotal = diffData.edges.added.length + diffData.edges.removed.length + diffData.edges.modified.length;

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            size="xl"
            className="workflow-comparison-modal"
        >
            <Modal.Header>
                <Modal.Title>Staged Changes: {savedName}</Modal.Title>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="diff-save-btn" onClick={onSave}>
                        Update Workflow
                    </button>
                    <button className="diff-revert-btn" onClick={onRevert}>
                        Revert Changes
                    </button>
                </div>
            </Modal.Header>
            <Modal.Body>
                {!diffData.hasDifferences ? (
                    <div className="diff-no-changes">No differences found.</div>
                ) : (
                    <>
                        {/* Metadata Changes */}
                        {diffData.metadata.length > 0 && (
                            <DiffSection
                                title="Metadata"
                                badgeCounts={{ added: 0, removed: 0, modified: diffData.metadata.length }}
                                defaultExpanded={true}
                            >
                                {diffData.metadata.map(m => (
                                    <div key={m.field} className="diff-metadata-row">
                                        <span className="diff-metadata-field">{m.field}</span>
                                        <ValueDisplay saved={m.saved || '(empty)'} current={m.current || '(empty)'} />
                                    </div>
                                ))}
                            </DiffSection>
                        )}

                        {/* Node Changes */}
                        <DiffSection
                            title="Nodes"
                            badgeCounts={{
                                added: diffData.nodes.added.length,
                                removed: diffData.nodes.removed.length,
                                modified: diffData.nodes.modified.length,
                            }}
                            defaultExpanded={nodeTotal > 0}
                        >
                            {diffData.nodes.added.length > 0 && (
                                <>
                                    <div className="diff-subsection-header added">Added ({diffData.nodes.added.length})</div>
                                    {diffData.nodes.added.map(n => <NodeCard key={n.id} node={n} type="added" />)}
                                </>
                            )}
                            {diffData.nodes.removed.length > 0 && (
                                <>
                                    <div className="diff-subsection-header removed">Removed ({diffData.nodes.removed.length})</div>
                                    {diffData.nodes.removed.map(n => <NodeCard key={n.id} node={n} type="removed" />)}
                                </>
                            )}
                            {diffData.nodes.modified.length > 0 && (
                                <>
                                    <div className="diff-subsection-header modified">Modified ({diffData.nodes.modified.length})</div>
                                    {diffData.nodes.modified.map(n => <NodeCard key={n.id} node={n} type="modified" />)}
                                </>
                            )}
                        </DiffSection>

                        {/* Edge Changes */}
                        <DiffSection
                            title="Edges"
                            badgeCounts={{
                                added: diffData.edges.added.length,
                                removed: diffData.edges.removed.length,
                                modified: diffData.edges.modified.length,
                            }}
                            defaultExpanded={edgeTotal > 0}
                        >
                            {diffData.edges.added.length > 0 && (
                                <>
                                    <div className="diff-subsection-header added">Added ({diffData.edges.added.length})</div>
                                    {diffData.edges.added.map(e => <EdgeCard key={e.id} edge={e} type="added" />)}
                                </>
                            )}
                            {diffData.edges.removed.length > 0 && (
                                <>
                                    <div className="diff-subsection-header removed">Removed ({diffData.edges.removed.length})</div>
                                    {diffData.edges.removed.map(e => <EdgeCard key={e.id} edge={e} type="removed" />)}
                                </>
                            )}
                            {diffData.edges.modified.length > 0 && (
                                <>
                                    <div className="diff-subsection-header modified">Modified ({diffData.edges.modified.length})</div>
                                    {diffData.edges.modified.map(e => <EdgeCard key={e.id} edge={e} type="modified" />)}
                                </>
                            )}
                        </DiffSection>
                    </>
                )}
            </Modal.Body>
        </Modal>
    );
}
