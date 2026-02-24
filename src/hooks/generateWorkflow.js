import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import YAML from 'js-yaml';
import { buildCWLWorkflowObject, buildJobTemplate } from './buildWorkflow.js';
import { getToolConfigSync } from '../utils/toolRegistry.js';
import { buildROCrateMetadata } from '../utils/buildROCrateMetadata.js';
import { useToast } from '../context/ToastContext.jsx';

/* ====================================================================
 *  Docker export helpers
 * ==================================================================== */

/**
 * Determine if a CWL type definition represents a File or Directory type.
 * Returns { type, isArray, nullable } or null for scalar types.
 */
const resolveFileType = (cwlType) => {
    if (cwlType === 'File') return { type: 'File', isArray: false, nullable: false };
    if (cwlType === 'Directory') return { type: 'Directory', isArray: false, nullable: false };

    // Nullable: ['null', 'File'] or ['null', { type: 'array', items: 'File' }]
    if (Array.isArray(cwlType)) {
        const nonNull = cwlType.find(t => t !== 'null');
        if (!nonNull) return null;
        const inner = resolveFileType(nonNull);
        return inner ? { ...inner, nullable: true } : null;
    }

    // Array: { type: 'array', items: 'File' }
    if (typeof cwlType === 'object' && cwlType?.type === 'array') {
        const inner = resolveFileType(cwlType.items);
        return inner ? { ...inner, isArray: true } : null;
    }

    return null;
};

/**
 * Extract workflow inputs that are File/Directory types requiring runtime values.
 * These are inputs NOT covered by jobDefaults (which contain scalar parameters).
 */
const extractRuntimeFileInputs = (wf, jobDefaults) => {
    const runtimeInputs = [];
    for (const [name, def] of Object.entries(wf.inputs)) {
        if (jobDefaults[name] !== undefined) continue;
        const info = resolveFileType(def.type);
        if (info) runtimeInputs.push({ name, ...info });
    }
    return runtimeInputs;
};

/**
 * Collect unique Docker image:tag strings from the dockerVersionMap.
 */
const collectUniqueDockerImages = (dockerVersionMap) => {
    const seen = new Set();
    const images = [];
    for (const { dockerImage, dockerVersion } of Object.values(dockerVersionMap)) {
        const tag = `${dockerImage}:${dockerVersion}`;
        if (!seen.has(tag)) { seen.add(tag); images.push(tag); }
    }
    return images.sort();
};

/* ---------- template generators ---------- */

const generateDockerfile = (safeWorkflowName, hasBIDS = false) => {
  const bidsFiles = hasBIDS
    ? `COPY bids_query.json .
COPY resolve_bids.py .
`
    : '';
  return `FROM python:3.11-slim

# Install cwltool (pinned for reproducibility)
RUN pip install --no-cache-dir cwltool==3.1.20240508115724

# Install docker CLI (needed for cwltool to invoke per-tool containers)
RUN apt-get update && \\
    apt-get install -y --no-install-recommends docker.io && \\
    rm -rf /var/lib/apt/lists/*

# Copy workflow files
WORKDIR /workflow
COPY workflows/ ./workflows/
COPY cwl/ ./cwl/
COPY workflows/${safeWorkflowName}_job.yml ./job.yml
${bidsFiles}COPY run.sh .
RUN chmod +x run.sh

ENTRYPOINT ["./run.sh"]
`;
};

const generateRunSh = (safeWorkflowName, runtimeInputs, hasBIDS = false) => {
    const inputSection = runtimeInputs.length > 0
        ? [
            '  echo "File inputs (edit job.yml before running):"',
            ...runtimeInputs.map(({ name, type, isArray }) => {
                const typeLabel = isArray ? `${type}[]` : type;
                return `  echo "  ${name}  (${typeLabel})"`;
            }),
        ].join('\n')
        : '  echo "All inputs are pre-configured. No file arguments needed."';

    const bidsSection = hasBIDS
        ? `
# BIDS mode: resolve dataset paths automatically
if [ "\${1:-}" = "--bids" ]; then
  BIDS_DIR="\$2"
  if [ -z "\${BIDS_DIR:-}" ]; then
    echo "Error: --bids requires a path to a BIDS dataset directory"
    exit 1
  fi
  shift 2
  echo "Resolving BIDS inputs from: \$BIDS_DIR"
  python3 resolve_bids.py \\
    --bids-dir "\$BIDS_DIR" \\
    --query bids_query.json \\
    --output job.yml
  cwltool --outdir /output "\$@" \\
    workflows/${safeWorkflowName}.cwl \\
    job.yml
  exit 0
fi
`
        : '';

    return `#!/bin/bash
set -euo pipefail

# If --help is passed, show usage
if [ "\${1:-}" = "--help" ] || [ "\${1:-}" = "-h" ]; then
  echo "=== niBuild Workflow Runner ==="
  echo ""
  echo "Usage: docker run -v /path/to/data:/data -v /path/to/output:/output <image>"
  echo ""
${inputSection}
  echo ""
  echo "All scalar parameters are pre-configured in job.yml."
  echo "Edit job.yml to set file paths before running."${hasBIDS ? `
  echo ""
  echo "BIDS mode: ./run.sh --bids /path/to/bids/dataset"` : ''}
  echo ""
  echo "Extra arguments are passed to cwltool (e.g. --verbose, --cachedir /cache)."
  exit 0
fi
${bidsSection}
cwltool --outdir /output "$@" \\
  workflows/${safeWorkflowName}.cwl \\
  job.yml
`;
};

const generatePrefetchSh = (dockerImages) => {
    const pullLines = dockerImages.map(img => `docker pull ${img}`).join('\n');
    return `#!/bin/bash
# Pre-download all tool container images used by this workflow.
# Run this before 'docker build' to speed up the first workflow execution.
echo "Pulling neuroimaging tool images..."
${pullLines}
echo "All images pulled successfully."
`;
};

/* ---------- Singularity/Apptainer template generators ---------- */

const generateSingularityDef = (safeWorkflowName) =>
`Bootstrap: docker
From: python:3.11-slim

%labels
    Author niBuild
    Description Orchestration container for Singularity/Apptainer-based CWL workflow execution

%post
    pip install --no-cache-dir cwltool==3.1.20240508115724

%files
    workflows/ /workflow/workflows/
    cwl/ /workflow/cwl/
    workflows/${safeWorkflowName}_job.yml /workflow/job.yml
    run_singularity.sh /workflow/run_singularity.sh

%runscript
    cd /workflow
    chmod +x run_singularity.sh
    exec ./run_singularity.sh "$@"
`;

const generateRunSingularitySh = (safeWorkflowName, runtimeInputs) => {
    const inputSection = runtimeInputs.length > 0
        ? [
            '  echo "File inputs (edit job.yml before running):"',
            ...runtimeInputs.map(({ name, type, isArray }) => {
                const typeLabel = isArray ? `${type}[]` : type;
                return `  echo "  ${name}  (${typeLabel})"`;
            }),
        ].join('\n')
        : '  echo "All inputs are pre-configured. No file arguments needed."';

    return `#!/bin/bash
set -euo pipefail

# If --help is passed, show usage
if [ "\${1:-}" = "--help" ] || [ "\${1:-}" = "-h" ]; then
  echo "=== niBuild Workflow Runner (Singularity) ==="
  echo ""
  echo "Usage:"
  echo "  Direct:    ./run_singularity.sh"
  echo "  Container: singularity run my-pipeline.sif"
  echo ""
${inputSection}
  echo ""
  echo "All scalar parameters are pre-configured in job.yml."
  echo "Edit job.yml to set file paths before running."
  echo ""
  echo "Extra arguments are passed to cwltool (e.g. --verbose, --cachedir /cache)."
  exit 0
fi

cwltool --singularity --outdir /output "$@" \\
  workflows/${safeWorkflowName}.cwl \\
  job.yml
`;
};

const generatePrefetchSingularitySh = (dockerImages) => {
    const pullLines = dockerImages.map(img => {
        const safeName = img.replace(/[/:]/g, '_') + '.sif';
        return `singularity pull --force ${safeName} docker://${img}`;
    }).join('\n');
    return `#!/bin/bash
# Pre-download all tool container images as Singularity SIF files.
# Run this before executing the workflow to avoid download delays.
# Recommended on HPC compute nodes with limited internet access.
set -euo pipefail
echo "Pulling and converting Docker images to Singularity SIF format..."
${pullLines}
echo "All images converted to SIF successfully."
echo ""
echo "Note: cwltool --singularity will also auto-pull images at runtime."
echo "Pre-pulling is recommended on HPC nodes with limited internet access."
`;
};

const generateReadme = (safeWorkflowName, runtimeInputs, dockerImages, hasBIDS = false) => {
    const inputListMd = runtimeInputs.length > 0
        ? runtimeInputs.map(({ name, type, isArray }) => {
            const typeLabel = isArray ? `${type}[]` : type;
            return `- \`${name}\` — ${typeLabel}`;
        }).join('\n')
        : '- *(No runtime file inputs — all inputs are scalar parameters)*';

    const imageListMd = dockerImages.map(img => `docker pull ${img}`).join('\n');

    return `# niBuild Workflow Bundle

This bundle contains a CWL (Common Workflow Language) workflow generated by [niBuild](https://github.com/KunaalAgarwal/niBuild).

## Contents

- \`workflows/${safeWorkflowName}.cwl\` — Main workflow file
- \`workflows/${safeWorkflowName}_job.yml\` — Job file with pre-configured parameters
- \`cwl/\` — Tool definitions used by the workflow
- \`Dockerfile\` — Recipe for building the Docker orchestration container
- \`run.sh\` — Entrypoint script for the Docker container
- \`prefetch_images.sh\` — Pre-pull tool Docker images (optional)
- \`Singularity.def\` — Recipe for building the Singularity/Apptainer orchestration container
- \`run_singularity.sh\` — Entrypoint script for the Singularity container
- \`prefetch_images_singularity.sh\` — Convert Docker images to Singularity SIF files (optional)
- \`ro-crate-metadata.json\` — [Workflow RO-Crate](https://w3id.org/workflowhub/workflow-ro-crate/1.0) metadata (JSON-LD)

## How It Works

This workflow uses a **two-layer container architecture**:

1. **Tool containers** (e.g. \`brainlife/fsl:6.0.5\`) — Pre-built images hosted on Docker Hub
   containing neuroimaging software (FSL, AFNI, ANTs, FreeSurfer, etc.). Each CWL tool
   definition references its required container image. You do not build these yourself.

2. **Orchestration container** (built from \`Dockerfile\` or \`Singularity.def\`) — Contains
   [cwltool](https://github.com/common-workflow-language/cwltool), the CWL execution engine,
   along with your workflow and job files. When run, cwltool reads the CWL workflow and
   launches the appropriate tool containers to execute each processing step.

You can also skip the orchestration container entirely and run cwltool directly on your
machine (see Option 2 below).

## Runtime File Inputs

These inputs must be supplied by editing the job file before running:

${inputListMd}

All scalar parameters (thresholds, flags, etc.) are pre-configured in the job file.

---

## Option 1: Run with Docker

Only Docker is required. No Python or cwltool installation needed — the orchestration
container includes everything.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)

### 1. Unzip and (optionally) pre-pull tool images

\`\`\`bash
unzip ${safeWorkflowName}.crate.zip -d my_workflow
cd my_workflow

# Optional: pre-download tool container images so the first run doesn't stall.
# Without this, cwltool will pull images on-the-fly as needed.
bash prefetch_images.sh
\`\`\`

### 2. Edit the Job File

Open \`workflows/${safeWorkflowName}_job.yml\` and replace file path placeholders with
your actual data paths. Use \`/data/...\` paths (e.g. \`/data/my_brain.nii.gz\`) to match
the volume mount in the run command below.

### 3. Build the Orchestration Container

This builds a container with cwltool and your workflow files inside. It does **not**
include your data or the tool containers — those are handled separately at runtime.

\`\`\`bash
docker build -t my-pipeline .
\`\`\`

### 4. Run the Workflow

\`\`\`bash
docker run --rm \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -v /path/to/data:/data \\
  -v /path/to/output:/output \\
  my-pipeline
\`\`\`

**What the volume mounts do:**

| Mount | Purpose |
|-------|---------|
| \`-v /var/run/docker.sock:...\` | Gives the orchestration container access to Docker so cwltool can launch tool containers |
| \`-v /path/to/data:/data\` | Makes your input data available inside the container at \`/data\` — job file paths should use \`/data/...\` |
| \`-v /path/to/output:/output\` | Where cwltool writes workflow results (output directory) |

Pass \`--help\` to see usage info, or add cwltool flags (e.g. \`--verbose\`):

\`\`\`bash
docker run my-pipeline --help
docker run --rm -v ... my-pipeline --verbose
\`\`\`

---

## Option 2: Run with cwltool Directly

Run cwltool on your machine without an orchestration container. cwltool will still use
Docker (or Singularity) to run the individual tool containers.

### Prerequisites

- Python 3 with pip
- [cwltool](https://github.com/common-workflow-language/cwltool): \`pip install cwltool\`
- [Docker](https://docs.docker.com/get-docker/) (for tool containers)

### Windows Users

CWL requires a Unix-like environment. Use WSL (Windows Subsystem for Linux):

1. Install WSL: \`wsl --install\` (then restart)
2. In WSL: \`sudo apt update && sudo apt install python3 python3-pip\`
3. \`pip install cwltool\`

### 1. Unzip

\`\`\`bash
unzip ${safeWorkflowName}.crate.zip -d my_workflow
cd my_workflow
chmod +x workflows/${safeWorkflowName}.cwl
\`\`\`

### 2. Edit the Job File

Open \`workflows/${safeWorkflowName}_job.yml\` and replace file path placeholders with your actual data paths.

### 3. Run

\`\`\`bash
cwltool workflows/${safeWorkflowName}.cwl workflows/${safeWorkflowName}_job.yml
\`\`\`

With a specific output directory:

\`\`\`bash
cwltool --outdir ./results workflows/${safeWorkflowName}.cwl workflows/${safeWorkflowName}_job.yml
\`\`\`

---

## Option 3: Run with Singularity/Apptainer (for HPC)

[Singularity](https://sylabs.io/singularity/) (now [Apptainer](https://apptainer.org/))
is the standard container runtime on HPC clusters. Unlike Docker, it does **not require
root access**, making it suitable for shared compute environments.

cwltool natively supports Singularity — when you pass the \`--singularity\` flag, it reads
the same \`DockerRequirement\` from each CWL tool definition but uses Singularity to pull
and run the container instead of Docker.

### Prerequisites

- [Singularity](https://sylabs.io/singularity/) or [Apptainer](https://apptainer.org/) (v3.0+)
- Python 3 with pip
- [cwltool](https://github.com/common-workflow-language/cwltool): \`pip install cwltool\`

### 1. Unzip and (optionally) pre-convert images

\`\`\`bash
unzip ${safeWorkflowName}.crate.zip -d my_workflow
cd my_workflow

# Optional: convert Docker images to Singularity SIF files ahead of time.
# This is recommended on HPC compute nodes with limited internet access —
# run this on a login node, then transfer the .sif files.
# Without this, cwltool will auto-pull and convert images at runtime.
bash prefetch_images_singularity.sh
\`\`\`

### 2. Edit the Job File

Open \`workflows/${safeWorkflowName}_job.yml\` and replace file path placeholders with your actual data paths.

### 3. Run

\`\`\`bash
cwltool --singularity --outdir ./results \\
  workflows/${safeWorkflowName}.cwl \\
  workflows/${safeWorkflowName}_job.yml
\`\`\`

Or use the provided run script:

\`\`\`bash
bash run_singularity.sh
\`\`\`

### Alternative: Using the Singularity Orchestration Container

You can also build an orchestration container (similar to the Docker approach):

\`\`\`bash
singularity build my-pipeline.sif Singularity.def
singularity run --bind /path/to/data:/data --bind /path/to/output:/output my-pipeline.sif
\`\`\`

---

## Tool Container Images

This workflow uses the following container images (hosted on Docker Hub).
Both Docker and Singularity can pull these — Singularity uses the \`docker://\` URI prefix.

\`\`\`bash
${imageListMd}
\`\`\`

## Key Concepts

| Term | Description |
|------|-------------|
| **Container image** | A packaged filesystem with an OS and software pre-installed — a "frozen environment" you can run anywhere |
| **Dockerfile / Singularity.def** | Text recipes for building container images. \`docker build\` and \`singularity build\` read these to produce images |
| **Volume mount** (\`-v\` / \`--bind\`) | Makes a directory on your host machine accessible inside the container |
| **cwltool** | The CWL execution engine — reads the workflow CWL and launches tool containers for each step |
| **Docker-in-Docker** | The orchestration container uses the Docker socket (\`/var/run/docker.sock\`) to launch tool containers |

## Troubleshooting

### Docker not found
Ensure Docker is running: \`docker --version\`

### Permission denied on Docker
Add your user to the docker group: \`sudo usermod -aG docker $USER\` (log out and back in)

### Validation errors
Validate the workflow: \`cwltool --validate workflows/${safeWorkflowName}.cwl\`

### Singularity: FUSE/mount errors
On some HPC systems you may need \`--fakeroot\` or ask your admin to configure user namespaces.

### Singularity: image cache location
Set \`SINGULARITY_CACHEDIR\` to control where SIF files are stored:
\`export SINGULARITY_CACHEDIR=/scratch/$USER/.singularity\`

## RO-Crate Metadata

This bundle conforms to the [Workflow RO-Crate 1.0](https://w3id.org/workflowhub/workflow-ro-crate/1.0) profile.
The \`ro-crate-metadata.json\` file at the bundle root describes all workflow components
in JSON-LD format, enabling discovery and reuse through platforms like [WorkflowHub](https://workflowhub.eu/).

${hasBIDS ? `## Running with a BIDS Dataset

This workflow supports automatic input resolution from BIDS-formatted datasets.

### Prerequisites
- A BIDS-valid dataset (validated with https://bids-validator.readthedocs.io)
- Python 3.6+ (standard library only — no additional packages required)

### Usage

\`\`\`bash
# Docker-based execution:
./run.sh --bids /path/to/your/bids/dataset

# Direct cwltool execution:
python3 resolve_bids.py --bids-dir /path/to/bids --query bids_query.json --output job.yml
cwltool workflows/${safeWorkflowName}.cwl job.yml
\`\`\`

### Manual Override
You can edit \`workflows/${safeWorkflowName}_job.yml\` directly to specify custom file paths
without using the BIDS resolver.

` : ''}## Resources

- [CWL User Guide](https://www.commonwl.org/user_guide/)
- [cwltool Documentation](https://github.com/common-workflow-language/cwltool)
- [niBuild GitHub](https://github.com/KunaalAgarwal/niBuild)
- [RO-Crate Specification](https://www.researchobject.org/ro-crate/)
`;
};

export function useGenerateWorkflow() {
    const { showError, showWarning } = useToast();
    /**
     * Sanitize workflow name for safe use as a filename.
     * Security: Prevents path traversal, code injection, and special characters.
     * - Only allows alphanumeric, underscore, and hyphen
     * - Removes path separators (/, \, ..)
     * - Limits length to prevent filesystem issues
     * - Falls back to 'main' for empty/invalid input
     */
    const sanitizeFilename = (name) => {
        if (!name || typeof name !== 'string') return 'main';

        const sanitized = name
            .trim()
            .toLowerCase()
            // Remove any path traversal attempts
            .replace(/\.\./g, '')
            .replace(/[/\\]/g, '')
            // Only allow alphanumeric, underscore, hyphen
            .replace(/[^a-z0-9_-]/g, '_')
            // Collapse multiple underscores
            .replace(/_+/g, '_')
            // Remove leading/trailing underscores
            .replace(/^_|_$/g, '')
            // Limit length to 50 characters
            .slice(0, 50);

        return sanitized || 'main';
    };

    /**
     * Builds main.cwl, pulls tool CWL files, zips, and downloads.
     * Works both in `npm run dev` (BASE_URL = "/") and on GitHub Pages
     * (BASE_URL = "/niBuild/").
     */
    const generateWorkflow = async (getWorkflowData, workflowName = '') => {
        if (typeof getWorkflowData !== 'function') {
            console.error('generateWorkflow expects a function');
            return;
        }

        const graph = getWorkflowData();
        if (!graph || !graph.nodes || graph.nodes.length === 0) {
            showWarning('Empty workflow — nothing to export.');
            return;
        }

        const safeWorkflowName = sanitizeFilename(workflowName);

        /* ---------- build CWL workflow + job template ---------- */
        let mainCWL;
        let jobYml;
        let runtimeInputs;
        try {
            const result = buildCWLWorkflowObject(graph);
            const { wf, jobDefaults, cwlDefaultKeys } = result;
            mainCWL = YAML.dump(wf, { noRefs: true });
            jobYml = buildJobTemplate(wf, jobDefaults, cwlDefaultKeys);
            runtimeInputs = extractRuntimeFileInputs(wf, jobDefaults);
        } catch (err) {
            showError(`Workflow build failed: ${err.message}`);
            return;
        }

        // Add shebang to make it executable
        const shebang = '#!/usr/bin/env cwl-runner\n\n';
        mainCWL = shebang + mainCWL;

        /* ---------- prepare ZIP ---------- */
        const zip = new JSZip();
        zip.file(`workflows/${safeWorkflowName}.cwl`, mainCWL);
        zip.file(`workflows/${safeWorkflowName}_job.yml`, jobYml);

        // baseURL ends in "/", ensure single slash join
        const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');

        /* ---------- build Docker version map for each tool path ---------- */
        // Filter dummy nodes — they have no tool definitions
        const realNodes = graph.nodes.filter(n => !n.data?.isDummy);
        // Maps cwlPath -> { dockerImage, dockerVersion }
        const dockerVersionMap = {};
        const versionConflicts = [];
        realNodes.forEach(node => {
            const tool = getToolConfigSync(node.data.label);
            if (tool?.cwlPath && tool?.dockerImage) {
                const version = node.data.dockerVersion || 'latest';
                const existing = dockerVersionMap[tool.cwlPath];
                if (existing) {
                    // Detect conflicting non-latest versions
                    if (existing.dockerVersion !== version &&
                        existing.dockerVersion !== 'latest' && version !== 'latest') {
                        versionConflicts.push(
                            `${node.data.label}: "${existing.dockerVersion}" vs "${version}"`
                        );
                    }
                    // Prefer non-latest over latest
                    if (existing.dockerVersion === 'latest' && version !== 'latest') {
                        dockerVersionMap[tool.cwlPath] = { dockerImage: tool.dockerImage, dockerVersion: version };
                    }
                } else {
                    dockerVersionMap[tool.cwlPath] = { dockerImage: tool.dockerImage, dockerVersion: version };
                }
            }
        });
        if (versionConflicts.length > 0) {
            showWarning(`Docker version conflict (first version used): ${versionConflicts.join('; ')}`);
        }

        /* ---------- collect unique Docker images ---------- */
        const dockerImages = collectUniqueDockerImages(dockerVersionMap);

        /* ---------- fetch each unique tool file and inject Docker version ---------- */
        const uniquePaths = [
            ...new Set(realNodes.map(n => getToolConfigSync(n.data.label)?.cwlPath).filter(Boolean))
        ];

        try {
            const fetched = await Promise.all(uniquePaths.map(async (p) => {
                const res = await fetch(`${base}${p}`);
                if (!res.ok) throw new Error(`${p}: ${res.status} ${res.statusText}`);
                return { path: p, text: await res.text() };
            }));

            for (const { path: p, text } of fetched) {
                let cwlContent = text;

                // Inject Docker version if we have one for this tool
                const dockerInfo = dockerVersionMap[p];
                if (dockerInfo) {
                    try {
                        const cwlDoc = YAML.load(cwlContent);
                        if (!cwlDoc.hints) cwlDoc.hints = {};
                        cwlDoc.hints.DockerRequirement = {
                            dockerPull: `${dockerInfo.dockerImage}:${dockerInfo.dockerVersion}`
                        };
                        const hasShebang = cwlContent.startsWith('#!/');
                        const shebangLine = hasShebang ? cwlContent.split('\n')[0] + '\n\n' : '';
                        cwlContent = shebangLine + YAML.dump(cwlDoc, { noRefs: true, lineWidth: -1 });
                    } catch (parseErr) {
                        console.warn(`Could not parse CWL file ${p} for Docker injection:`, parseErr.message);
                    }
                }

                zip.file(p, cwlContent);
            }
        } catch (err) {
            showError(`Unable to fetch tool file: ${err.message}`);
            return;
        }

        /* ---------- detect BIDS nodes ---------- */
        const bidsNodes = graph.nodes.filter(n => n.data?.isBIDS && n.data?.bidsSelections);
        const hasBIDS = bidsNodes.length > 0;

        if (hasBIDS) {
            // Serialize BIDS query from the first BIDS node's selections
            const bidsQuery = {
                bids_version: bidsNodes[0].data.bidsSelections.bidsVersion || '1.9.0',
                dataset_name: bidsNodes[0].data.bidsSelections.datasetName || '',
                selections: bidsNodes[0].data.bidsSelections.selections,
            };
            zip.file('bids_query.json', JSON.stringify(bidsQuery, null, 2));

            // Fetch and include resolve_bids.py from public/scripts/
            try {
                const resolverRes = await fetch(`${base}scripts/resolve_bids.py`);
                if (resolverRes.ok) {
                    zip.file('resolve_bids.py', await resolverRes.text());
                } else {
                    showWarning('Could not fetch resolve_bids.py — BIDS resolver not included in bundle.');
                }
            } catch (err) {
                showWarning(`Could not fetch resolve_bids.py: ${err.message}`);
            }
        }

        /* ---------- generate Docker support files ---------- */
        zip.file('Dockerfile', generateDockerfile(safeWorkflowName, hasBIDS));
        zip.file('run.sh', generateRunSh(safeWorkflowName, runtimeInputs, hasBIDS));
        zip.file('prefetch_images.sh', generatePrefetchSh(dockerImages));

        /* ---------- generate Singularity/Apptainer support files ---------- */
        zip.file('Singularity.def', generateSingularityDef(safeWorkflowName));
        zip.file('run_singularity.sh', generateRunSingularitySh(safeWorkflowName, runtimeInputs));
        zip.file('prefetch_images_singularity.sh', generatePrefetchSingularitySh(dockerImages));

        /* ---------- generate README ---------- */
        zip.file('README.md', generateReadme(safeWorkflowName, runtimeInputs, dockerImages, hasBIDS));

        /* ---------- generate RO-Crate metadata (Workflow RO-Crate 1.0) ---------- */
        const toolMeta = {};
        for (const p of uniquePaths) {
            const node = realNodes.find(n => getToolConfigSync(n.data.label)?.cwlPath === p);
            if (node) {
                const tool = getToolConfigSync(node.data.label);
                toolMeta[p] = {
                    fullName: tool?.fullName || node.data.label,
                    docUrl: tool?.docUrl || null,
                };
            }
        }
        zip.file('ro-crate-metadata.json', buildROCrateMetadata({
            workflowName: safeWorkflowName,
            mainWorkflowPath: `workflows/${safeWorkflowName}.cwl`,
            jobTemplatePath: `workflows/${safeWorkflowName}_job.yml`,
            toolCWLPaths: uniquePaths,
            toolMetadata: toolMeta,
            hasBIDS,
            dockerImages,
            singularityFiles: [
                'Singularity.def',
                'run_singularity.sh',
                'prefetch_images_singularity.sh',
            ],
        }));

        /* ---------- download ---------- */
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, `${safeWorkflowName}.crate.zip`);
    };

    return { generateWorkflow };
}