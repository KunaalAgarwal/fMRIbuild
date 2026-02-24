#!/usr/bin/env bash
# Test 03: Rigid + small deformation (transform_type=2) — T1 + T2
# This transform type should produce warp fields in addition to affine.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="antsIntermodalityIntrasubject"
NAME="${TOOL}_rigid_deform"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"
PREFIX="test_rigdef_"

prepare_mm_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${NAME}.yml" <<EOF
dimensionality: 3
input_image:
  class: File
  path: "${MM_T2}"
reference_image:
  class: File
  path: "${MM_T1}"
output_prefix: "${PREFIX}"
transform_type: "2"
brain_mask:
  class: File
  path: "${MM_MASK}"
EOF

run_tool "$NAME" "${JOB_DIR}/${NAME}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
TOOL_OUT="${OUT_DIR}/${NAME}"
if [[ -d "$TOOL_OUT" ]]; then
  verify_nifti "${TOOL_OUT}/${PREFIX}anatomical.nii.gz"
  verify_file "${TOOL_OUT}/${PREFIX}0GenericAffine.mat"

  # Warp fields should exist for transform_type 2 (rigid + small deformation)
  verify_nifti_optional "${TOOL_OUT}/${PREFIX}1Warp.nii.gz"
  verify_nifti_optional "${TOOL_OUT}/${PREFIX}1InverseWarp.nii.gz"
fi
verify_log "$NAME"
