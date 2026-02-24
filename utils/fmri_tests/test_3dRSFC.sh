#!/usr/bin/env bash
# Test: AFNI 3dRSFC (Resting-State Functional Connectivity)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dRSFC"
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
prefix: "rsfc"
fbot: 0.01
ftop: 0.1
mask:
  class: File
  path: "${AFNI_BOLD_MASK}"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_afni "${TOOL_OUT}/rsfc_LFF+orig.HEAD"
verify_afni_optional "${TOOL_OUT}/rsfc_ALFF+orig.HEAD"
verify_afni_optional "${TOOL_OUT}/rsfc_fALFF+orig.HEAD"
verify_afni_optional "${TOOL_OUT}/rsfc_RSFA+orig.HEAD"
verify_log "$TOOL"
