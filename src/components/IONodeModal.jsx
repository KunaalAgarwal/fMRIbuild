import { useState, useEffect } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import '../styles/ioNodeModal.css';

function IONodeModal({ show, onHide, label, notes, onSave }) {
    const [nameValue, setNameValue] = useState(label || '');
    const [notesValue, setNotesValue] = useState(notes || '');

    // Sync state when modal opens with new data
    useEffect(() => {
        if (show) {
            setNameValue(label || '');
            setNotesValue(notes || '');
        }
    }, [show, label, notes]);

    const handleSave = () => {
        onSave({
            label: nameValue.trim() || label,
            notes: notesValue,
        });
        onHide();
    };

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            size="sm"
            className="io-node-modal"
        >
            <Modal.Header>
                <Modal.Title>Edit I/O Node</Modal.Title>
            </Modal.Header>
            <Modal.Body onClick={(e) => e.stopPropagation()}>
                <Form>
                    <Form.Group className="io-modal-field">
                        <Form.Label className="io-modal-label">Name</Form.Label>
                        <Form.Control
                            type="text"
                            value={nameValue}
                            onChange={(e) => setNameValue(e.target.value)}
                            className="io-modal-input"
                            placeholder="Node name"
                            autoFocus
                        />
                    </Form.Group>
                    <Form.Group className="io-modal-field">
                        <Form.Label className="io-modal-label">Notes</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={4}
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            className="io-modal-textarea"
                            placeholder="Add notes about this node..."
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="primary" onClick={handleSave}>Save</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default IONodeModal;
