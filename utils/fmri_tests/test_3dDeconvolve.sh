#!/usr/bin/env bash
# Test: AFNI 3dDeconvolve (Hemodynamic Response Deconvolution)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dDeconvolve"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${BOLD_CLIP_RES}"
bucket: "deconvolve"
polort: "0"
num_stimts: 1
stim_file:
  - index: 1
    file:
      class: File
      path: "${STIM_1D}"
stim_label:
  - index: 1
    label: "stim"
x1D: "deconvolve.xmat.1D"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_afni "${TOOL_OUT}/deconvolve+orig.HEAD"
verify_file_optional "${TOOL_OUT}/deconvolve.xmat.1D"
verify_log "$TOOL"
