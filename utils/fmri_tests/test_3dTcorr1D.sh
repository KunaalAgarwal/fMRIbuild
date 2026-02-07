#!/usr/bin/env bash
# Test: AFNI 3dTcorr1D (Voxelwise Correlation with 1D File)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dTcorr1D"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
xset:
  class: File
  path: "${BOLD_CLIP_RES}"
y1D:
  class: File
  path: "${STIM_1D}"
prefix: "tcorr1d"
mask:
  class: File
  path: "${AFNI_BOLD_MASK}"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
