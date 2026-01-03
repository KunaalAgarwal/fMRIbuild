# fMRIbuild - Neuroimaging Workflow Generator

## Project Overview

A web-based GUI for building neuroimaging (fMRI) analysis workflows. Users visually design workflows by dragging/dropping analysis operations (FSL, AFNI, SPM) onto a canvas, configure parameters, connect nodes, and export to Common Workflow Language (CWL) format.

**Live Demo**: https://kunaalagarwal.github.io/fMRIbuild/

## Tech Stack

- **Framework**: React 18.3.1 + Vite 5.4.9
- **Workflow Canvas**: ReactFlow 11.11.4
- **UI**: React Bootstrap 2.10.9, Bootstrap 5.3.3
- **Export**: js-yaml (YAML generation), JSZip (bundle creation), file-saver (download)
- **Deployment**: GitHub Pages via GitHub Actions

## Project Structure

```
src/
├── components/          # React components
│   ├── main.jsx         # App entry, workspace state provider
│   ├── workflowCanvas.jsx  # ReactFlow canvas for node/edge editing
│   ├── workflowMenu.jsx    # Left sidebar with draggable tools
│   ├── NodeComponent.jsx   # Custom node with parameter editing modal
│   ├── actionsBar.jsx      # Generate workflow + workspace buttons
│   ├── headerBar.jsx       # Header with help modal
│   └── toggleWorkflowBar.jsx # Workspace tab navigation
├── hooks/
│   ├── useWorkspaces.js    # Multi-workspace state + localStorage persistence
│   ├── generateWorkflow.js # Orchestrates CWL zip generation
│   └── buildWorkflow.js    # Converts ReactFlow graph to CWL YAML
└── styles/              # Paired CSS files for each component

public/cwl/
├── toolMap.js           # Tool registry (inputs, outputs, CWL paths)
├── fsl/                 # FSL tool CWL definitions
└── README.md            # Template for exported bundles
```

## Essential Commands

```bash
npm run dev       # Start dev server (localhost:5173)
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run deploy    # Deploy to GitHub Pages
```

## Key Files Reference

| Purpose | File | Key Lines |
|---------|------|-----------|
| App entry & state setup | src/components/main.jsx | 26-45 |
| ReactFlow canvas config | src/components/workflowCanvas.jsx | 23-50 |
| Node parameter editing | src/components/NodeComponent.jsx | 37-43 |
| Workspace persistence | src/hooks/useWorkspaces.js | 6-24 |
| CWL workflow generation | src/hooks/buildWorkflow.js | 12-150 |
| Tool definitions | public/cwl/toolMap.js | 1-200+ |

## Data Flow

1. User drags tools from `workflowMenu` onto `workflowCanvas`
2. Double-click node opens parameter modal (`NodeComponent`)
3. Connect nodes via edges to define dependencies
4. "Generate Workflow" triggers:
   - `buildWorkflow.js` converts graph to CWL (includes cycle detection via Kahn's algorithm)
   - `generateWorkflow.js` fetches CWL files, creates ZIP bundle
   - Downloads `workflow_bundle.zip`

## Tool Registry

Tools are defined in `public/cwl/toolMap.js` with this structure:
- `id`: Unique identifier
- `cwlPath`: Path to CWL file
- `requiredInputs`/`optionalInputs`: Array of `{name, type, description}`
- `primaryOutputs`: Outputs that can connect to next node's input
- `outputs`: All tool outputs

Type system: `File`, `string`, `int`, `double`, `boolean`, `record`

## Environment Configuration

- `vite.config.js`: Base URL set to `/fMRIbuild/` for GitHub Pages
- CWL files fetched using `import.meta.env.BASE_URL` for path resolution

## Current Tools

Brain Extraction, Segmentation, Registration, Smoothing, Filtering, Transformation, Preprocessing, Normalization, Feature Extraction, Fnirt, Flirt, 3D-Deconvolution, 3D-Merge, 3D-Shift

---

## Additional Documentation

When working on specific areas, check these files:

| Topic | File |
|-------|------|
| State management, hooks, component patterns | [docs/architectural_patterns.md](docs/architectural_patterns.md) |
| Complete fMRI tools catalog (FSL, AFNI, SPM, FreeSurfer, ANTs) | [fmri_tools_reference.md](../fmri_tools_reference.md) |

### Tool Reference Summary

The `fmri_tools_reference.md` contains ~150 neuroimaging tools with CWL compatibility status:
- **✅ Ready**: ~120 tools (FSL, AFNI, ANTs, FreeSurfer CLI tools)
- **⚠️ Possible**: ~25 tools (SPM/MATLAB-based, complex pipelines)
- **❌ Not Feasible**: ~5 tools (GUI-only)

**Implementation priority**: Brain extraction → Motion correction → Registration → Smoothing → Segmentation → Statistical analysis

---

## Quick Tips

- All state updates use functional form `setState(prev => {...})` for immutability
- Components import paired CSS files (e.g., `actionsBar.jsx` imports `actionsBar.css`)
- Error handling uses `alert()` for user-facing errors, `console.error()` for debug
- Workspace state persists to localStorage automatically
