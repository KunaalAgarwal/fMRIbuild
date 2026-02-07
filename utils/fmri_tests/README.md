# fMRI CWL Test Suite

Individual CWL test scripts for 84 fMRI tools across FSL, ANTs, FreeSurfer, and AFNI.

## Prerequisites

| Dependency | Install |
|-----------|---------|
| `cwltool` | `pip install cwltool` |
| `python3` | System package manager |
| `docker` | [docs.docker.com](https://docs.docker.com/get-docker/) |
| `aws` CLI | [aws.amazon.com/cli](https://aws.amazon.com/cli/) (for data download) |

Docker images are pulled automatically on first run:
- `brainlife/fsl:latest`
- `brainlife/afni:latest`
- `nibuild/afni-test:latest` (for 3dMEMA, 3dLME, 3dLMEr, 3dMVM)
- `fnndsc/ants:latest`
- `freesurfer/freesurfer:7.4.1`

### FreeSurfer License

FreeSurfer tools require a license file. Either:
- Set `FS_LICENSE=/path/to/license.txt`, or
- Place `license.txt` at `tests/data/freesurfer/license.txt`

### Test Data

Test data is downloaded and derived automatically by `setup_data.sh`:
- **Source**: OpenNeuro ds002979 sub-016 (T1w, BOLD, fieldmaps) via `aws s3 sync --no-sign-request`
- **Derived**: BOLD clipped to 20 volumes, 6mm downsampled variants, mean EPI, brain mask, MNI templates, stimulus timing files, design matrices, ROI masks, ANOVA constant volumes, MEMA beta/tstat volumes

## Running Tests

### 1. Set up test data (run once)

```bash
bash utils/fmri_tests/setup_data.sh
```

### 2. Run all 84 tests

```bash
bash utils/fmri_tests/run_all.sh
```

### Run a single tool test

```bash
bash utils/fmri_tests/test_mcflirt.sh
```

Scripts with dependencies (e.g. `test_3dREMLfit.sh` needs `3dDeconvolve` output) will automatically run their prerequisites if the required output files are missing.

### Re-run previously passed tests

```bash
bash utils/fmri_tests/run_all.sh --rerun-passed
```

## What Each Script Does

1. Sources `_common.sh` (shared functions and data prep)
2. Generates a YAML template via `cwltool --make-template` (saved to `jobs/<tool>_template.yml`)
3. Writes a job YAML with concrete parameter values (saved to `jobs/<tool>.yml`)
4. Validates the CWL file (`cwltool --validate`)
5. Runs the tool (`cwltool --outdir`)
6. Verifies that expected output files exist and are non-empty

## Output Structure

All runtime artifacts are gitignored:

```
utils/fmri_tests/
├── _common.sh          # Shared functions and data preparation
├── setup_data.sh       # Downloads and derives all test data
├── run_all.sh          # Runs all tests in dependency order (4 phases)
├── test_*.sh           # Individual test scripts (84 total)
├── jobs/               # Generated YAML files (templates + job inputs)
├── out/<tool>/         # Tool outputs + outputs.json per tool
├── logs/<tool>.log     # cwltool stderr per tool
├── data/               # Downloaded test data (OpenNeuro ds002979)
├── derived/            # Intermediate files (masks, downsampled images, stim files)
└── summary.tsv         # PASS/FAIL/SKIP results table
```

## Execution Phases

Tests run in 4 phases based on dependencies:

- **Phase 1** (72 tools): Independent tools that use BOLD/T1 data directly
- **Phase 2** (9 tools): Depends on Phase 1 outputs (e.g. `3dREMLfit` needs `3dDeconvolve` X-matrix)
- **Phase 3** (5 tools): Depends on Phase 2 outputs (e.g. `convertwarp` needs `fnirt` warp)
- **Phase 4** (2 tools): Depends on Phase 3 outputs (e.g. `applywarp` needs `convertwarp` output)

## Tools Covered

### FSL (26 scripts)

| # | Script | Tool | Category |
|---|--------|------|----------|
| 1 | `test_mcflirt.sh` | mcflirt | Motion correction |
| 2 | `test_slicetimer.sh` | slicetimer | Slice timing correction |
| 3 | `test_fugue.sh` | fugue | Geometric unwarping |
| 4 | `test_topup.sh` | topup | Distortion correction |
| 5 | `test_susan.sh` | susan | Spatial smoothing |
| 6 | `test_bet.sh` | bet | Brain extraction |
| 7 | `test_fast.sh` | fast | Tissue segmentation |
| 8 | `test_flirt.sh` | flirt | Linear registration |
| 9 | `test_fnirt.sh` | fnirt | Non-linear registration |
| 10 | `test_applywarp.sh` | applywarp | Apply warp fields |
| 11 | `test_invwarp.sh` | invwarp | Invert warp fields |
| 12 | `test_convertwarp.sh` | convertwarp | Combine warp fields |
| 13 | `test_melodic.sh` | melodic | ICA decomposition |
| 14 | `test_dual_regression.sh` | dual_regression | Group ICA |
| 15 | `test_film_gls.sh` | film_gls | GLM analysis |
| 16 | `test_flameo.sh` | flameo | Mixed-effects analysis |
| 17 | `test_randomise.sh` | randomise | Permutation testing |
| 18 | `test_cluster.sh` | cluster | Cluster thresholding |
| 19 | `test_fslmaths.sh` | fslmaths | Image calculator |
| 20 | `test_fslstats.sh` | fslstats | Image statistics |
| 21 | `test_fslmeants.sh` | fslmeants | Mean timeseries extraction |
| 22 | `test_fslroi.sh` | fslroi | ROI extraction |
| 23 | `test_fslsplit.sh` | fslsplit | Split 4D to volumes |
| 24 | `test_fslmerge.sh` | fslmerge | Merge volumes to 4D |
| 25 | `test_fslreorient2std.sh` | fslreorient2std | Reorient to standard |
| 26 | `test_fsl_anat.sh` | fsl_anat | Anatomical pipeline |

### AFNI (41 scripts)

| # | Script | Tool | Category |
|---|--------|------|----------|
| 27 | `test_3dvolreg.sh` | 3dvolreg | Motion correction |
| 28 | `test_3dTshift.sh` | 3dTshift | Slice timing correction |
| 29 | `test_3dDespike.sh` | 3dDespike | Despiking |
| 30 | `test_3dBandpass.sh` | 3dBandpass | Bandpass filtering |
| 31 | `test_3dBlurToFWHM.sh` | 3dBlurToFWHM | Spatial smoothing |
| 32 | `test_3dmerge.sh` | 3dmerge | Smoothing/merging |
| 33 | `test_3dSkullStrip.sh` | 3dSkullStrip | Skull stripping |
| 34 | `test_3dAutomask.sh` | 3dAutomask | Brain masking |
| 35 | `test_3dUnifize.sh` | 3dUnifize | Intensity uniformization |
| 36 | `test_3dAllineate.sh` | 3dAllineate | Affine registration |
| 37 | `test_3dQwarp.sh` | 3dQwarp | Nonlinear warping |
| 38 | `test_auto_tlrc.sh` | @auto_tlrc | Talairach transformation |
| 39 | `test_SSwarper.sh` | @SSwarper | Skull-strip + warp |
| 40 | `test_align_epi_anat.sh` | align_epi_anat.py | EPI-anatomical alignment |
| 41 | `test_3dNwarpApply.sh` | 3dNwarpApply | Apply nonlinear warp |
| 42 | `test_3dNwarpCat.sh` | 3dNwarpCat | Concatenate warps |
| 43 | `test_3dDeconvolve.sh` | 3dDeconvolve | HRF deconvolution |
| 44 | `test_3dREMLfit.sh` | 3dREMLfit | REML estimation |
| 45 | `test_3dttest++.sh` | 3dttest++ | Group t-test |
| 46 | `test_3dMEMA.sh` | 3dMEMA | Mixed-effects meta-analysis |
| 47 | `test_3dANOVA.sh` | 3dANOVA | One-way ANOVA |
| 48 | `test_3dANOVA2.sh` | 3dANOVA2 | Two-way ANOVA |
| 49 | `test_3dANOVA3.sh` | 3dANOVA3 | Three-way ANOVA |
| 50 | `test_3dMVM.sh` | 3dMVM | Multivariate modeling |
| 51 | `test_3dLME.sh` | 3dLME | Linear mixed-effects |
| 52 | `test_3dLMEr.sh` | 3dLMEr | LME with R formula |
| 53 | `test_3dClustSim.sh` | 3dClustSim | Cluster simulation |
| 54 | `test_3dFWHMx.sh` | 3dFWHMx | Smoothness estimation |
| 55 | `test_3dNetCorr.sh` | 3dNetCorr | Network correlation |
| 56 | `test_3dTcorr1D.sh` | 3dTcorr1D | Voxelwise correlation |
| 57 | `test_3dTcorrMap.sh` | 3dTcorrMap | Temporal correlation map |
| 58 | `test_3dRSFC.sh` | 3dRSFC | Resting-state FC |
| 59 | `test_3dROIstats.sh` | 3dROIstats | ROI statistics |
| 60 | `test_3dmaskave.sh` | 3dmaskave | Mask average |
| 61 | `test_3dcalc.sh` | 3dcalc | Voxelwise calculator |
| 62 | `test_3dTstat.sh` | 3dTstat | Temporal statistics |
| 63 | `test_3dinfo.sh` | 3dinfo | Dataset information |
| 64 | `test_3dZeropad.sh` | 3dZeropad | Zero-padding |
| 65 | `test_3dTcat.sh` | 3dTcat | Temporal concatenation |
| 66 | `test_3dresample.sh` | 3dresample | Resampling |
| 67 | `test_3dfractionize.sh` | 3dfractionize | Mask resampling |

### ANTs (11 scripts)

| # | Script | Tool | Category |
|---|--------|------|----------|
| 68 | `test_antsMotionCorr.sh` | antsMotionCorr | Motion correction |
| 69 | `test_antsBrainExtraction.sh` | antsBrainExtraction.sh | Brain extraction |
| 70 | `test_N4BiasFieldCorrection.sh` | N4BiasFieldCorrection | Bias field correction |
| 71 | `test_DenoiseImage.sh` | DenoiseImage | Denoising |
| 72 | `test_antsRegistration.sh` | antsRegistration | Registration |
| 73 | `test_antsRegistrationSyN.sh` | antsRegistrationSyN.sh | SyN registration |
| 74 | `test_antsRegistrationSyNQuick.sh` | antsRegistrationSyNQuick.sh | Quick SyN registration |
| 75 | `test_antsIntermodalityIntrasubject.sh` | antsIntermodalityIntrasubject.sh | Cross-modal registration |
| 76 | `test_antsApplyTransforms.sh` | antsApplyTransforms | Apply transforms |
| 77 | `test_ImageMath.sh` | ImageMath | Image math |
| 78 | `test_ThresholdImage.sh` | ThresholdImage | Thresholding |

### FreeSurfer (6 scripts)

| # | Script | Tool | Category |
|---|--------|------|----------|
| 79 | `test_bbregister.sh` | bbregister | Boundary-based registration |
| 80 | `test_mri_convert.sh` | mri_convert | Format conversion |
| 81 | `test_mri_vol2surf.sh` | mri_vol2surf | Volume to surface |
| 82 | `test_mri_surf2vol.sh` | mri_surf2vol | Surface to volume |
| 83 | `test_mris_preproc.sh` | mris_preproc | Surface preprocessing |
| 84 | `test_mri_glmfit.sh` | mri_glmfit | Surface GLM |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FSL_DOCKER_IMAGE` | `brainlife/fsl:latest` | FSL Docker image |
| `AFNI_DOCKER_IMAGE` | `brainlife/afni:latest` | AFNI Docker image |
| `AFNI_TEST_IMAGE` | `nibuild/afni-test:latest` | AFNI test image (R-enabled) |
| `ANTS_DOCKER_IMAGE` | `fnndsc/ants:latest` | ANTs Docker image |
| `FREESURFER_DOCKER_IMAGE` | `freesurfer/freesurfer:7.4.1` | FreeSurfer Docker image |
| `DOCKER_PLATFORM` | *(empty)* | Docker platform override (e.g. `linux/amd64`) |
| `FS_LICENSE` | *(empty)* | Path to FreeSurfer license file |
| `AFNI_OUTPUT_TYPE` | `BRIK` | AFNI output format |
| `AFNI_TEST_RES_MM` | `6` | AFNI test resolution in mm |
| `AFNI_BOLD_CLIP_LEN` | `20` | Number of BOLD volumes to keep |
| `ANTS_NUM_THREADS` | `1` | ANTs thread count |
| `CWLTOOL_BIN` | `cwltool` | Path to cwltool binary |
