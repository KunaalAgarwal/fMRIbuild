#!/usr/bin/env bash
# Test: AFNI 3dZeropad (add zero-padding slices to a dataset)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="3dZeropad"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data
make_template "$CWL" "$TOOL"

# ── Test 1: Symmetric padding (I=5, S=5) ─────────────────────
cat > "${JOB_DIR}/${TOOL}_sym.yml" <<EOF
input:
  class: File
  path: ${T1W}
prefix: zeropad_sym
I: 5
S: 5
EOF
run_tool "${TOOL}_sym" "${JOB_DIR}/${TOOL}_sym.yml" "$CWL"

# ── Test 2: Asymmetric padding (A=10) ────────────────────────
cat > "${JOB_DIR}/${TOOL}_asym.yml" <<EOF
input:
  class: File
  path: ${T1W}
prefix: zeropad_asym
A: 10
EOF
run_tool "${TOOL}_asym" "${JOB_DIR}/${TOOL}_asym.yml" "$CWL"

# ── Verify ────────────────────────────────────────────────────
for t in sym asym; do
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
