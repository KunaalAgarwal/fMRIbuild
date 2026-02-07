#!/usr/bin/env bash
# Test: AFNI 3dinfo (display dataset header information)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="3dinfo"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data
make_template "$CWL" "$TOOL"

# ── Test 1: Default info ─────────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_default.yml" <<EOF
input:
  class: File
  path: ${T1W}
EOF
run_tool "${TOOL}_default" "${JOB_DIR}/${TOOL}_default.yml" "$CWL"

# ── Test 2: Verbose info ─────────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_verbose.yml" <<EOF
input:
  class: File
  path: ${T1W}
verb: true
EOF
run_tool "${TOOL}_verbose" "${JOB_DIR}/${TOOL}_verbose.yml" "$CWL"

# ── Verify stdout output is non-empty ────────────────────────
for t in default verbose; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  # 3dinfo writes to stdout, captured in outputs.json
  out="${dir}/outputs.json"
  if [[ -f "$out" && -s "$out" ]]; then
    echo "  ${t}: stdout output captured"
  else
    echo "  WARN: ${t} output missing or empty"
  fi
done
