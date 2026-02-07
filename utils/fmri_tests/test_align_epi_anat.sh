#!/usr/bin/env bash
# Test: AFNI align_epi_anat (EPI-to-Anatomical Alignment)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="align_epi_anat"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
epi:
  class: File
  path: "${BOLD_CLIP_RES}"
anat:
  class: File
  path: "${T1_RES}"
epi_base: "0"
epi2anat: true
volreg: "off"
tshift: "off"
anat_has_skull: "no"
epi_strip: "None"
deoblique: "off"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
