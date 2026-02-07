#!/usr/bin/env bash
# Download and prepare all test data for fMRI CWL tests.
# Run this once before running individual tests.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

echo "=== Setting up fMRI test data ==="

echo "--- Downloading OpenNeuro ds002979 and deriving fMRI data ---"
prepare_fmri_data

echo "--- Preparing AFNI-specific data ---"
prepare_afni_fmri_data

echo "--- Preparing AFNI templates ---"
prepare_afni_templates

echo "--- Preparing ANTs-specific data ---"
prepare_ants_fmri_data

echo "--- Preparing FreeSurfer data ---"
prepare_freesurfer_data || echo "WARN: FreeSurfer data setup failed (license needed)"

echo "=== Data setup complete ==="
