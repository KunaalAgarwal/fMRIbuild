import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import '../styles/workflowMenuItem.css';

function WorkflowMenuItem({ name, toolInfo, onDragStart }) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const itemRef = useRef(null);

  const getFontSizeClass = (name) => {
    if (name.length > 18) return 'font-smaller';
    if (name.length > 10) return 'font-small';
    return '';
  };

  const handleMouseEnter = () => {
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top + rect.height / 2,
        left: rect.right + 10
      });
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleDoubleClick = () => {
    if (toolInfo?.docUrl) {
      window.open(toolInfo.docUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const fontSizeClass = getFontSizeClass(name);

  return (
    <div
      ref={itemRef}
      className={`workflow-menu-item ${fontSizeClass}`}
      draggable
      onDragStart={(event) => onDragStart(event, name)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
    >
      <span className="tool-name">{name}</span>

      {toolInfo && isHovered && createPortal(
        <div
          className="workflow-tooltip"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translateY(-50%)'
          }}
        >
          {toolInfo.fullName && (
            <div className="tooltip-section tooltip-fullname">
              <span className="tooltip-text">{toolInfo.fullName}</span>
            </div>
          )}
          <div className="tooltip-section">
            <span className="tooltip-label">Function:</span>
            <span className="tooltip-text">{toolInfo.function}</span>
          </div>
          <div className="tooltip-section">
            <span className="tooltip-label">Typical Use:</span>
            <span className="tooltip-text">{toolInfo.typicalUse}</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default WorkflowMenuItem;
