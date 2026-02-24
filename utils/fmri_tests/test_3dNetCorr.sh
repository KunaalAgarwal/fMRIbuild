#!/usr/bin/env bash
# Test: AFNI 3dNetCorr (Network Correlation Analysis)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dNetCorr"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
prefix: "netcorr"
inset:
  class: File
  path: "${BOLD_CLIP_RES}"
in_rois:
  class: File
  path: "${ROI_MASK}"
mask:
  class: File
  path: "${AFNI_BOLD_MASK}"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_file "${TOOL_OUT}/netcorr_000.netcc"
verify_file_optional "${TOOL_OUT}/netcorr_000.netts"
verify_log "$TOOL"
