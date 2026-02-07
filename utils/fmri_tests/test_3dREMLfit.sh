#!/usr/bin/env bash
# Test: AFNI 3dREMLfit (REML Estimation for FMRI)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dREMLfit"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_fmri_data

make_template "$CWL" "$TOOL"

# 3dREMLfit depends on 3dDeconvolve output (X-matrix)
XMAT_FILE="$(first_match \
  "${OUT_DIR}/3dDeconvolve"/*xmat*.1D \
  "${OUT_DIR}/3dDeconvolve"/*.xmat.1D \
  || true)"

if [[ -z "$XMAT_FILE" ]]; then
  echo "3dDeconvolve output not found; running 3dDeconvolve first..."
  bash "${SCRIPT_DIR}/test_3dDeconvolve.sh"
  XMAT_FILE="$(first_match \
    "${OUT_DIR}/3dDeconvolve"/*xmat*.1D \
    "${OUT_DIR}/3dDeconvolve"/*.xmat.1D \
    )" || die "3dDeconvolve X-matrix not found after running prerequisite"
fi

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${BOLD_CLIP_RES}"
matrix:
  class: File
  path: "${XMAT_FILE}"
Rbuck: "remlfit"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
