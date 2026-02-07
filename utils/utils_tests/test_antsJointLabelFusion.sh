#!/usr/bin/env bash
# Test: ANTs antsJointLabelFusion.sh (multi-atlas label fusion for segmentation)
# Phase 3: computationally expensive — uses downsampled data and minimal atlases
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="antsJointLabelFusion"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_ants_data
make_template "$CWL" "$TOOL"

# ── Prepare: create minimal atlas/label pairs ────────────────
# Use the downsampled T1 as both "atlas" images (identity test)
# Create simple label images from the segmentation
ATLAS1="${T1_RES}"
LABEL1="${ANTS_SEGMENTATION}"

# Create a second slightly different atlas (smoothed version)
ATLAS2="${DERIVED_DIR}/atlas2_smooth.nii.gz"
LABEL2="${ANTS_SEGMENTATION}"
if [[ ! -f "$ATLAS2" ]]; then
  echo "Creating smoothed atlas variant..."
  docker_ants SmoothImage 3 "$T1_RES" 1.0 "$ATLAS2"
fi

# ── Test 1: Joint label fusion with 2 atlases ───────────────
cat > "${JOB_DIR}/${TOOL}_default.yml" <<EOF
dimensionality: 3
output_prefix: jlf_out
target_image:
  class: File
  path: ${T1_RES}
atlas_images:
  - class: File
    path: ${ATLAS1}
  - class: File
    path: ${ATLAS2}
atlas_labels:
  - class: File
    path: ${LABEL1}
  - class: File
    path: ${LABEL2}
EOF
run_tool "${TOOL}_default" "${JOB_DIR}/${TOOL}_default.yml" "$CWL"

# ── Non-null & header checks ─────────────────────────────────
dir="${OUT_DIR}/${TOOL}_default"
for f in "$dir"/*.nii*; do
  [[ -f "$f" ]] || continue
  if [[ ! -s "$f" ]]; then
    echo "  WARN: zero-byte: $f"
  else
    echo "  Header: $(docker_fsl fslhd "$f" 2>&1 | grep -E '^dim[1-4]' || true)"
  fi
done
