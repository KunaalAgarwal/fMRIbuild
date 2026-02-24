#!/usr/bin/env bash
# Test: AFNI 3dMEMA (Mixed-Effects Meta-Analysis)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dMEMA"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
prefix: "mema_out"
set:
  - setname: "GroupA"
    subject: "S1"
    beta:
      class: File
      path: "${BETA1}"
    tstat:
      class: File
      path: "${TSTAT1}"
  - setname: "GroupA"
    subject: "S2"
    beta:
      class: File
      path: "${BETA2}"
    tstat:
      class: File
      path: "${TSTAT2}"
mask:
  class: File
  path: "${AFNI_BOLD_MASK}"
jobs: 1
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_afni "${TOOL_OUT}/mema_out+orig.HEAD"
verify_log "$TOOL"
