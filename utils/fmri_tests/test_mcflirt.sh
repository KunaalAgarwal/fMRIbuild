#!/usr/bin/env bash
# Test: FSL mcflirt (Motion Correction using FLIRT)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mcflirt"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${BOLD}"
output: "mcflirt_out"
save_mats: true
save_plots: true
save_rms: true
stats: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# Required outputs
verify_nifti "${TOOL_OUT}/mcflirt_out.nii.gz"
verify_file_optional "${TOOL_OUT}/mcflirt_out.par"

# Motion parameters
PAR_FILE="${TOOL_OUT}/mcflirt_out.par"
if [[ -f "$PAR_FILE" && -s "$PAR_FILE" ]]; then
  echo "  Motion parameters: $(wc -l < "$PAR_FILE") timepoints"
fi

# Optional outputs (enabled by flags)
verify_nifti_optional "${TOOL_OUT}/mcflirt_out_mean_reg.nii.gz"
verify_nifti_optional "${TOOL_OUT}/mcflirt_out_variance.nii.gz"
verify_nifti_optional "${TOOL_OUT}/mcflirt_out_sigma.nii.gz"
verify_file_optional  "${TOOL_OUT}/mcflirt_out_abs.rms"
verify_file_optional  "${TOOL_OUT}/mcflirt_out_rel.rms"
verify_file_optional  "${TOOL_OUT}/mcflirt_out_abs_mean.rms"
verify_file_optional  "${TOOL_OUT}/mcflirt_out_rel_mean.rms"
verify_directory_optional "${TOOL_OUT}/mcflirt_out.mat"

verify_log "$TOOL"
