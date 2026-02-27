#!/usr/bin/env bash
# Test: wb_command -cifti-create-dense-timeseries (Create CIFTI from Surface Data)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="wb_command_cifti_create_dense_timeseries"
LIB="connectome_workbench"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

setup_dirs
prepare_wb_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
cifti_out: test.dtseries.nii
left_metric:
  class: File
  path: ${WB_TS_METRIC_L}
right_metric:
  class: File
  path: ${WB_TS_METRIC_R}
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ─────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
dir="${OUT_DIR}/${TOOL}"
CIFTI_OUT="${dir}/test.dtseries.nii"

verify_cifti "$CIFTI_OUT"

# Save CIFTI path for dependent tests
if [[ -f "$CIFTI_OUT" ]]; then
  echo "$CIFTI_OUT" > "${DERIVED_DIR}/cifti_dtseries_path.txt"
fi
verify_log "$TOOL"
verify_file_optional "${dir}/wb_cifti_create_dense_timeseries.err.log"
