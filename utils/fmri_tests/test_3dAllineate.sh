#!/usr/bin/env bash
# Test: AFNI 3dAllineate (Affine Registration)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dAllineate"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
source:
  class: File
  path: "${AFNI_BOLD_MEAN}"
base:
  class: File
  path: "${T1_RES}"
prefix: "allineate"
warp: shift_rotate
onepass: true
oned_matrix_save: "allineate.aff12.1D"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_afni "${TOOL_OUT}/allineate+orig.HEAD"
verify_file "${TOOL_OUT}/allineate.aff12.1D"
verify_log "$TOOL"
