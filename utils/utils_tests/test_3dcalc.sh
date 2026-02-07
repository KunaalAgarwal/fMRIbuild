#!/usr/bin/env bash
# Test: AFNI 3dcalc (voxelwise calculator with arbitrary expressions)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="3dcalc"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data
make_template "$CWL" "$TOOL"

# ── Test 1: Identity copy ────────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_copy.yml" <<EOF
a:
  class: File
  path: ${T1W}
expr: "a"
prefix: calc_copy
EOF
run_tool "${TOOL}_copy" "${JOB_DIR}/${TOOL}_copy.yml" "$CWL"

# ── Test 2: Scale intensities by 2 ──────────────────────────
cat > "${JOB_DIR}/${TOOL}_scale.yml" <<EOF
a:
  class: File
  path: ${T1W}
expr: "a*2"
prefix: calc_scale
EOF
run_tool "${TOOL}_scale" "${JOB_DIR}/${TOOL}_scale.yml" "$CWL"

# ── Test 3: Threshold (step function) ────────────────────────
cat > "${JOB_DIR}/${TOOL}_thresh.yml" <<EOF
a:
  class: File
  path: ${T1W}
expr: "step(a-1000)*a"
prefix: calc_thresh
EOF
run_tool "${TOOL}_thresh" "${JOB_DIR}/${TOOL}_thresh.yml" "$CWL"

# ── Verify AFNI outputs ──────────────────────────────────────
for t in copy scale thresh; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  for f in "$dir"/*.HEAD; do
    [[ -f "$f" ]] || continue
    if [[ ! -s "$f" ]]; then
      echo "  WARN: zero-byte: $f"
    else
      echo "  Header (${t}): $(docker_afni 3dinfo "$f" 2>&1 | head -3 || true)"
    fi
  done
done
