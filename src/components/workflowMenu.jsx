import React, { useState } from 'react';
import WorkflowMenuItem from './workflowMenuItem';
import { toolsByModality, modalityOrder, libraryOrder, dummyNodes } from '../data/toolData';
import '../styles/workflowMenu.css';

function WorkflowMenu() {
  const [expandedSections, setExpandedSections] = useState(() => {
    const initial = { DummyNodes: false };
    modalityOrder.forEach(m => { initial[m] = false; });
    return initial;
  });

  const toggleSection = (key) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleDragStart = (event, name, isDummy = false) => {
    event.dataTransfer.setData('node/name', name);
    event.dataTransfer.setData('node/isDummy', isDummy.toString());
  };

  // Count total tools across all libraries/categories in a modality
  const getModalityToolCount = (modality) => {
    const modalityData = toolsByModality[modality];
    if (!modalityData) return 0;
    let count = 0;
    for (const libraries of Object.values(modalityData)) {
      for (const tools of Object.values(libraries)) {
        count += tools.length;
      }
    }
    return count;
  };

  // Count tools in a specific library within a modality
  const getLibraryToolCount = (modalityData, library) => {
    const libraryData = modalityData[library];
    if (!libraryData) return 0;
    return Object.values(libraryData).reduce((sum, tools) => sum + tools.length, 0);
  };

  return (
    <div className="workflow-menu-container">
      <div className="workflow-menu">
        {/* I/O (Dummy Nodes) Section */}
        <div className="library-section">
          <div
            className={`library-header ${expandedSections['DummyNodes'] ? 'expanded' : ''}`}
            onClick={() => toggleSection('DummyNodes')}
          >
            <span className="chevron">{expandedSections['DummyNodes'] ? '▼' : '▶'}</span>
            <span className="library-name">I/O</span>
            <span className="tool-count">2</span>
          </div>

          {expandedSections['DummyNodes'] && (
            <div className="library-tools">
              <div className="subsection-tools">
                {dummyNodes['I/O'].map((tool, index) => (
                  <WorkflowMenuItem
                    key={`dummy-${index}`}
                    name={tool.name}
                    toolInfo={{
                      fullName: tool.fullName,
                      function: tool.function,
                      typicalUse: tool.typicalUse
                    }}
                    onDragStart={(event, name) => handleDragStart(event, name, true)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modality Sections */}
        {modalityOrder.map((modality) => {
          const modalityData = toolsByModality[modality];
          const isModalityExpanded = expandedSections[modality];
          const modalityToolCount = getModalityToolCount(modality);
          const libraries = modalityData ? Object.keys(modalityData) : [];

          // Sort libraries by libraryOrder
          const sortedLibraries = libraries.sort((a, b) => {
            const aIdx = libraryOrder.indexOf(a);
            const bIdx = libraryOrder.indexOf(b);
            return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
          });

          if (modalityToolCount === 0) return null;

          return (
            <div key={modality} className="modality-section">
              <div
                className={`modality-header ${isModalityExpanded ? 'expanded' : ''}`}
                onClick={() => toggleSection(modality)}
              >
                <span className="chevron">{isModalityExpanded ? '▼' : '▶'}</span>
                <span className="modality-name">{modality}</span>
                <span className="tool-count">{modalityToolCount}</span>
              </div>

              {isModalityExpanded && (
                <div className="modality-content">
                  {sortedLibraries.map((library) => {
                    const libraryData = modalityData[library];
                    const libraryKey = `${modality}::${library}`;
                    const isLibraryExpanded = expandedSections[libraryKey];
                    const libraryToolCount = getLibraryToolCount(modalityData, library);
                    const categories = Object.keys(libraryData || {});

                    if (libraryToolCount === 0) return null;

                    return (
                      <div key={libraryKey} className="library-section">
                        <div
                          className={`library-header ${isLibraryExpanded ? 'expanded' : ''}`}
                          onClick={() => toggleSection(libraryKey)}
                        >
                          <span className="chevron">{isLibraryExpanded ? '▼' : '▶'}</span>
                          <span className="library-name">{library}</span>
                          <span className="tool-count">{libraryToolCount}</span>
                        </div>

                        {isLibraryExpanded && (
                          <div className="library-tools">
                            {categories.map((category) => (
                              <div key={category} className="subsection">
                                <div className="subsection-header">{category}</div>
                                <div className="subsection-tools">
                                  {libraryData[category].map((tool, index) => (
                                    <WorkflowMenuItem
                                      key={`${libraryKey}-${category}-${index}`}
                                      name={tool.name}
                                      toolInfo={{
                                        fullName: tool.fullName,
                                        function: tool.function,
                                        modality: tool.modality,
                                        keyParameters: tool.keyParameters,
                                        keyPoints: tool.keyPoints,
                                        typicalUse: tool.typicalUse,
                                        docUrl: tool.docUrl
                                      }}
                                      onDragStart={handleDragStart}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WorkflowMenu;
