#!/usr/bin/env bash
# Test: wb_command -surface-sphere-project-unproject (Spherical Registration)
# Uses the same sphere for all 3 inputs (identity transform)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="wb_command_surface_sphere_project_unproject"
LIB="connectome_workbench"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

setup_dirs
prepare_wb_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
sphere_in:
  class: File
  path: ${WB_SPHERE_L}
sphere_project_to:
  class: File
  path: ${WB_SPHERE_L}
sphere_unproject_from:
  class: File
  path: ${WB_SPHERE_L}
sphere_out: output_sphere.surf.gii
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ─────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
dir="${OUT_DIR}/${TOOL}"

verify_gifti "${dir}/output_sphere.surf.gii"
verify_log "$TOOL"
