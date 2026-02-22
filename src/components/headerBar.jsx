import React, { useState } from 'react';
import { Modal, Accordion } from 'react-bootstrap';
import '../styles/headerBar.css';

const SECTIONS = [
    { key: "0", title: "Getting Started" },
    { key: "1", title: "CWL Basics" },
    { key: "2", title: "Tool Menu & Search" },
    { key: "3", title: "Building a Workflow" },
    { key: "4", title: "Connecting Nodes" },
    { key: "5", title: "Configuring Parameters" },
    { key: "6", title: "Scatter, Conditions & Expressions" },
    { key: "7", title: "BIDS Integration" },
    { key: "8", title: "Custom Workflows" },
    { key: "9", title: "CWL Preview Panel" },
    { key: "10", title: "Workspaces & Export" },
];

function HeaderBar() {
    const [showInfo, setShowInfo] = useState(false);
    const [activeKey, setActiveKey] = useState("0");

    return (
        <div className="header-bar">
            <h1>niBuild</h1>
            <span className="header-span" onClick={() => setShowInfo(true)}>[how-to]</span>
            <a className="header-span header-link" href="https://github.com/KunaalAgarwal/niBuild" target="_blank" rel="noopener noreferrer">[github]</a>
            <a className="header-span header-link" href="https://github.com/KunaalAgarwal/niBuild/issues" target="_blank" rel="noopener noreferrer">[issues]</a>

            <Modal
                className="howto-modal"
                show={showInfo}
                onHide={() => setShowInfo(false)}
                size="xl"
                centered
                scrollable
            >
                <Modal.Header closeButton>
                    <Modal.Title>niBuild User Manual</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Quick Navigation */}
                    <div className="howto-nav">
                        {SECTIONS.map(s => (
                            <span
                                key={s.key}
                                className={`howto-nav-item${activeKey === s.key ? ' active' : ''}`}
                                onClick={() => setActiveKey(s.key)}
                            >
                                {s.title}
                            </span>
                        ))}
                    </div>

                    <Accordion activeKey={activeKey} onSelect={setActiveKey}>
                        {/* 0 — Getting Started */}
                        <Accordion.Item eventKey="0">
                            <Accordion.Header>Getting Started</Accordion.Header>
                            <Accordion.Body>
                                <p className="howto-section-intro">
                                    niBuild is a browser-based visual workflow builder for neuroimaging analysis.
                                    Design processing pipelines by dragging tools onto a canvas, configure parameters,
                                    and export a self-contained bundle with{' '}
                                    <a className="howto-link" href="https://www.commonwl.org/v1.2/" target="_blank" rel="noopener noreferrer">CWL</a>{' '}
                                    workflows, Docker/Singularity containers, and FAIR-compliant metadata.
                                </p>
                                <div className="howto-subheading">Interface Layout</div>
                                <ul className="howto-list">
                                    <li><strong>Tool Menu</strong> (left) &mdash; Browse and search 100+ neuroimaging tools organized by imaging modality and software library.</li>
                                    <li><strong>Canvas</strong> (center) &mdash; Drag-and-drop workspace where you build your pipeline by connecting processing steps.</li>
                                    <li><strong>CWL Preview</strong> (right) &mdash; Live-updating preview of the generated CWL workflow and job template.</li>
                                    <li><strong>Actions Bar</strong> (top) &mdash; Workspace management, workflow saving, and export controls.</li>
                                    <li><strong>Workspace Bar</strong> (bottom) &mdash; Switch between multiple independent workflow canvases.</li>
                                </ul>
                                <div className="howto-tip">
                                    <strong>Tip:</strong> No installation required. niBuild runs entirely in your browser and all data stays local.
                                </div>
                            </Accordion.Body>
                        </Accordion.Item>

                        {/* 1 — CWL Basics */}
                        <Accordion.Item eventKey="1">
                            <Accordion.Header>CWL Basics</Accordion.Header>
                            <Accordion.Body>
                                <p className="howto-section-intro">
                                    <a className="howto-link" href="https://www.commonwl.org/v1.2/" target="_blank" rel="noopener noreferrer">CWL (Common Workflow Language)</a>{' '}
                                    is an open standard for describing computational workflows. niBuild generates CWL v1.2 workflows that can be executed by any CWL-compliant engine
                                    (e.g., <a className="howto-link" href="https://github.com/common-workflow-language/cwltool" target="_blank" rel="noopener noreferrer">cwltool</a>,{' '}
                                    <a className="howto-link" href="https://toil.ucsc-cgl.org/" target="_blank" rel="noopener noreferrer">Toil</a>,{' '}
                                    <a className="howto-link" href="https://www.arvados.org/" target="_blank" rel="noopener noreferrer">Arvados</a>).
                                </p>
                                <div className="howto-subheading">Key Concepts</div>
                                <ul className="howto-list">
                                    <li><strong>Workflow</strong> &mdash; A directed graph of processing steps. Each step runs a command-line tool inside a Docker container. niBuild generates one <code className="howto-code">.cwl</code> workflow file for your entire pipeline.</li>
                                    <li><strong>Step</strong> &mdash; A single processing operation (e.g., brain extraction, registration). Each node on the niBuild canvas becomes a step in the CWL workflow.</li>
                                    <li><strong>CommandLineTool</strong> &mdash; The CWL definition for a single tool, specifying its Docker image, command-line arguments, inputs, and outputs. niBuild includes pre-built <code className="howto-code">.cwl</code> files for every tool.</li>
                                    <li><strong>Inputs &amp; Outputs</strong> &mdash; Each step declares typed inputs it consumes and outputs it produces. Connections on the canvas wire outputs of one step to inputs of the next.</li>
                                    <li><strong>Job Template</strong> &mdash; A <code className="howto-code">.yml</code> file that provides concrete values for the workflow's top-level inputs (file paths, parameter values). niBuild pre-fills this with your configured parameters.</li>
                                </ul>
                                <div className="howto-subheading">CWL Data Types</div>
                                <p className="howto-section-intro">
                                    CWL uses a typed system for inputs and outputs. niBuild handles type matching automatically when you connect nodes:
                                </p>
                                <ul className="howto-list">
                                    <li><code className="howto-code">File</code> &mdash; A file path (e.g., a NIfTI image). Most neuroimaging tool inputs and outputs are Files.</li>
                                    <li><code className="howto-code">Directory</code> &mdash; A directory path (e.g., a FreeSurfer subjects directory).</li>
                                    <li><code className="howto-code">string</code> &mdash; A text value (e.g., a subject ID or output prefix).</li>
                                    <li><code className="howto-code">int</code> / <code className="howto-code">float</code> &mdash; Numeric values (e.g., a smoothing kernel size or a threshold).</li>
                                    <li><code className="howto-code">boolean</code> &mdash; A true/false flag (e.g., whether to generate a brain mask).</li>
                                    <li><code className="howto-code">enum</code> &mdash; One of a fixed set of values (e.g., a cost function or interpolation method).</li>
                                    <li><code className="howto-code">File[]</code> / <code className="howto-code">string[]</code> &mdash; Arrays of the above types, used with scatter (batch processing).</li>
                                </ul>
                                <div className="howto-subheading">How niBuild Maps to CWL</div>
                                <table className="howto-table">
                                    <thead>
                                        <tr><th>niBuild</th><th>CWL</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr><td>Node on canvas</td><td>Workflow step</td></tr>
                                        <tr><td>Edge between nodes</td><td>Step input wiring (<code className="howto-code">source:</code>)</td></tr>
                                        <tr><td>Parameter value in modal</td><td>Step input <code className="howto-code">default:</code> value</td></tr>
                                        <tr><td>Docker version selector</td><td><code className="howto-code">dockerPull:</code> image tag</td></tr>
                                        <tr><td>Workflow Input node</td><td>Top-level workflow input</td></tr>
                                        <tr><td>Workflow Output node</td><td>Top-level workflow output</td></tr>
                                        <tr><td>Scatter toggle</td><td><code className="howto-code">scatter:</code> directive on step</td></tr>
                                        <tr><td>When expression</td><td><code className="howto-code">when:</code> condition on step</td></tr>
                                    </tbody>
                                </table>
                                <div className="howto-subheading">Docker Containers</div>
                                <p className="howto-section-intro">
                                    Every tool in niBuild runs inside a Docker container, ensuring reproducibility regardless of the host system.
                                    Each library has its own Docker image. When you select a Docker version in the parameter modal, you're pinning
                                    the exact software version that will be used at runtime. The exported bundle includes all container references
                                    and scripts to pre-pull images.
                                </p>
                            </Accordion.Body>
                        </Accordion.Item>

                        {/* 2 — Tool Menu & Search */}
                        <Accordion.Item eventKey="2">
                            <Accordion.Header>Tool Menu & Search</Accordion.Header>
                            <Accordion.Body>
                                <p className="howto-section-intro">
                                    The left sidebar contains all available neuroimaging tools organized hierarchically: first by <strong>imaging modality</strong>, then by <strong>software library</strong>, then by <strong>functional category</strong>.
                                </p>
                                <ol className="howto-steps">
                                    <li>Click a modality header to expand it and see the libraries within.</li>
                                    <li>Expand a library to see individual tools grouped by category.</li>
                                    <li>Hover over any tool to see a tooltip with its full name, function description, expected input, key parameters, and typical use case.</li>
                                    <li>Double-click a tool in the menu to open its official documentation in a new tab.</li>
                                    <li>Drag a tool from the menu and drop it onto the canvas to add it to your workflow.</li>
                                </ol>

                                <div className="howto-subheading">Imaging Modalities</div>
                                <p className="howto-section-intro">Tools are organized into 7 imaging modalities:</p>
                                <ul className="howto-list">
                                    <li><strong>Structural MRI</strong> &mdash; T1/T2-weighted imaging for brain anatomy. Tools for skull-stripping, tissue segmentation, cortical reconstruction, and spatial registration.</li>
                                    <li><strong>Functional MRI</strong> &mdash; BOLD-contrast imaging for brain activity. Tools for motion correction, slice timing, spatial smoothing, temporal filtering, and statistical modeling.</li>
                                    <li><strong>Diffusion MRI</strong> &mdash; Diffusion-weighted imaging (DWI) for white matter microstructure. Tools for eddy current correction, tensor fitting, tractography, and connectivity analysis.</li>
                                    <li><strong>Arterial Spin Labeling (ASL)</strong> &mdash; Non-invasive perfusion imaging using magnetically labeled blood. Tools for cerebral blood flow (CBF) quantification and partial volume correction.</li>
                                    <li><strong>PET</strong> &mdash; Positron Emission Tomography for molecular imaging. Tools for kinetic modeling, partial volume correction, and tracer-specific quantification.</li>
                                    <li><strong>Multimodal</strong> &mdash; Cross-modality analysis pipelines. Tools that integrate structural, functional, and diffusion data for comprehensive brain mapping.</li>
                                    <li><strong>Utilities</strong> &mdash; General-purpose neuroimaging utilities for format conversion, image math, resampling, and quality control.</li>
                                </ul>

                                <div className="howto-subheading">Software Libraries</div>
                                <p className="howto-section-intro">
                                    niBuild includes tools from 9 neuroimaging software libraries. Each library runs inside its own Docker container:
                                </p>
                                <table className="howto-table">
                                    <thead>
                                        <tr><th>Library</th><th>Docker Image</th><th>Description</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><strong>FSL</strong></td>
                                            <td><code className="howto-code">brainlife/fsl</code></td>
                                            <td>FMRIB Software Library. Comprehensive suite for structural, functional, and diffusion analysis. Includes BET, FLIRT, FAST, FEAT, MELODIC, FDT, TBSS, and more.</td>
                                        </tr>
                                        <tr>
                                            <td><strong>AFNI</strong></td>
                                            <td><code className="howto-code">brainlife/afni</code></td>
                                            <td>Analysis of Functional NeuroImages. Extensive tools for functional MRI analysis including motion correction, denoising, smoothing, statistical modeling, and connectivity.</td>
                                        </tr>
                                        <tr>
                                            <td><strong>FreeSurfer</strong></td>
                                            <td><code className="howto-code">freesurfer/freesurfer</code></td>
                                            <td>Cortical surface reconstruction and parcellation. Includes recon-all for automated cortical analysis, mri_convert for format conversion, and PET processing tools.</td>
                                        </tr>
                                        <tr>
                                            <td><strong>ANTs</strong></td>
                                            <td><code className="howto-code">antsx/ants</code></td>
                                            <td>Advanced Normalization Tools. State-of-the-art image registration (SyN), segmentation (Atropos), cortical thickness (DiReCT), and bias correction (N4).</td>
                                        </tr>
                                        <tr>
                                            <td><strong>MRtrix3</strong></td>
                                            <td><code className="howto-code">mrtrix3/mrtrix3</code></td>
                                            <td>Diffusion MRI analysis toolkit. Specializes in constrained spherical deconvolution (CSD), fiber orientation distribution (FOD) estimation, and anatomically-constrained tractography (ACT).</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Connectome Workbench</strong></td>
                                            <td><code className="howto-code">khanlab/connectome-workbench</code></td>
                                            <td>HCP Connectome tools for surface-based analysis. CIFTI file operations and surface data smoothing for cortical analysis.</td>
                                        </tr>
                                        <tr>
                                            <td><strong>fMRIPrep</strong></td>
                                            <td><code className="howto-code">nipreps/fmriprep</code></td>
                                            <td>Robust, automated fMRI preprocessing pipeline. Produces analysis-ready BOLD data with comprehensive quality reports.</td>
                                        </tr>
                                        <tr>
                                            <td><strong>MRIQC</strong></td>
                                            <td><code className="howto-code">nipreps/mriqc</code></td>
                                            <td>MRI Quality Control. Extracts image quality metrics (SNR, CNR, motion parameters) and generates visual quality reports.</td>
                                        </tr>
                                        <tr>
                                            <td><strong>AMICO</strong></td>
                                            <td><code className="howto-code">cookpa/amico-noddi</code></td>
                                            <td>Accelerated Microstructure Imaging via Convex Optimization. Fits biophysical models (NODDI) to diffusion MRI data for neurite density and orientation dispersion.</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="howto-subheading">Library Coverage by Modality</div>
                                <table className="howto-table howto-coverage-table">
                                    <thead>
                                        <tr>
                                            <th>Library</th>
                                            <th>Structural</th>
                                            <th>Functional</th>
                                            <th>Diffusion</th>
                                            <th>ASL</th>
                                            <th>PET</th>
                                            <th>Multimodal</th>
                                            <th>Utilities</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr><td>FSL</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td></td><td></td><td>&#10003;</td></tr>
                                        <tr><td>AFNI</td><td>&#10003;</td><td>&#10003;</td><td></td><td></td><td></td><td></td><td>&#10003;</td></tr>
                                        <tr><td>FreeSurfer</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td></td><td>&#10003;</td><td></td><td>&#10003;</td></tr>
                                        <tr><td>ANTs</td><td>&#10003;</td><td>&#10003;</td><td></td><td></td><td></td><td>&#10003;</td><td>&#10003;</td></tr>
                                        <tr><td>MRtrix3</td><td></td><td></td><td>&#10003;</td><td></td><td></td><td></td><td></td></tr>
                                        <tr><td>Workbench</td><td>&#10003;</td><td>&#10003;</td><td></td><td></td><td></td><td></td><td></td></tr>
                                        <tr><td>fMRIPrep</td><td></td><td>&#10003;</td><td></td><td></td><td></td><td></td><td></td></tr>
                                        <tr><td>MRIQC</td><td></td><td>&#10003;</td><td></td><td></td><td></td><td></td><td></td></tr>
                                        <tr><td>AMICO</td><td></td><td></td><td>&#10003;</td><td></td><td></td><td></td><td></td></tr>
                                    </tbody>
                                </table>

                                <div className="howto-subheading">Search</div>
                                <ul className="howto-list">
                                    <li>Type in the search bar to filter tools by name, function description, or modality.</li>
                                    <li>Use modality prefix syntax for targeted filtering:
                                        <ul className="howto-nested-list">
                                            <li><code className="howto-code">Structural MRI/</code> &mdash; shows all structural MRI tools</li>
                                            <li><code className="howto-code">MRI/bet</code> &mdash; searches for "bet" within all MRI modalities</li>
                                            <li><code className="howto-code">Diffusion/</code> &mdash; shows all diffusion tools</li>
                                        </ul>
                                    </li>
                                    <li>Custom workflows are also searchable by name or by the tools they contain.</li>
                                </ul>

                                <div className="howto-subheading">I/O Nodes</div>
                                <p className="howto-section-intro">
                                    The "I/O" section at the top of the menu contains special nodes that define pipeline entry and exit points:
                                </p>
                                <ul className="howto-list">
                                    <li><strong>Workflow Input</strong> &mdash; defines an input file or value that the user supplies when running the pipeline.</li>
                                    <li><strong>Workflow Output</strong> &mdash; marks a result that should be collected as a final output of the pipeline.</li>
                                    <li><strong>BIDS Dataset</strong> &mdash; imports files from a BIDS-compliant dataset directory (see <span className="howto-nav-ref" onClick={() => setActiveKey("7")}>BIDS Integration</span>).</li>
                                </ul>
                            </Accordion.Body>
                        </Accordion.Item>

                        {/* 3 — Building a Workflow */}
                        <Accordion.Item eventKey="3">
                            <Accordion.Header>Building a Workflow</Accordion.Header>
                            <Accordion.Body>
                                <p className="howto-section-intro">
                                    Build your pipeline by dragging tools onto the canvas and connecting them to define the data flow.
                                </p>
                                <ol className="howto-steps">
                                    <li>Drag a tool from the left-side menu and drop it onto the canvas. A node appears representing that processing step.</li>
                                    <li>Drag additional tools to add more steps to your pipeline.</li>
                                    <li>Connect two nodes by clicking and dragging from one node's output handle (bottom edge) to another node's input handle (top edge).</li>
                                    <li>When a connection is drawn, the Edge Mapping Modal opens automatically so you can map specific outputs to inputs (see <span className="howto-nav-ref" onClick={() => setActiveKey("4")}>Connecting Nodes</span>).</li>
                                </ol>
                                <div className="howto-subheading">Canvas Controls</div>
                                <ul className="howto-list">
                                    <li>Scroll to zoom in and out.</li>
                                    <li>Click and drag on empty canvas space to pan.</li>
                                    <li>Use the controls in the bottom-left corner for zoom buttons and fit-to-view.</li>
                                    <li>The minimap in the bottom-right provides an overview of your full workflow.</li>
                                </ul>
                                <div className="howto-subheading">Removing Elements</div>
                                <ul className="howto-list">
                                    <li>Click a node or edge to select it, then press the <strong>Delete</strong> key to remove it.</li>
                                    <li>Invalid connections between incompatible tools will show a warning toast explaining the reason.</li>
                                </ul>
                            </Accordion.Body>
                        </Accordion.Item>

                        {/* 4 — Connecting Nodes */}
                        <Accordion.Item eventKey="4">
                            <Accordion.Header>Connecting Nodes</Accordion.Header>
                            <Accordion.Body>
                                <p className="howto-section-intro">
                                    Connections define how data flows between processing steps. Each connection maps specific outputs of a source tool to specific inputs of a target tool.
                                </p>
                                <ol className="howto-steps">
                                    <li>Draw a connection between two nodes (or double-click an existing edge) to open the Edge Mapping Modal.</li>
                                    <li>The left column shows all available <strong>outputs</strong> from the source node. The right column shows all available <strong>inputs</strong> on the target node.</li>
                                    <li>Click an output on the left, then click an input on the right to create a mapping. A connecting line appears between them.</li>
                                    <li>Click on a connecting line to remove that mapping.</li>
                                    <li>You can create multiple mappings per edge to pass several outputs to different inputs simultaneously.</li>
                                </ol>
                                <div className="howto-subheading">Link Merge Strategy</div>
                                <p className="howto-section-intro">
                                    When multiple edges feed the same input on a node, you must choose a merge strategy. Set this in the node's parameter modal (double-click the target node):
                                </p>
                                <ul className="howto-list">
                                    <li><code className="howto-code">merge_flattened</code> &mdash; combines all upstream outputs into a single flat array, e.g. <code className="howto-code">[a, b, c]</code></li>
                                    <li><code className="howto-code">merge_nested</code> &mdash; preserves grouping per source, e.g. <code className="howto-code">[[a], [b, c]]</code></li>
                                </ul>
                                <div className="howto-subheading">Type Compatibility</div>
                                <ul className="howto-list">
                                    <li>niBuild validates type compatibility (File vs. non-File, array vs. scalar) and file extension compatibility between outputs and inputs.</li>
                                    <li>Incompatible mappings are highlighted with warnings. Only valid mappings can be saved.</li>
                                </ul>
                            </Accordion.Body>
                        </Accordion.Item>

                        {/* 5 — Configuring Parameters */}
                        <Accordion.Item eventKey="5">
                            <Accordion.Header>Configuring Parameters</Accordion.Header>
                            <Accordion.Body>
                                <p className="howto-section-intro">
                                    Double-click any node on the canvas to open its parameter configuration modal.
                                </p>
                                <div className="howto-subheading">Docker Image Version</div>
                                <p className="howto-section-intro">
                                    At the top of the modal, select or type a specific Docker image tag to pin the tool to a particular software version. This ensures reproducibility across different computing environments.
                                </p>
                                <div className="howto-subheading">Parameters</div>
                                <ul className="howto-list">
                                    <li><strong>Required parameters</strong> are shown first and must be set or wired from an upstream connection.</li>
                                    <li><strong>Optional parameters</strong> are shown below a separator and have sensible defaults.</li>
                                </ul>
                                <div className="howto-subheading">Parameter Types</div>
                                <ul className="howto-list">
                                    <li><strong>Numbers</strong> &mdash; numeric input fields, some with min/max bounds shown as placeholders.</li>
                                    <li><strong>Text</strong> &mdash; string input fields for filenames, labels, or other text values.</li>
                                    <li><strong>Booleans</strong> &mdash; toggle switches for on/off flags.</li>
                                    <li><strong>Enums</strong> &mdash; dropdown menus with predefined valid values.</li>
                                    <li><strong>Files / Directories</strong> &mdash; wired automatically from upstream connections (shown with a blue highlight and the source node name).</li>
                                </ul>
                                <div className="howto-tip">
                                    <strong>Tip:</strong> Parameters that are already wired from an upstream connection display the source node and output name. You don't need to set these manually.
                                </div>
                            </Accordion.Body>
                        </Accordion.Item>

                        {/* 6 — Scatter, Conditions & Expressions */}
                        <Accordion.Item eventKey="6">
                            <Accordion.Header>Scatter, Conditions & Expressions</Accordion.Header>
                            <Accordion.Body>
                                <div className="howto-subheading">Scatter (Batch Processing)</div>
                                <p className="howto-section-intro">
                                    Enable the "Scatter" toggle on a node to run that processing step once per input file, rather than once for all inputs combined.
                                </p>
                                <ul className="howto-list">
                                    <li>Useful for processing multiple subjects or runs in parallel.</li>
                                    <li>When enabled on the first node in a chain, scatter propagates automatically to all downstream connected nodes.</li>
                                </ul>

                                <div className="howto-subheading">Conditional Steps (When Expression)</div>
                                <p className="howto-section-intro">
                                    Add a "when" expression to conditionally execute a step at runtime.
                                </p>
                                <ol className="howto-steps">
                                    <li>Double-click a node to open its parameter modal.</li>
                                    <li>In the "When Expression" section, select a parameter from the dropdown.</li>
                                    <li>Enter a condition using a comparison operator.</li>
                                </ol>
                                <p className="howto-section-intro">
                                    Example: selecting parameter <code className="howto-code">run_step</code> with condition <code className="howto-code">== true</code> produces:
                                </p>
                                <pre className="howto-code-block">$(inputs.run_step == true)</pre>
                                <p className="howto-section-intro">
                                    When the condition evaluates to false at runtime, the step is skipped and produces null outputs.
                                </p>

                                <div className="howto-subheading">Expressions (fx)</div>
                                <p className="howto-section-intro">
                                    Click the <strong>fx</strong> button next to any parameter to transform its value with a CWL expression.
                                </p>
                                <ul className="howto-list">
                                    <li>Type only the expression body &mdash; the <code className="howto-code">$(...)</code> wrapper is added automatically.</li>
                                    <li>For <strong>scalar parameters</strong> (numbers, strings): <code className="howto-code">self</code> refers to the raw value.
                                        <ul className="howto-nested-list">
                                            <li>Example: <code className="howto-code">self / 2.355</code> converts FWHM to sigma</li>
                                        </ul>
                                    </li>
                                    <li>For <strong>File parameters</strong>: <code className="howto-code">self</code> is a File object with properties:
                                        <ul className="howto-nested-list">
                                            <li><code className="howto-code">self.nameroot</code> &mdash; filename without extension</li>
                                            <li><code className="howto-code">self.basename</code> &mdash; full filename with extension</li>
                                            <li><code className="howto-code">self.dirname</code> &mdash; parent directory path</li>
                                        </ul>
                                    </li>
                                    <li>Use the template dropdown for common expression patterns.</li>
                                </ul>
                            </Accordion.Body>
                        </Accordion.Item>

                        {/* 7 — BIDS Integration */}
                        <Accordion.Item eventKey="7">
                            <Accordion.Header>BIDS Integration</Accordion.Header>
                            <Accordion.Body>
                                <p className="howto-section-intro">
                                    <a className="howto-link" href="https://bids-specification.readthedocs.io/" target="_blank" rel="noopener noreferrer">BIDS (Brain Imaging Data Structure)</a>{' '}
                                    is a community standard for organizing neuroimaging datasets into a consistent directory hierarchy.
                                    niBuild can parse a BIDS dataset and automatically generate typed workflow inputs for your data files.
                                </p>

                                <div className="howto-subheading">BIDS Directory Structure</div>
                                <p className="howto-section-intro">
                                    A BIDS dataset follows this hierarchy:
                                </p>
                                <pre className="howto-code-block">{
`dataset/
├── dataset_description.json   # Required: dataset name, BIDS version
├── participants.tsv           # Subject demographics (age, sex, etc.)
├── sub-01/                    # Subject directory
│   ├── ses-pre/               # Session directory (optional)
│   │   ├── anat/              # Anatomical images
│   │   │   ├── sub-01_ses-pre_T1w.nii.gz
│   │   │   └── sub-01_ses-pre_T1w.json    # Sidecar metadata
│   │   ├── func/              # Functional images
│   │   │   ├── sub-01_ses-pre_task-rest_bold.nii.gz
│   │   │   ├── sub-01_ses-pre_task-rest_bold.json
│   │   │   └── sub-01_ses-pre_task-rest_events.tsv
│   │   ├── dwi/               # Diffusion images
│   │   │   ├── sub-01_ses-pre_dwi.nii.gz
│   │   │   ├── sub-01_ses-pre_dwi.bval
│   │   │   └── sub-01_ses-pre_dwi.bvec
│   │   └── fmap/              # Field maps
│   │       └── sub-01_ses-pre_phasediff.nii.gz
│   └── ses-post/
│       └── ...
└── sub-02/
    └── ...`
                                }</pre>

                                <div className="howto-subheading">BIDS Naming Convention</div>
                                <p className="howto-section-intro">
                                    BIDS filenames encode metadata as key-value entity pairs separated by underscores:
                                </p>
                                <pre className="howto-code-block">sub-01_ses-pre_task-rest_run-01_bold.nii.gz</pre>
                                <p className="howto-section-intro">Common BIDS entities:</p>
                                <ul className="howto-list">
                                    <li><code className="howto-code">sub</code> &mdash; Subject identifier (required)</li>
                                    <li><code className="howto-code">ses</code> &mdash; Session identifier (e.g., pre/post intervention, timepoint)</li>
                                    <li><code className="howto-code">task</code> &mdash; Task name for functional scans (e.g., rest, flanker, nback)</li>
                                    <li><code className="howto-code">acq</code> &mdash; Acquisition parameters (e.g., resolution, sequence variant)</li>
                                    <li><code className="howto-code">run</code> &mdash; Run index when a scan is repeated within a session</li>
                                    <li><code className="howto-code">dir</code> &mdash; Phase-encoding direction (e.g., AP, PA) for field maps</li>
                                    <li><code className="howto-code">echo</code> &mdash; Echo index for multi-echo sequences</li>
                                    <li><code className="howto-code">rec</code> &mdash; Reconstruction method</li>
                                    <li><code className="howto-code">space</code> &mdash; Reference space (e.g., MNI152NLin2009cAsym)</li>
                                </ul>

                                <div className="howto-subheading">Data Types</div>
                                <p className="howto-section-intro">
                                    Each subject directory contains subdirectories for different imaging data types:
                                </p>
                                <ul className="howto-list">
                                    <li><code className="howto-code">anat</code> &mdash; Structural imaging (T1-weighted, T2-weighted, FLAIR, proton density, etc.)</li>
                                    <li><code className="howto-code">func</code> &mdash; Task-based and resting-state functional MRI (BOLD signal)</li>
                                    <li><code className="howto-code">dwi</code> &mdash; Diffusion-weighted imaging for white matter tractography</li>
                                    <li><code className="howto-code">fmap</code> &mdash; Field maps for distortion correction (magnitude, phase difference, EPI)</li>
                                    <li><code className="howto-code">perf</code> &mdash; Perfusion imaging (arterial spin labeling, M0 calibration scans)</li>
                                    <li><code className="howto-code">pet</code> &mdash; Positron emission tomography</li>
                                    <li><code className="howto-code">meg</code> / <code className="howto-code">eeg</code> / <code className="howto-code">ieeg</code> &mdash; Magneto/electroencephalography recordings</li>
                                </ul>

                                <div className="howto-subheading">Common Suffixes</div>
                                <p className="howto-section-intro">
                                    The suffix at the end of a BIDS filename (before the extension) identifies the image type:
                                </p>
                                <table className="howto-table">
                                    <thead>
                                        <tr><th>Suffix</th><th>Data Type</th><th>Description</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr><td><code className="howto-code">T1w</code></td><td>anat</td><td>T1-weighted structural image</td></tr>
                                        <tr><td><code className="howto-code">T2w</code></td><td>anat</td><td>T2-weighted structural image</td></tr>
                                        <tr><td><code className="howto-code">FLAIR</code></td><td>anat</td><td>Fluid-attenuated inversion recovery</td></tr>
                                        <tr><td><code className="howto-code">bold</code></td><td>func</td><td>Blood oxygen level dependent (fMRI timeseries)</td></tr>
                                        <tr><td><code className="howto-code">sbref</code></td><td>func</td><td>Single-band reference image</td></tr>
                                        <tr><td><code className="howto-code">dwi</code></td><td>dwi</td><td>Diffusion-weighted image</td></tr>
                                        <tr><td><code className="howto-code">phasediff</code></td><td>fmap</td><td>Phase difference map for B0 unwarping</td></tr>
                                        <tr><td><code className="howto-code">magnitude1</code></td><td>fmap</td><td>First magnitude image for field mapping</td></tr>
                                        <tr><td><code className="howto-code">epi</code></td><td>fmap</td><td>EPI-based field map (e.g., reverse phase-encode)</td></tr>
                                        <tr><td><code className="howto-code">asl</code></td><td>perf</td><td>Arterial spin labeling perfusion image</td></tr>
                                        <tr><td><code className="howto-code">T1map</code></td><td>anat</td><td>Quantitative T1 relaxation time map</td></tr>
                                    </tbody>
                                </table>

                                <div className="howto-subheading">File Formats</div>
                                <ul className="howto-list">
                                    <li><code className="howto-code">.nii.gz</code> / <code className="howto-code">.nii</code> &mdash; NIfTI image data (the primary neuroimaging format)</li>
                                    <li><code className="howto-code">.json</code> &mdash; Sidecar metadata (acquisition parameters like TR, TE, flip angle)</li>
                                    <li><code className="howto-code">.tsv</code> &mdash; Tab-separated values (event timing files, participant demographics)</li>
                                    <li><code className="howto-code">.bval</code> / <code className="howto-code">.bvec</code> &mdash; Diffusion gradient tables (b-values and b-vectors)</li>
                                </ul>

                                <div className="howto-subheading">Using BIDS in niBuild</div>
                                <ol className="howto-steps">
                                    <li>Expand the "I/O" section in the tool menu and drag <strong>BIDS Dataset</strong> onto the canvas.</li>
                                    <li>A modal opens prompting you to select a BIDS-compliant directory from your local filesystem.</li>
                                    <li>niBuild parses the directory structure client-side, detecting subjects, sessions, data types, and file suffixes.</li>
                                    <li>Use the <strong>subject panel</strong> to select or deselect individual subjects (with Select All / Deselect All buttons). You can search subjects by ID or demographics.</li>
                                    <li>Enable or disable <strong>data types</strong> (e.g., anat, func, dwi) in the data type grid. Unavailable data types are grayed out.</li>
                                    <li>Configure <strong>output groups</strong>: each group specifies a data type, suffix, and optional filters (task, run, acquisition). Each group becomes an output port on the BIDS node.</li>
                                    <li>Connect BIDS output ports to downstream tool inputs just like any other edge connection.</li>
                                </ol>
                                <div className="howto-tip">
                                    <strong>Note:</strong> All file parsing happens in your browser &mdash; no data is uploaded to any server. The path preview shows exactly which files match your selections. BIDS outputs are always arrays (one file per subject), so scatter is enabled automatically on downstream nodes.
                                </div>
                            </Accordion.Body>
                        </Accordion.Item>

                        {/* 8 — Custom Workflows */}
                        <Accordion.Item eventKey="8">
                            <Accordion.Header>Custom Workflows</Accordion.Header>
                            <Accordion.Body>
                                <p className="howto-section-intro">
                                    Save and reuse common processing pipelines as custom workflow nodes. A custom workflow encapsulates a multi-step pipeline into a single reusable node.
                                </p>
                                <div className="howto-subheading">Saving a Workflow</div>
                                <ol className="howto-steps">
                                    <li>Build a pipeline on the canvas as usual.</li>
                                    <li>Enter a name in the <strong>Workflow Name</strong> input field above the canvas.</li>
                                    <li>Click <strong>Save Workflow</strong> in the actions bar. If the name already exists, the existing workflow is updated.</li>
                                </ol>
                                <div className="howto-subheading">Using a Custom Workflow</div>
                                <ol className="howto-steps">
                                    <li>Saved workflows appear in the <strong>My Workflows</strong> section of the tool menu.</li>
                                    <li>Drag a custom workflow onto any workspace to use it as a single reusable node.</li>
                                    <li>Double-click the custom workflow node to configure parameters for each internal step. Use the arrow buttons to navigate between steps.</li>
                                </ol>
                                <div className="howto-subheading">Managing Custom Workflows</div>
                                <ul className="howto-list">
                                    <li>Click the <strong>pencil icon</strong> next to a saved workflow to edit it in a new workspace.</li>
                                    <li>Click the <strong>X icon</strong> to delete a workflow (with confirmation). Deleting also removes instances from all workspaces.</li>
                                    <li>Custom workflows are stored in your browser's localStorage and persist across sessions.</li>
                                    <li>At export time, custom workflow nodes are expanded into their constituent processing steps in the generated CWL.</li>
                                </ul>
                            </Accordion.Body>
                        </Accordion.Item>

                        {/* 9 — CWL Preview Panel */}
                        <Accordion.Item eventKey="9">
                            <Accordion.Header>CWL Preview Panel</Accordion.Header>
                            <Accordion.Body>
                                <p className="howto-section-intro">
                                    The right-side panel shows a live preview of the CWL workflow that niBuild will generate from your current canvas. The preview updates automatically as you add, remove, or reconfigure nodes and edges.
                                </p>
                                <ul className="howto-list">
                                    <li>Toggle between the <strong>.cwl</strong> tab (workflow definition) and the <strong>.yml</strong> tab (job template with your parameter values).</li>
                                    <li>Syntax highlighting: keys in blue, strings in green, booleans in orange, comments in gray.</li>
                                    <li>Click <strong>Copy</strong> to copy the current tab's content to your clipboard.</li>
                                    <li>Click <strong>Expand</strong> to view the preview in a fullscreen modal for detailed review.</li>
                                    <li>Use the toggle button to collapse or expand the panel. Panel state is saved in localStorage.</li>
                                </ul>
                                <div className="howto-tip">
                                    <strong>Note:</strong> The preview requires at least two connected non-I/O nodes to generate output.
                                </div>
                            </Accordion.Body>
                        </Accordion.Item>

                        {/* 10 — Workspaces & Export */}
                        <Accordion.Item eventKey="10">
                            <Accordion.Header>Workspaces & Export</Accordion.Header>
                            <Accordion.Body>
                                <div className="howto-subheading">Workspaces</div>
                                <ul className="howto-list">
                                    <li>Each workspace is an independent canvas with its own nodes and edges.</li>
                                    <li>Create a new workspace with <strong>New Workspace</strong>, clear the current one with <strong>Clear Workspace</strong>, or remove it with <strong>Remove Workspace</strong>.</li>
                                    <li>Navigate between workspaces using the page tabs at the bottom of the screen.</li>
                                    <li>Workspace state is automatically saved in your browser storage.</li>
                                </ul>
                                <div className="howto-subheading">Output Name</div>
                                <p className="howto-section-intro">
                                    Set the exported filename using the <strong>Output</strong> input field in the toolbar. This name is used for the CWL workflow file and the downloaded bundle.
                                </p>
                                <div className="howto-subheading">Generate Workflow</div>
                                <p className="howto-section-intro">
                                    Click <strong>Generate Workflow</strong> to download a <code className="howto-code">.crate.zip</code> bundle containing everything needed to run your pipeline:
                                </p>
                                <ul className="howto-list">
                                    <li><code className="howto-code">workflows/pipeline.cwl</code> &mdash; CWL workflow definition</li>
                                    <li><code className="howto-code">workflows/pipeline_job.yml</code> &mdash; job template pre-filled with your configured parameter values</li>
                                    <li><code className="howto-code">cwl/</code> &mdash; individual tool CWL files with pinned Docker image versions</li>
                                    <li><code className="howto-code">Dockerfile</code> + <code className="howto-code">run.sh</code> &mdash; one-command execution via Docker</li>
                                    <li><code className="howto-code">Singularity.def</code> + <code className="howto-code">run_singularity.sh</code> &mdash; for HPC environments using Singularity/Apptainer</li>
                                    <li><code className="howto-code">prefetch_images.sh</code> &mdash; pre-pull all required container images</li>
                                    <li><code className="howto-code">ro-crate-metadata.json</code> &mdash; JSON-LD metadata for FAIR compliance and{' '}
                                        <a className="howto-link" href="https://workflowhub.eu/" target="_blank" rel="noopener noreferrer">WorkflowHub</a> discovery</li>
                                    <li><code className="howto-code">README.md</code> &mdash; setup and execution instructions</li>
                                </ul>
                                <div className="howto-tip">
                                    <strong>Tip:</strong> The exported bundle is a{' '}
                                    <a className="howto-link" href="https://www.commonwl.org/v1.2/" target="_blank" rel="noopener noreferrer">CWL v1.2</a>{' '}
                                    Workflow RO-Crate. Run it with any CWL-compliant engine (e.g., cwltool, Toil) or use the included Docker/Singularity scripts.
                                </div>
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                </Modal.Body>
            </Modal>
        </div>
    );
}

export default HeaderBar;
