# Multimodal CWL Test Suite

CWL validation and execution tests for tools in the **Multimodal** imaging category.

## Tool Coverage

| Tool | Library | Tests |
|------|---------|-------|
| `antsIntermodalityIntrasubject.sh` | ANTs | 6 (validation + 5 execution) |

## Prerequisites

- **cwltool** — `pip install cwltool`
- **Docker** — daemon must be running
- **python3**
- Docker images: `fnndsc/ants:latest`, `brainlife/fsl:latest` (pulled automatically)

## Test Data

All test data comes from **MNI152 templates inside the FSL Docker container** — no external downloads needed. The `prepare_mm_data` function in `_common.sh`:

1. Extracts T1 1mm, T1 2mm, brain, and brain mask from `brainlife/fsl`
2. Attempts to extract a T2 1mm template (falls back to T1 2mm if unavailable)
3. Downsamples to 6mm via ANTs `ResampleImage` for fast execution
4. Creates a binary brain mask via ANTs `ThresholdImage`

## Running

```bash
# Run all tests
bash utils/mm_tests/run_all.sh

# Run a single test
bash utils/mm_tests/test_01_rigid.sh

# Re-run previously passing tests
bash utils/mm_tests/run_all.sh --rerun-passed
```

## Tests

| Script | What it validates |
|--------|-------------------|
| `test_00_validate.sh` | CWL file passes `cwltool --validate` |
| `test_01_rigid.sh` | Rigid registration (`-t 0`): T1 + T2 at 6mm |
| `test_02_affine.sh` | Affine registration (`-t 1`): T1 + T2 at 6mm |
| `test_03_rigid_deform.sh` | Rigid + small deformation (`-t 2`): checks warp fields are produced |
| `test_04_with_mask.sh` | Affine with brain mask (`-x` flag): validates optional parameter |
| `test_05_diff_modality.sh` | Mismatched voxel grids: T1 6mm reference + T1 2mm input |

## What Each Test Checks

Following the framework in `.claude/testing_rework.md`:

1. **CWL validation** — `cwltool --validate` (all tests via `run_tool`)
2. **Execution** — tool runs to completion with real parameters
3. **Output existence** — `verify_outputs` checks all declared outputs exist
4. **Non-null files** — `check_nonempty` confirms outputs have >0 bytes
5. **Header readable** — `check_nifti_header` via ANTs `PrintHeader` on NIfTI outputs
6. **Warp field presence** — test_03 specifically verifies deformation fields are produced for transform_type=2

## Output Structure

All runtime artifacts are gitignored:

```
utils/mm_tests/
├── jobs/        # Generated YAML input files + cwltool templates
├── out/         # Tool outputs (subdirs per test)
├── logs/        # Stdout/stderr per test
├── data/        # MNI152 templates extracted from FSL container
├── derived/     # Downsampled images and masks
└── summary.tsv  # PASS/FAIL results table
```

## Architecture

This test suite reuses the shared infrastructure from `structural_mri_tests/_common.sh`, which provides:

- `run_tool()` — validates CWL, executes, verifies outputs, logs results
- `verify_outputs()` — Python script parsing cwltool output JSON
- `make_template()` — generates `cwltool --make-template` reference YAML
- `docker_ants()` / `docker_fsl()` — Docker execution wrappers
- `prepare_fsl_data()` — extracts MNI152 templates from FSL container

The local `_common.sh` adds `prepare_mm_data()` and extra verification helpers (`check_nonempty`, `check_nifti_header`).
