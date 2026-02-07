#!/usr/bin/env bash
# Test: AFNI 3dMVM (Multivariate Modeling)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dMVM"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
prefix: "mvm_out"
table:
  - subj: "S1"
    group: "G1"
    cond: "A"
    input_file:
      class: File
      path: "${SUBJ1_A}"
  - subj: "S1"
    group: "G1"
    cond: "B"
    input_file:
      class: File
      path: "${SUBJ1_B}"
  - subj: "S2"
    group: "G2"
    cond: "A"
    input_file:
      class: File
      path: "${SUBJ2_A}"
  - subj: "S2"
    group: "G2"
    cond: "B"
    input_file:
      class: File
      path: "${SUBJ2_B}"
bsVars: "Group"
wsVars: "Cond"
mask:
  class: File
  path: "${LME_MASK}"
jobs: 1
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
