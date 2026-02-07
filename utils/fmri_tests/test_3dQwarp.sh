#!/usr/bin/env bash
# Test: AFNI 3dQwarp (Nonlinear Warping)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dQwarp"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_templates

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
source:
  class: File
  path: "${T1_RES}"
base:
  class: File
  path: "${SSW_TEMPLATE_RES}"
prefix: "qwarp_out"
allinfast: true
minpatch: 5
maxlev: 0
quiet: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
