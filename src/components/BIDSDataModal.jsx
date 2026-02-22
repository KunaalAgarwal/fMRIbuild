import { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal, Button } from 'react-bootstrap';
import '../styles/bidsDataModal.css';

/**
 * Auto-generate an output port label from a selection group config.
 */
function autoLabel(group) {
  const parts = [group.suffix || group.datatype];
  if (group.task && group.task !== 'all') parts.push(group.task);
  return parts.join('_').toLowerCase();
}

/**
 * Generate a unique group ID.
 */
let groupIdCounter = 0;
function nextGroupId() {
  return `grp_${++groupIdCounter}`;
}

/**
 * BIDSDataModal — 3-level hierarchical selector for BIDS dataset inputs.
 *
 * Level 1: Subject selection (left panel)
 * Level 2: Data type / modality selection (right top)
 * Level 3: Output groups with suffix/task/run filters (right bottom)
 */
const BIDSDataModal = ({ show, onClose, bidsStructure }) => {
  // --- Subject selection state ---
  const [selectedSubjects, setSelectedSubjects] = useState(new Set());
  const [subjectSearch, setSubjectSearch] = useState('');

  // --- Data type selection state ---
  const [selectedDataTypes, setSelectedDataTypes] = useState(new Set());

  // --- Output groups state ---
  const [outputGroups, setOutputGroups] = useState([]);

  // --- Path preview toggle ---
  const [showPreview, setShowPreview] = useState(false);

  // Derived: all subject IDs
  const allSubjectIds = useMemo(() => {
    if (!bidsStructure?.subjects) return [];
    return Object.keys(bidsStructure.subjects).sort();
  }, [bidsStructure]);

  // Derived: participants demographics
  const participants = useMemo(() => {
    return bidsStructure?.participants || {};
  }, [bidsStructure]);

  // Initialize state when modal opens
  useEffect(() => {
    if (show && bidsStructure) {
      // Default: select all subjects
      setSelectedSubjects(new Set(allSubjectIds));
      setSubjectSearch('');
      setShowPreview(false);

      // Discover all data types across all subjects
      const allDatatypes = new Set();
      for (const sub of Object.values(bidsStructure.subjects)) {
        for (const ses of Object.values(sub.sessions)) {
          for (const dt of Object.keys(ses)) {
            allDatatypes.add(dt);
          }
        }
      }
      setSelectedDataTypes(new Set(allDatatypes));

      // Create one default output group per data type with all unique suffixes
      const groups = [];
      for (const dt of [...allDatatypes].sort()) {
        const suffixes = new Set();
        const tasks = new Set();
        for (const sub of Object.values(bidsStructure.subjects)) {
          for (const ses of Object.values(sub.sessions)) {
            if (!ses[dt]) continue;
            for (const f of ses[dt]) {
              suffixes.add(f.suffix);
              if (f.entities.task) tasks.add(f.entities.task);
            }
          }
        }
        // One group per unique suffix in this datatype
        for (const suffix of [...suffixes].sort()) {
          const group = {
            id: nextGroupId(),
            datatype: dt,
            suffix,
            task: 'all',
            run: 'all',
            includeEvents: dt === 'func' && suffix === 'bold',
            extractSidecarParams: [],
            label: '',
          };
          group.label = autoLabel(group);
          groups.push(group);
        }
      }
      setOutputGroups(groups);
    }
  }, [show, bidsStructure, allSubjectIds]);

  // Derived: data type availability across selected subjects
  const datatypeAvailability = useMemo(() => {
    if (!bidsStructure?.subjects) return new Map();
    const counts = new Map();
    for (const subId of selectedSubjects) {
      const sub = bidsStructure.subjects[subId];
      if (!sub) continue;
      const seen = new Set();
      for (const ses of Object.values(sub.sessions)) {
        for (const dt of Object.keys(ses)) seen.add(dt);
      }
      for (const dt of seen) {
        counts.set(dt, (counts.get(dt) || 0) + 1);
      }
    }
    return counts;
  }, [bidsStructure, selectedSubjects]);

  // Derived: all available datatypes (across all subjects, not just selected)
  const allDatatypes = useMemo(() => {
    if (!bidsStructure?.subjects) return [];
    const dts = new Set();
    for (const sub of Object.values(bidsStructure.subjects)) {
      for (const ses of Object.values(sub.sessions)) {
        for (const dt of Object.keys(ses)) dts.add(dt);
      }
    }
    return [...dts].sort();
  }, [bidsStructure]);

  // Derived: available suffixes and tasks per selected datatype
  const availableFilters = useMemo(() => {
    if (!bidsStructure?.subjects) return {};
    const result = {};
    for (const dt of selectedDataTypes) {
      const suffixes = new Set();
      const tasks = new Set();
      const runs = new Set();
      for (const subId of selectedSubjects) {
        const sub = bidsStructure.subjects[subId];
        if (!sub) continue;
        for (const ses of Object.values(sub.sessions)) {
          if (!ses[dt]) continue;
          for (const f of ses[dt]) {
            suffixes.add(f.suffix);
            if (f.entities.task) tasks.add(f.entities.task);
            if (f.entities.run) runs.add(f.entities.run);
          }
        }
      }
      result[dt] = {
        suffixes: [...suffixes].sort(),
        tasks: [...tasks].sort(),
        runs: [...runs].sort(),
      };
    }
    return result;
  }, [bidsStructure, selectedSubjects, selectedDataTypes]);

  // Derived: resolve file paths for preview
  const resolvedPaths = useMemo(() => {
    if (!bidsStructure?.subjects) return [];
    const paths = [];
    for (const group of outputGroups) {
      for (const subId of selectedSubjects) {
        const sub = bidsStructure.subjects[subId];
        if (!sub) continue;
        for (const ses of Object.values(sub.sessions)) {
          if (!ses[group.datatype]) continue;
          for (const f of ses[group.datatype]) {
            if (f.suffix !== group.suffix) continue;
            if (group.task && group.task !== 'all' && f.entities.task !== group.task) continue;
            if (group.run && group.run !== 'all' && f.entities.run !== group.run) continue;
            paths.push({ group: group.label, path: f.relativePath });
          }
        }
      }
    }
    return paths;
  }, [bidsStructure, selectedSubjects, outputGroups]);

  // --- Subject handlers ---
  const toggleSubject = useCallback((subId) => {
    setSelectedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subId)) next.delete(subId); else next.add(subId);
      return next;
    });
  }, []);

  const toggleAllSubjects = useCallback(() => {
    setSelectedSubjects(prev =>
      prev.size === allSubjectIds.length ? new Set() : new Set(allSubjectIds)
    );
  }, [allSubjectIds]);

  // --- Data type handlers ---
  const toggleDataType = useCallback((dt) => {
    setSelectedDataTypes(prev => {
      const next = new Set(prev);
      if (next.has(dt)) {
        next.delete(dt);
        // Remove output groups for this datatype
        setOutputGroups(groups => groups.filter(g => g.datatype !== dt));
      } else {
        next.add(dt);
      }
      return next;
    });
  }, []);

  // --- Output group handlers ---
  const updateGroup = useCallback((groupId, updates) => {
    setOutputGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const updated = { ...g, ...updates };
      // Auto-update label if user hasn't customized it
      if (!updates.label && updates.suffix !== undefined) {
        updated.label = autoLabel(updated);
      }
      return updated;
    }));
  }, []);

  const removeGroup = useCallback((groupId) => {
    setOutputGroups(prev => prev.filter(g => g.id !== groupId));
  }, []);

  const addGroup = useCallback(() => {
    const dt = [...selectedDataTypes][0] || 'anat';
    const filters = availableFilters[dt] || {};
    const suffix = (filters.suffixes || [])[0] || 'T1w';
    const group = {
      id: nextGroupId(),
      datatype: dt,
      suffix,
      task: 'all',
      run: 'all',
      includeEvents: false,
      extractSidecarParams: [],
      label: '',
    };
    group.label = autoLabel(group);
    setOutputGroups(prev => [...prev, group]);
  }, [selectedDataTypes, availableFilters]);

  // --- Save handler ---
  const handleSave = useCallback(() => {
    if (outputGroups.length === 0) {
      onClose(null);
      return;
    }

    // Detect whether all subjects are selected
    const allSelected = selectedSubjects.size === allSubjectIds.length;

    const selections = {};
    for (const group of outputGroups) {
      const sel = {
        datatype: group.datatype,
        suffix: group.suffix,
        subjects: allSelected ? 'all' : [...selectedSubjects].sort(),
        sessions: 'all',
      };
      if (group.task && group.task !== 'all') sel.task = group.task;
      if (group.run && group.run !== 'all') sel.run = group.run;
      if (group.includeEvents) sel.include_events = true;
      if (group.extractSidecarParams.length > 0) {
        sel.extract_sidecar_params = group.extractSidecarParams;
      }
      selections[group.label] = sel;
    }

    onClose({
      selections,
      datasetName: bidsStructure?.datasetName || '',
      bidsVersion: bidsStructure?.bidsVersion || '',
    });
  }, [outputGroups, selectedSubjects, allSubjectIds, bidsStructure, onClose]);

  // --- Filtered subject list ---
  const filteredSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return allSubjectIds;
    const q = subjectSearch.toLowerCase();
    return allSubjectIds.filter(id => {
      if (id.toLowerCase().includes(q)) return true;
      const demo = participants[id];
      if (demo) {
        return Object.values(demo).some(v =>
          String(v).toLowerCase().includes(q)
        );
      }
      return false;
    });
  }, [allSubjectIds, subjectSearch, participants]);

  if (!bidsStructure) return null;

  return (
    <Modal
      show={show}
      onHide={() => onClose(null)}
      centered
      size="lg"
      className="bids-modal"
    >
      <Modal.Header closeButton>
        <div>
          <Modal.Title>{bidsStructure.datasetName || 'BIDS Dataset'}</Modal.Title>
          {bidsStructure.bidsVersion && (
            <div className="modal-subtitle">BIDS v{bidsStructure.bidsVersion}</div>
          )}
        </div>
      </Modal.Header>

      <Modal.Body>
        <div className="bids-panels">
          {/* ---- Level 1: Subject Panel ---- */}
          <div className="bids-subject-panel">
            <div className="bids-subject-header">
              <button className="bids-select-all-btn" onClick={toggleAllSubjects}>
                {selectedSubjects.size === allSubjectIds.length ? 'Deselect all' : 'Select all'}
              </button>
              <span className="bids-subject-count">
                {selectedSubjects.size}/{allSubjectIds.length}
              </span>
            </div>

            <input
              className="bids-search-input"
              type="text"
              placeholder="Search subjects..."
              value={subjectSearch}
              onChange={e => setSubjectSearch(e.target.value)}
            />

            <div className="bids-subject-list">
              {filteredSubjects.map(subId => {
                const demo = participants[subId];
                const demoStr = demo
                  ? Object.entries(demo).map(([k, v]) => `${k}: ${v}`).join(', ')
                  : '';
                return (
                  <div
                    key={subId}
                    className="bids-subject-row"
                    onClick={() => toggleSubject(subId)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubjects.has(subId)}
                      onChange={() => {}}
                    />
                    <span className="bids-subject-id">{subId}</span>
                    {demoStr && (
                      <span className="bids-subject-demo" title={demoStr}>
                        {demoStr}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---- Right panel ---- */}
          <div className="bids-right-panel">
            {/* ---- Level 2: Data Types ---- */}
            <div className="bids-datatype-section">
              <div className="bids-section-label">Data Types</div>
              <div className="bids-datatype-grid">
                {allDatatypes.map(dt => {
                  const count = datatypeAvailability.get(dt) || 0;
                  const isSelected = selectedDataTypes.has(dt);
                  const isAvailable = count > 0;
                  return (
                    <div
                      key={dt}
                      className={`bids-datatype-chip${isSelected ? ' selected' : ''}${!isAvailable ? ' unavailable' : ''}`}
                      onClick={() => isAvailable && toggleDataType(dt)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!isAvailable}
                        onChange={() => {}}
                      />
                      <span>{dt}</span>
                      <span className="bids-availability-badge">
                        ({count}/{selectedSubjects.size})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ---- Level 3: Output Groups ---- */}
            <div className="bids-outputs-section">
              <div className="bids-section-label">Output Ports</div>

              {outputGroups.length === 0 && (
                <div className="bids-empty-state">
                  Select a data type to create output groups
                </div>
              )}

              {outputGroups.map(group => {
                const filters = availableFilters[group.datatype] || {};
                const isFunc = group.datatype === 'func';

                return (
                  <div key={group.id} className="bids-output-group">
                    <div className="bids-output-header">
                      <input
                        className="bids-output-label-input"
                        value={group.label}
                        onChange={e => updateGroup(group.id, { label: e.target.value })}
                        placeholder="output label"
                      />
                      <span className="bids-output-type-badge">File[]</span>
                      <button
                        className="bids-remove-group-btn"
                        onClick={() => removeGroup(group.id)}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="bids-output-filters">
                      {/* Datatype selector */}
                      <span className="bids-filter-label">Type:</span>
                      <select
                        className="bids-filter-select"
                        value={group.datatype}
                        onChange={e => {
                          const newDt = e.target.value;
                          const newFilters = availableFilters[newDt] || {};
                          const newSuffix = (newFilters.suffixes || [])[0] || '';
                          updateGroup(group.id, {
                            datatype: newDt,
                            suffix: newSuffix,
                            task: 'all',
                            run: 'all',
                          });
                        }}
                      >
                        {[...selectedDataTypes].sort().map(dt => (
                          <option key={dt} value={dt}>{dt}</option>
                        ))}
                      </select>

                      {/* Suffix selector */}
                      <span className="bids-filter-label">Suffix:</span>
                      <select
                        className="bids-filter-select"
                        value={group.suffix}
                        onChange={e => updateGroup(group.id, { suffix: e.target.value })}
                      >
                        {(filters.suffixes || []).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>

                      {/* Task filter (func only) */}
                      {isFunc && (filters.tasks || []).length > 0 && (
                        <>
                          <span className="bids-filter-label">Task:</span>
                          <select
                            className="bids-filter-select"
                            value={group.task}
                            onChange={e => updateGroup(group.id, { task: e.target.value })}
                          >
                            <option value="all">all</option>
                            {filters.tasks.map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </>
                      )}

                      {/* Run filter */}
                      {(filters.runs || []).length > 1 && (
                        <>
                          <span className="bids-filter-label">Run:</span>
                          <select
                            className="bids-filter-select"
                            value={group.run}
                            onChange={e => updateGroup(group.id, { run: e.target.value })}
                          >
                            <option value="all">all</option>
                            {filters.runs.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </>
                      )}

                      {/* Include events (func bold only) */}
                      {isFunc && group.suffix === 'bold' && (
                        <label className="bids-filter-check">
                          <input
                            type="checkbox"
                            checked={group.includeEvents}
                            onChange={e => updateGroup(group.id, { includeEvents: e.target.checked })}
                          />
                          events.tsv
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}

              {selectedDataTypes.size > 0 && (
                <button className="bids-add-group-btn" onClick={addGroup}>
                  + Add output group
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ---- Path Preview ---- */}
        <div className="bids-path-preview">
          <div
            className="bids-preview-toggle"
            onClick={() => setShowPreview(prev => !prev)}
          >
            <span>{showPreview ? '\u25BC' : '\u25B6'}</span>
            <span>Preview resolved paths ({resolvedPaths.length} files)</span>
          </div>

          {showPreview && (
            <div className="bids-preview-list">
              {resolvedPaths.slice(0, 30).map((p, i) => (
                <div key={i} className="bids-preview-path">
                  <span style={{ color: 'var(--color-cyan)' }}>[{p.group}]</span>{' '}
                  {p.path}
                </div>
              ))}
              {resolvedPaths.length > 30 && (
                <div className="bids-preview-more">
                  ...and {resolvedPaths.length - 30} more
                </div>
              )}
              {resolvedPaths.length === 0 && (
                <div className="bids-preview-path" style={{ fontStyle: 'italic' }}>
                  No files match current selections
                </div>
              )}
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button className="btn-cancel" onClick={() => onClose(null)}>
          Cancel
        </Button>
        <Button
          className="btn-save"
          onClick={handleSave}
          disabled={outputGroups.length === 0}
        >
          Save ({outputGroups.length} output{outputGroups.length !== 1 ? 's' : ''})
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default BIDSDataModal;
