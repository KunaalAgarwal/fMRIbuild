# Utils CWL Tool Tests

Test suite for all utility-category CWL tools across FSL, AFNI, ANTs, and FreeSurfer.

## Prerequisites

- **cwltool**: CWL reference runner (`pip install cwltool`)
- **Docker**: Required for containerized tool execution
- **python3**: Used for output verification

The structural_mri_tests `_common.sh` infrastructure is shared — it must be present at `../structural_mri_tests/_common.sh` relative to this directory.

### FreeSurfer License

FreeSurfer tools require a valid license file. Set the `FS_LICENSE` environment variable:

```bash
export FS_LICENSE=/path/to/freesurfer/license.txt
```

## Directory Structure

```
utils_tests/
├── README.md               # This file
├── .gitignore              # Ignores outputs, data, logs, jobs
├── test_<tool>.sh          # One test script per tool (30 total)
├── jobs/                   # Generated job YAML files (gitignored)
├── out/                    # Tool outputs (gitignored)
├── logs/                   # Execution logs (gitignored)
├── data/                   # Downloaded test data (gitignored)
├── derived/                # Derived/synthetic test data (gitignored)
└── summary.tsv             # Pass/fail summary (gitignored)
```

## Running Tests

### Run a single tool test

```bash
cd utils/utils_tests
bash test_fslmaths.sh
```

### Run all tests

```bash
cd utils/utils_tests
for script in test_*.sh; do
  echo "=== Running $script ==="
  bash "$script"
done
```

### Run by library

```bash
# FSL utilities only
for script in test_fsl*.sh test_cluster.sh test_applywarp.sh test_invwarp.sh test_convertwarp.sh; do
  bash "$script"
done

# AFNI utilities only
for script in test_3d*.sh test_whereami.sh; do
  bash "$script"
done

# ANTs utilities only
for script in test_N4*.sh test_Denoise*.sh test_Image*.sh test_Threshold*.sh test_antsJoint*.sh test_antsApply*.sh; do
  bash "$script"
done

# FreeSurfer utilities only
bash test_mri_convert.sh
```

### Run by phase

Tests are organized into three phases based on data dependencies:

```bash
# Phase 1: No dependencies (uses MNI152 from FSL container)
for script in test_fslmaths.sh test_fslstats.sh test_fslroi.sh \
              test_fslreorient2std.sh test_fslmerge.sh test_cluster.sh \
              test_3dcalc.sh test_3dinfo.sh test_3dcopy.sh \
              test_3dZeropad.sh test_3dresample.sh test_3dfractionize.sh \
              test_3dUndump.sh test_whereami.sh \
              test_N4BiasFieldCorrection.sh test_DenoiseImage.sh \
              test_ImageMath.sh test_ThresholdImage.sh \
              test_mri_convert.sh; do
  bash "$script"
done

# Phase 2: Needs 4D data (auto-generated via fslmerge)
for script in test_fslsplit.sh test_fslmeants.sh \
              test_3dTstat.sh test_3dTcat.sh; do
  bash "$script"
done

# Phase 3: Needs precomputed transforms/warps (auto-generated)
for script in test_applywarp.sh test_invwarp.sh test_convertwarp.sh \
              test_3dNwarpApply.sh test_3dNwarpCat.sh \
              test_antsApplyTransforms.sh test_antsJointLabelFusion.sh; do
  bash "$script"
done
```

## Test Coverage

Each test script performs:

1. **CWL Validation** — `cwltool --validate` on the tool definition
2. **Template Generation** — `cwltool --make-template` for reference
3. **Execution** — Runs with real neuroimaging data and multiple parameter sets
4. **Output Existence** — Verifies expected output files are produced
5. **Non-null Check** — Confirms output files have size > 0
6. **Header Readability** — For image outputs, verifies headers are parseable

## Tool Inventory (30 tools)

| # | Tool | Library | Phase | Test Script |
|---|------|---------|-------|-------------|
| 1 | fslmaths | FSL | 1 | test_fslmaths.sh |
| 2 | fslstats | FSL | 1 | test_fslstats.sh |
| 3 | fslroi | FSL | 1 | test_fslroi.sh |
| 4 | fslmeants | FSL | 2 | test_fslmeants.sh |
| 5 | fslsplit | FSL | 2 | test_fslsplit.sh |
| 6 | fslmerge | FSL | 1 | test_fslmerge.sh |
| 7 | fslreorient2std | FSL | 1 | test_fslreorient2std.sh |
| 8 | applywarp | FSL | 3 | test_applywarp.sh |
| 9 | invwarp | FSL | 3 | test_invwarp.sh |
| 10 | convertwarp | FSL | 3 | test_convertwarp.sh |
| 11 | cluster | FSL | 1 | test_cluster.sh |
| 12 | 3dcalc | AFNI | 1 | test_3dcalc.sh |
| 13 | 3dTstat | AFNI | 2 | test_3dTstat.sh |
| 14 | 3dinfo | AFNI | 1 | test_3dinfo.sh |
| 15 | 3dcopy | AFNI | 1 | test_3dcopy.sh |
| 16 | 3dZeropad | AFNI | 1 | test_3dZeropad.sh |
| 17 | 3dTcat | AFNI | 2 | test_3dTcat.sh |
| 18 | 3dUndump | AFNI | 1 | test_3dUndump.sh |
| 19 | whereami | AFNI | 1 | test_whereami.sh |
| 20 | 3dresample | AFNI | 1 | test_3dresample.sh |
| 21 | 3dfractionize | AFNI | 1 | test_3dfractionize.sh |
| 22 | 3dNwarpApply | AFNI | 3 | test_3dNwarpApply.sh |
| 23 | 3dNwarpCat | AFNI | 3 | test_3dNwarpCat.sh |
| 24 | N4BiasFieldCorrection | ANTs | 1 | test_N4BiasFieldCorrection.sh |
| 25 | DenoiseImage | ANTs | 1 | test_DenoiseImage.sh |
| 26 | ImageMath | ANTs | 1 | test_ImageMath.sh |
| 27 | ThresholdImage | ANTs | 1 | test_ThresholdImage.sh |
| 28 | antsJointLabelFusion | ANTs | 3 | test_antsJointLabelFusion.sh |
| 29 | antsApplyTransforms | ANTs | 3 | test_antsApplyTransforms.sh |
| 30 | mri_convert | FreeSurfer | 1 | test_mri_convert.sh |

## Test Data

### Automatic Data Preparation

Test data is automatically downloaded/generated on first run:

- **Phase 1**: MNI152 templates extracted from the FSL Docker container
- **Phase 2**: Synthetic 4D images created by merging MNI152 copies via `fslmerge`
- **Phase 3**: Prerequisite transforms/warps generated inline (FLIRT affines, FNIRT warps, ANTs registrations)

### ANTs Data

ANTs tests use downsampled MNI152 images (configurable via `ANTS_TEST_RES_MM`, default 6mm) for faster execution.

### Docker Images

| Library | Default Image | Override Env Var |
|---------|--------------|------------------|
| FSL | brainlife/fsl:latest | `FSL_DOCKER_IMAGE` |
| AFNI | brainlife/afni:latest | `AFNI_DOCKER_IMAGE` |
| ANTs | fnndsc/ants:latest | `ANTS_DOCKER_IMAGE` |
| FreeSurfer | freesurfer/freesurfer:7.4.1 | `FREESURFER_DOCKER_IMAGE` |

## Results

After running, check:

- **summary.tsv** — Tab-separated pass/fail results for each test
- **logs/** — Full execution logs per test
- **out/** — Output files organized by test name

## Troubleshooting

**Docker not running**: Ensure Docker daemon is started and your user has permission.

**CWL validation fails**: Check that CWL files exist in `public/cwl/<library>/`.

**FreeSurfer license error**: Set `FS_LICENSE` to point to a valid `license.txt`.

**Phase 3 tests slow**: Transform generation (FLIRT, FNIRT, antsRegistration) runs once and caches in `derived/`. Subsequent runs reuse cached data.

**AFNI output format**: AFNI tools produce `+orig.HEAD`/`.BRIK` format by default. Verification uses `3dinfo` for these outputs.
