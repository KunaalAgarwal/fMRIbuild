import React, { useState, useEffect } from 'react';
import '../styles/workflowNameInput.css';

function WorkflowNameInput({ name, onNameChange }) {
  const [localName, setLocalName] = useState(name || '');

  useEffect(() => {
    setLocalName(name || '');
  }, [name]);

  const handleChange = (e) => {
    const newName = e.target.value;
    setLocalName(newName);
    onNameChange(newName);
  };

  const handleBlur = () => {
    const trimmedName = localName.trim();
    setLocalName(trimmedName);
    onNameChange(trimmedName);
  };

  return (
    <div className="workflow-name-container">
      <div className="workflow-name-input-wrapper">
        <input
          type="text"
          className="workflow-name-input"
          value={localName}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="main"
          maxLength={50}
        />
        <span className="workflow-name-suffix">.cwl</span>
      </div>
    </div>
  );
}

export default WorkflowNameInput;
