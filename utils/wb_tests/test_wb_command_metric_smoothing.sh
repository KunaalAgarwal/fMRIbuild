#!/usr/bin/env bash
# Test: wb_command -metric-smoothing (Geodesic Gaussian Surface Smoothing)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="wb_command_metric_smoothing"
LIB="connectome_workbench"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

setup_dirs
prepare_wb_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
surface:
  class: File
  path: ${WB_SPHERE_L}
metric_in:
  class: File
  path: ${WB_METRIC_L}
smoothing_kernel: 2.0
metric_out: smoothed.func.gii
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ─────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_gifti "${TOOL_OUT}/smoothed.func.gii"
verify_log "$TOOL"
