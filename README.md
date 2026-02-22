# niBuild

**Visual workflow builder for reproducible neuroimaging analysis**

[![Live Demo](https://img.shields.io/badge/Live_Demo-niBuild-4a90e2?style=for-the-badge)](https://kunaalagarwal.github.io/niBuild/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<!-- TODO: Add screenshot here once a canonical screenshot is committed -->
<!-- ![niBuild Screenshot](docs/screenshot.png) -->

## Why niBuild?

Neuroimaging analysis suffers from a reproducibility crisis — the same dataset analyzed by different teams produces divergent results due to software versions, parameter choices, and undocumented processing steps ([Eklund et al., 2016](https://doi.org/10.1073/pnas.1602413113); [Botvinik-Nezer et al., 2020](https://doi.org/10.1038/s41586-020-2314-9)). Manual pipeline scripting is error-prone, hard to share, and rarely portable across computing environments.

niBuild addresses this by providing a **no-code, browser-based GUI** where researchers visually design analysis workflows from **100+ neuroimaging tools across 9 libraries**, then export a self-contained [Workflow RO-Crate](https://w3id.org/workflowhub/workflow-ro-crate/1.0) bundle with [CWL](https://www.commonwl.org/) workflows, Docker/Singularity containers, and FAIR-compliant metadata — all without installing anything.

Clicking **Export** generates a `.crate.zip` containing everything needed to run the workflow:

```
my_pipeline.crate.zip/
├── workflows/my_pipeline.cwl          # CWL workflow definition
├── workflows/my_pipeline_job.yml      # Pre-configured job template
├── cwl/                               # Tool CWL files (with pinned Docker versions)
├── Dockerfile                         # Docker orchestration container
├── run.sh                             # Docker execution entrypoint
├── prefetch_images.sh                 # Pre-pull tool images
├── Singularity.def                    # Singularity/Apptainer container (if enabled)
├── run_singularity.sh                 # HPC execution entrypoint
├── prefetch_images_singularity.sh     # Convert images to SIF format
├── ro-crate-metadata.json             # JSON-LD metadata (FAIR compliance)
└── README.md                          # Execution instructions
```

## Contributing

### Local Development

```bash
git clone https://github.com/KunaalAgarwal/niBuild.git
cd niBuild
npm install
npm run dev
```

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature
   ```
2. Make changes and test thoroughly (see `utils/` for the testing harness).
3. Open a pull request to `main`. PRs are reviewed before merging.
4. On merge to `main`, GitHub Actions automatically deploys to GitHub Pages.


## Citation

niBuild was created by **Kunaal Agarwal** with assistance from **Adam Dawood**, and advised by **Javier Rasero, PhD**, under the funding of the **University of Virginia Harrison Research Award**.

> Publication forthcoming. If you use niBuild in your research, please cite this repository.