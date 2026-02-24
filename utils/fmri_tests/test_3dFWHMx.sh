#!/usr/bin/env bash
# Test: AFNI 3dFWHMx (Estimate Smoothness / FWHM)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dFWHMx"
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
mask:
  class: File
  path: "${AFNI_BOLD_MASK}"
out: "fwhm_out.1D"
acf: "fwhm_acf.1D"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_file "${TOOL_OUT}/fwhm_out.1D"
verify_file_optional "${TOOL_OUT}/fwhm_acf.1D"
verify_log "$TOOL"
