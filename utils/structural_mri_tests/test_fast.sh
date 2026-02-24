#!/usr/bin/env bash
# Test: FSL fast (FMRIB's Automated Segmentation Tool)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fast"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data

# Use the 2mm brain-extracted image to keep memory usage manageable.
# The 1mm brain causes Docker OOM on systems with limited RAM.
FAST_INPUT="$T1W_2MM_BRAIN"
if [[ ! -f "$FAST_INPUT" ]]; then
  # Fallback: use bet output from 2mm
  echo "Running prerequisite: bet on 2mm T1..."
  docker_fsl bet "$T1W_2MM" "${DERIVED_DIR}/bet_2mm_out" -R
  FAST_INPUT="${DERIVED_DIR}/bet_2mm_out.nii.gz"
fi
[[ -f "$FAST_INPUT" ]] || die "Missing brain-extracted input for fast"

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${FAST_INPUT}"
output: "fast_out"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_nifti "${TOOL_OUT}/fast_out_seg.nii.gz"
verify_nifti_optional "${TOOL_OUT}/fast_out_pve_0.nii.gz"
verify_nifti_optional "${TOOL_OUT}/fast_out_pve_1.nii.gz"
verify_nifti_optional "${TOOL_OUT}/fast_out_pve_2.nii.gz"
verify_log "$TOOL"
