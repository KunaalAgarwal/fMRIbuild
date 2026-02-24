#!/usr/bin/env bash
# Test: AFNI 3dresample (resample dataset to different grid/orientation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="3dresample"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data
make_template "$CWL" "$TOOL"

# ── Test 1: Resample to 2mm isotropic ────────────────────────
cat > "${JOB_DIR}/${TOOL}_2mm.yml" <<EOF
input:
  class: File
  path: ${T1W}
prefix: resample_2mm
dxyz:
  - 2.0
  - 2.0
  - 2.0
EOF
run_tool "${TOOL}_2mm" "${JOB_DIR}/${TOOL}_2mm.yml" "$CWL"

# ── Test 2: Change orientation to LPI ────────────────────────
cat > "${JOB_DIR}/${TOOL}_orient.yml" <<EOF
input:
  class: File
  path: ${T1W}
prefix: resample_lpi
orient: LPI
EOF
run_tool "${TOOL}_orient" "${JOB_DIR}/${TOOL}_orient.yml" "$CWL"

# ── Verify ────────────────────────────────────────────────────
for t in 2mm orient; do
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
