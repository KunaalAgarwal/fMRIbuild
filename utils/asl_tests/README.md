# ASL Tool Tests

CWL validation and execution tests for the three FSL Arterial Spin Labeling tools: `oxford_asl`, `basil`, and `asl_calib`.

## Prerequisites

- **cwltool** — `pip install cwltool`
- **Docker** — running, with ability to pull `brainlife/fsl:latest`
- **python3**
- **nibabel** (optional) — `pip install nibabel` for NIfTI header validation

## Running Tests

Each tool has its own standalone script. Run from any directory:

```bash
# Run individually
bash utils/asl_tests/test_oxford_asl.sh
bash utils/asl_tests/test_basil.sh
bash utils/asl_tests/test_asl_calib.sh

# Run all three sequentially
bash utils/asl_tests/test_oxford_asl.sh && \
bash utils/asl_tests/test_basil.sh && \
bash utils/asl_tests/test_asl_calib.sh
```

**Note:** `test_asl_calib.sh` depends on `oxford_asl` perfusion output. If that output doesn't exist yet, it will automatically run `test_oxford_asl.sh` first.

## Test Data

Test data is **synthesized automatically** from MNI152 templates inside the FSL Docker container — no manual downloads needed. On first run, `prepare_asl_data()` creates:

| File | Location | Description |
|------|----------|-------------|
| ASL 4D volume | `data/asl_synthetic.nii.gz` | 4-volume tag/control pairs (MNI152 brain scaled to 0.95/1.0) |
| M0 calibration | `data/m0_calib.nii.gz` | Copy of MNI152 brain volume |
| ASL difference | `derived/asl_diff.nii.gz` | Control minus tag (for BASIL input) |
| Brain mask | `derived/brain_mask.nii.gz` | Binarized MNI152 brain |
| T1 structural | `data/MNI152_T1_2mm.nii.gz` | MNI152 template from FSL container |

Data preparation is idempotent — files are only created if they don't already exist.

## What Each Script Tests

### `test_oxford_asl.sh`

| Parameter Set | Description |
|---------------|-------------|
| `oxford_asl_pcasl` | Minimal pCASL: `--casl --iaf tc --tis 3.6 --bolus 1.8` |
| `oxford_asl_calib` | pCASL + calibration image + structural T1 |
| `oxford_asl_pasl` | PASL mode: `--pasl --iaf tc --tis 1.8 --bolus 0.7` |

**Validated outputs:** `native_space/perfusion.nii.gz`, `native_space/arrival.nii.gz`

### `test_basil.sh`

| Parameter Set | Description |
|---------------|-------------|
| `basil_pcasl` | Minimal pCASL with difference data input |
| `basil_spatial` | pCASL + spatial regularisation + brain mask |
| `basil_pasl` | PASL mode |

**Validated outputs:** `mean_ftiss.nii.gz`

### `test_asl_calib.sh`

| Parameter Set | Description |
|---------------|-------------|
| `asl_calib_voxel` | Voxelwise calibration mode, TR=4.8s |
| `asl_calib_longtr` | Long TR mode with structural, TR=6.0s, TE=14ms |

**Validated outputs:** `calib_voxel.nii.gz`, `calib_longtr.nii.gz`

## Validation Checks

Each test performs (per `testing_rework.md` criteria):

1. **CWL validation** — `cwltool --validate` on the CWL file
2. **Execution** — runs the tool with cwltool inside Docker
3. **Output existence** — verifies expected files are present in `outputs.json`
4. **Non-null check** — confirms output files have non-zero size
5. **NIfTI header check** — reads headers with nibabel to confirm valid images (skipped if nibabel not installed)

## Output Structure

All runtime artifacts are gitignored:

```
utils/asl_tests/
├── jobs/          # Generated YAML job files
├── out/           # cwltool output per tool variant
├── logs/          # Per-variant .log files
├── data/          # Synthesized test data
├── derived/       # Intermediate files (diff images, masks)
└── summary.tsv    # PASS/FAIL results table
```

## Results

After running, check `summary.tsv` for a quick overview:

```
oxford_asl_pcasl    PASS
oxford_asl_calib    PASS
basil_pcasl         PASS
...
```

For detailed output on failures, check the corresponding log in `logs/`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FSL_DOCKER_IMAGE` | `brainlife/fsl:latest` | FSL Docker image to use |
| `DOCKER_PLATFORM` | _(empty)_ | Docker platform override (e.g. `linux/amd64` for Apple Silicon) |
| `CWLTOOL_BIN` | `cwltool` | Path to cwltool binary |
