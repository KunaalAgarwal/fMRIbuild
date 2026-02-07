#!/usr/bin/env bash
# Test: AFNI 3dfractionize (Resample Mask to New Grid)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dfractionize"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
template:
  class: File
  path: "${T1_RES}"
input:
  class: File
  path: "${AFNI_BOLD_MASK}"
prefix: "fractionize"
clip: 0.2
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
