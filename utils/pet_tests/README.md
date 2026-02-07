# PET Tool CWL Tests

CWL verification tests for PET imaging tools. Currently covers `mri_gtmpvc` (FreeSurfer).

## Prerequisites

- **cwltool**: `pip install cwltool`
- **docker**: Running with ability to pull `freesurfer/freesurfer:7.4.1`
- **python3**: For output verification
- **FreeSurfer license**: Set `FS_LICENSE` env var to your `license.txt` path, or place it at `tests/data/freesurfer/license.txt`
- **Test data**: The `bert` FreeSurfer subject — auto-downloaded on first run via `utils/download_freesurfer_test_data.sh`

## Running

```bash
# From the repo root
bash utils/pet_tests/test_mri_gtmpvc.sh

# Re-run previously passed tests
bash utils/pet_tests/test_mri_gtmpvc.sh --rerun-passed
```

## What it tests

`test_mri_gtmpvc.sh` runs 5 parameter sets against a synthetic PET image (created from `bert/mri/brain.mgz`):

| Set | Description | Key flags |
|-----|-------------|-----------|
| A | Minimal with regheader | `--psf 4 --regheader` |
| B | Higher PSF | `--psf 6 --regheader` |
| C | No rescale | `--psf 4 --regheader --no-rescale` |
| D | Auto-mask | `--psf 4 --regheader --auto-mask 0.1` |
| E | No reduce FOV | `--psf 4 --regheader --no-reduce-fov` |

Each set validates:
1. CWL file passes `cwltool --validate`
2. Tool executes successfully via cwltool + Docker
3. Expected output files exist (output directory, gtm.stats.dat, logs)

## Output structure

```
pet_tests/
├── jobs/           # Generated job YAML files (gitignored)
├── out/            # Tool output directories (gitignored)
├── logs/           # Execution logs (gitignored)
├── data/           # Downloaded/copied test data (gitignored)
├── derived/        # Synthetic PET image (gitignored)
└── summary.tsv     # PASS/FAIL results table (gitignored)
```

## Shared infrastructure

Test scripts source `utils/structural_mri_tests/_common.sh` which provides:
- Docker helpers (`docker_fs`, `copy_from_fs_image`)
- FreeSurfer data preparation (`prepare_freesurfer_data`)
- CWL template generation (`make_template`)
- Tool execution and output verification (`run_tool`, `verify_outputs`)
