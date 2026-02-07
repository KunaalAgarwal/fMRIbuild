#!/usr/bin/env bash
# Test: AFNI whereami (report atlas-based location for coordinates)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="whereami"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data
make_template "$CWL" "$TOOL"

# ── Test 1: Single coordinate lookup (MNI origin) ────────────
cat > "${JOB_DIR}/${TOOL}_coord.yml" <<EOF
coord:
  - 0.0
  - 0.0
  - 0.0
space: MNI
EOF
run_tool "${TOOL}_coord" "${JOB_DIR}/${TOOL}_coord.yml" "$CWL"

# ── Verify stdout ─────────────────────────────────────────────
dir="${OUT_DIR}/${TOOL}_coord"
out="${dir}/outputs.json"
if [[ -f "$out" && -s "$out" ]]; then
  echo "  Coordinate lookup output captured"
else
  echo "  WARN: output missing or empty"
fi
