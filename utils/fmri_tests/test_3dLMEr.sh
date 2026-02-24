#!/usr/bin/env bash
# Test: AFNI 3dLMEr (Linear Mixed-Effects with R formula)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dLMEr"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
prefix: "lmerr_out"
table:
  - subj: "S1"
    cond: "A"
    input_file:
      class: File
      path: "${SUBJ1_A}"
  - subj: "S1"
    cond: "B"
    input_file:
      class: File
      path: "${SUBJ1_B}"
  - subj: "S2"
    cond: "A"
    input_file:
      class: File
      path: "${SUBJ2_A}"
  - subj: "S2"
    cond: "B"
    input_file:
      class: File
      path: "${SUBJ2_B}"
model: "Cond+(1|Subj)"
mask:
  class: File
  path: "${LME_MASK}"
jobs: 1
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_afni "${TOOL_OUT}/lmerr_out+orig.HEAD"
verify_log "$TOOL"
