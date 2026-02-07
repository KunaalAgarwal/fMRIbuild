#!/usr/bin/env bash
# Test: AFNI SSwarper (Skull-Stripping and Warping)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="SSwarper"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_templates

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${T1_RES}"
base:
  class: File
  path: "${SSW_TEMPLATE_MULTI}"
subid: "sub016"
odir: "."
minp: 5
warpscale: 0.2
unifize_off: true
aniso_off: true
ceil_off: true
init_skullstr_off: true
extra_qc_off: true
skipwarp: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
