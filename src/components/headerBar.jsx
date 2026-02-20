import React, { useState } from 'react';
import { Modal } from 'react-bootstrap';
import '../styles/headerBar.css';

function HeaderBar(){
    const [showInfo, setShowInfo] = useState(false);

    const handleShowInfo = () => setShowInfo(true);
    const handleCloseInfo = () => setShowInfo(false);

    return (
        <div className="header-bar">
            <h1>niBuild</h1>
            {/*ℹ️ */}
            <span className="header-span" onClick={handleShowInfo}>[how-to]</span>
            <a className="header-span header-link" href="https://github.com/KunaalAgarwal/niBuild" target="_blank">[github]</a>
            <a className="header-span header-link" href="https://github.com/KunaalAgarwal/niBuild/issues" target="_blank">[issues]</a>
            <Modal className="custom-modal" show={showInfo} onHide={handleCloseInfo} centered>
                <Modal.Body className="modal-label header-modal">
                    <div style={{ lineHeight: '1.8' }}>
                        <strong style={{ fontSize: '1.05em' }}>Building Your Workflow</strong>
                        <ul style={{ paddingLeft: '20px', marginBottom: '12px', marginTop: '4px' }}>
                            <li>Drag tools from the left-side menu onto the canvas.</li>
                            <li>Hover over a tool in the menu to see its function and typical use case.</li>
                            <li>Double-click a tool in the menu to open its official documentation.</li>
                            <li>Use the search bar to filter tools by name, function, or modality (e.g., type "MRI/" to filter by modality).</li>
                        </ul>

                        <strong style={{ fontSize: '1.05em' }}>Connecting & Configuring Nodes</strong>
                        <ul style={{ paddingLeft: '20px', marginBottom: '12px', marginTop: '4px' }}>
                            <li>Draw a connection between two nodes to open the mapping modal, where you map outputs to inputs.</li>
                            <li>Double-click an edge to modify its output-to-input mappings.</li>
                            <li>Double-click a node to configure optional parameters (thresholds, flags, etc.) and Docker image version.</li>
                            <li>Enable "Scatter (Batch Processing)" on a source node to run a step once per input file — downstream nodes inherit this automatically.</li>
                        </ul>

                        <strong style={{ fontSize: '1.05em' }}>CWL Preview</strong>
                        <ul style={{ paddingLeft: '20px', marginBottom: '12px', marginTop: '4px' }}>
                            <li>The right-side panel shows a live preview of your generated CWL workflow and job template.</li>
                            <li>Toggle between the .cwl and .yml tabs, copy to clipboard, or expand to fullscreen.</li>
                            <li>Collapse or expand the panel using the toggle button.</li>
                        </ul>

                        <strong style={{ fontSize: '1.05em' }}>Advanced Workflow Features</strong>
                        <ul style={{ paddingLeft: '20px', marginBottom: '12px', marginTop: '4px' }}>
                            <li><strong>Multiple Inputs</strong> — Connect multiple edges to the same input on a node to merge upstream outputs. Choose a merge strategy (flattened or nested) in the parameter modal.</li>
                            <li><strong>Conditional Steps</strong> — Double-click a node and set a "when" expression (e.g., <code>$(inputs.run_step == true)</code>) to conditionally skip a step at runtime. Skipped steps produce null outputs.</li>
                            <li><strong>Expressions</strong> — Click the <em>fx</em> button next to any parameter to transform its value with a CWL expression. Type just the expression body (e.g., <code>self / 2.355</code>) — the <code>$(…)</code> wrapper is added automatically. For scalar parameters (numbers, strings), <code>self</code> is the raw value. For File parameters, <code>self</code> is a File object with properties like <code>self.nameroot</code>, <code>self.basename</code>, and <code>self.dirname</code>. Pick from the template dropdown for common patterns.</li>
                        </ul>

                        <strong style={{ fontSize: '1.05em' }}>Managing Your Work</strong>
                        <ul style={{ paddingLeft: '20px', marginBottom: '12px', marginTop: '4px' }}>
                            <li>Select a node or edge and press Delete to remove it.</li>
                            <li>Organize workflows using multiple named workspaces, saved automatically in browser storage.</li>
                            <li>Click "Generate Workflow" to download a <code>.crate.zip</code> bundle containing:</li>
                        </ul>
                        <ul style={{ paddingLeft: '36px', marginBottom: '0', marginTop: '0', listStyleType: 'disc' }}>
                            <li>A CWL workflow file and pre-filled job template with your parameter values.</li>
                            <li>Tool CWL definitions with pinned Docker image versions.</li>
                            <li>A Dockerfile and run script for one-command execution via Docker.</li>
                            <li>A README with setup instructions for Docker and cwltool.</li>
                            <li>RO-Crate metadata for reproducibility and discovery on WorkflowHub.</li>
                        </ul>
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
}

export default HeaderBar;
