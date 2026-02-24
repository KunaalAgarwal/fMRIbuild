#!/usr/bin/env bash
# Test: AFNI 3dfractionize (resample mask/ROI using fractional occupancy)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="3dfractionize"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data
make_template "$CWL" "$TOOL"

# ── Test 1: Default clip threshold (0.5) ─────────────────────
cat > "${JOB_DIR}/${TOOL}_default.yml" <<EOF
template:
  class: File
  path: ${T1W_2MM}
input:
  class: File
  path: ${T1W_MASK}
prefix: frac_default
clip: 0.5
EOF
run_tool "${TOOL}_default" "${JOB_DIR}/${TOOL}_default.yml" "$CWL"

# ── Test 2: Strict clip (0.9) ────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_strict.yml" <<EOF
template:
  class: File
  path: ${T1W_2MM}
input:
  class: File
  path: ${T1W_MASK}
prefix: frac_strict
clip: 0.9
EOF
run_tool "${TOOL}_strict" "${JOB_DIR}/${TOOL}_strict.yml" "$CWL"

# ── Verify ────────────────────────────────────────────────────
for t in default strict; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  for f in "$dir"/*.HEAD; do
    [[ -f "$f" ]] || continue
    if [[ ! -s "$f" ]]; then
      echo "  WARN: zero-byte: $f"
    else
      echo "  Header (${t}): $(docker_afni 3dinfo "$f" 2>&1 | head -3 || true)"
    fi
  done
  verify_log "${TOOL}_${t}"
done
