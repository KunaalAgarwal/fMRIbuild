#!/usr/bin/env bash
# Test: FreeSurfer mris_sphere (Spherical Mapping)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="mris_sphere"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_freesurfer_data

# Dependency: needs inflated surface from mris_inflate
INFLATED="${OUT_DIR}/mris_inflate/lh.inflated.test"
if [[ ! -f "$INFLATED" ]]; then
  echo "Running prerequisite: mris_inflate..."
  bash "${SCRIPT_DIR}/test_mris_inflate.sh"
fi
[[ -f "$INFLATED" ]] || die "Missing mris_inflate output: ${INFLATED}"

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
subjects_dir:
  class: Directory
  path: "${FS_SUBJECTS_DIR}"
  writable: true
fs_license:
  class: File
  path: "${FS_LICENSE}"
input:
  class: File
  path: "${INFLATED}"
output: "lh.sphere.test"
q: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
dir="${OUT_DIR}/${TOOL}"

verify_surface "${dir}/lh.sphere.test"
verify_log "$TOOL"
