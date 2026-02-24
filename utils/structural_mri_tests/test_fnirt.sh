#!/usr/bin/env bash
# Test: FSL fnirt (FMRIB's Non-linear Image Registration Tool)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fnirt"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data

# Generate a 2mm→2mm affine first (fnirt with 1mm input causes OOM
# on systems with limited RAM). We create a quick flirt alignment
# between the 2mm T1 and itself to produce an identity-like matrix.
FNIRT_AFFINE="${DERIVED_DIR}/fnirt_flirt_2mm.mat"
if [[ ! -f "$FNIRT_AFFINE" ]]; then
  echo "Creating 2mm affine matrix for fnirt..."
  docker_fsl flirt \
    -in "$T1W_2MM" -ref "$T1W_2MM" \
    -omat "$FNIRT_AFFINE" -dof 12
fi
[[ -f "$FNIRT_AFFINE" ]] || die "Failed to create affine matrix"

# Generate template for reference
make_template "$CWL" "$TOOL"

# Use 2mm→2mm non-linear registration to keep memory manageable.
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${T1W_2MM}"
reference:
  class: File
  path: "${T1W_2MM}"
affine:
  class: File
  path: "${FNIRT_AFFINE}"
cout: "fnirt_coeff"
iout: "fnirt_warped"
fout: "fnirt_field"
EOF

if [[ -f "$T1W_2MM_MASK" ]]; then
  cat >> "${JOB_DIR}/${TOOL}.yml" <<EOF
refmask:
  class: File
  path: "${T1W_2MM_MASK}"
EOF
fi

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_nifti_optional "${TOOL_OUT}/fnirt_warped.nii.gz"
verify_nifti_optional "${TOOL_OUT}/fnirt_coeff.nii.gz"
verify_nifti_optional "${TOOL_OUT}/fnirt_field.nii.gz"
verify_log "$TOOL"
