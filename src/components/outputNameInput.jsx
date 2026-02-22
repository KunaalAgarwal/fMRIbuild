import React, { useState, useEffect } from 'react';
import '../styles/outputNameInput.css';

function OutputNameInput({ name, onNameChange }) {
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
    <div className="name-input-row">
      <span className="name-input-label">Output</span>
      <div className="name-input-wrapper">
        <input
          type="text"
          className="name-input-field"
          value={localName}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="main"
          maxLength={50}
        />
        <span className="name-input-suffix">.cwl</span>
      </div>
    </div>
  );
}

export default OutputNameInput;
