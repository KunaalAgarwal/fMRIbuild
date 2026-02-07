#!/usr/bin/env bash
# Test: AFNI 3dTcat (concatenate datasets along time axis)
# Phase 2: requires 4D data — creates it via fslmerge
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="3dTcat"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data
make_template "$CWL" "$TOOL"

# ── Prepare 4D data ──────────────────────────────────────────
MERGED_4D="${DERIVED_DIR}/synthetic_4d.nii.gz"
if [[ ! -f "$MERGED_4D" ]]; then
  echo "Creating synthetic 4D image..."
  docker_fsl fslmerge -t "$MERGED_4D" "$T1W" "$T1W" "$T1W"
fi

# ── Test 1: Simple concatenation ─────────────────────────────
cat > "${JOB_DIR}/${TOOL}_default.yml" <<EOF
input:
  class: File
  path: ${MERGED_4D}
prefix: tcat_out
EOF
run_tool "${TOOL}_default" "${JOB_DIR}/${TOOL}_default.yml" "$CWL"

# ── Test 2: With linear detrending ───────────────────────────
cat > "${JOB_DIR}/${TOOL}_rlt.yml" <<EOF
input:
  class: File
  path: ${MERGED_4D}
prefix: tcat_rlt
rlt: true
EOF
run_tool "${TOOL}_rlt" "${JOB_DIR}/${TOOL}_rlt.yml" "$CWL"

# ── Verify ────────────────────────────────────────────────────
for t in default rlt; do
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
