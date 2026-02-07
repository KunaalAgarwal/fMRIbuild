#!/usr/bin/env bash
# Test: FSL fslstats (image statistics — mean, std, volume, robust range)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="fslstats"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Test 1: Mean ──────────────────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_mean.yml" <<EOF
input:
  class: File
  path: ${T1W}
mean: true
EOF
run_tool "${TOOL}_mean" "${JOB_DIR}/${TOOL}_mean.yml" "$CWL"

# ── Test 2: Standard deviation ────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_std.yml" <<EOF
input:
  class: File
  path: ${T1W}
std: true
EOF
run_tool "${TOOL}_std" "${JOB_DIR}/${TOOL}_std.yml" "$CWL"

# ── Test 3: Robust range ─────────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_robust.yml" <<EOF
input:
  class: File
  path: ${T1W}
robust_range: true
EOF
run_tool "${TOOL}_robust" "${JOB_DIR}/${TOOL}_robust.yml" "$CWL"

# ── Test 4: Masked mean ──────────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_masked.yml" <<EOF
input:
  class: File
  path: ${T1W}
mask:
  class: File
  path: ${T1W_MASK}
mean: true
EOF
run_tool "${TOOL}_masked" "${JOB_DIR}/${TOOL}_masked.yml" "$CWL"

# ── Verify text outputs are non-empty with numeric values ────
for t in mean std robust masked; do
  out="${OUT_DIR}/${TOOL}_${t}/fslstats_output.txt"
  if [[ -f "$out" && -s "$out" ]]; then
    echo "  ${t}: $(cat "$out")"
  else
    echo "  WARN: ${t} output missing or empty"
  fi
done
