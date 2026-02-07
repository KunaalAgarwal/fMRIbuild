#!/usr/bin/env bash
# Test: FSL cluster (Cluster-based Thresholding)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="cluster"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Try to find randomise tstat output first, fall back to fslmaths output
CLUSTER_INPUT="$(first_match \
  "${OUT_DIR}/randomise/randomise_out_tstat1.nii.gz" \
  "${OUT_DIR}/randomise/randomise_out_tstat1.nii" \
  2>/dev/null || true)"

if [[ -z "$CLUSTER_INPUT" ]]; then
  # Fall back to fslmaths constant image
  CLUSTER_INPUT="$(first_match \
    "${OUT_DIR}/fslmaths/fslmaths_const.nii.gz" \
    "${OUT_DIR}/fslmaths/fslmaths_const.nii" \
    2>/dev/null || true)"
fi

if [[ -z "$CLUSTER_INPUT" ]]; then
  echo "Running prerequisite: fslmaths..."
  bash "${SCRIPT_DIR}/test_fslmaths.sh"
  CLUSTER_INPUT="$(first_match \
    "${OUT_DIR}/fslmaths/fslmaths_const.nii.gz" \
    "${OUT_DIR}/fslmaths/fslmaths_const.nii")"
fi

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${CLUSTER_INPUT}"
threshold: 1.0
oindex: "cluster_index"
othresh: "cluster_thresh"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
