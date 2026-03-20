import React, { useState, useEffect } from 'react';
import '../styles/outputNameInput.css';

function WorkflowNameInput({ name, onNameChange, placeholder }) {
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
            <span className="name-input-label">Name</span>
            <div className="name-input-wrapper">
                <input
                    type="text"
                    className="name-input-field"
                    value={localName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={placeholder || 'Custom Workflow 1'}
                    maxLength={50}
                />
            </div>
        </div>
    );
}

export default WorkflowNameInput;
