#!/usr/bin/env bash
# Test: FSL fslmeants (extract mean time series from 4D image)
# Phase 2: requires 4D data — creates it via fslmerge
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="fslmeants"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Prepare 4D data ──────────────────────────────────────────
MERGED_4D="${DERIVED_DIR}/synthetic_4d.nii.gz"
if [[ ! -f "$MERGED_4D" ]]; then
  echo "Creating synthetic 4D image..."
  docker_fsl fslmerge -t "$MERGED_4D" "$T1W" "$T1W" "$T1W"
fi

# ── Test 1: Whole-brain mean time series ─────────────────────
cat > "${JOB_DIR}/${TOOL}_whole.yml" <<EOF
input:
  class: File
  path: ${MERGED_4D}
output: fslmeants_whole.txt
EOF
run_tool "${TOOL}_whole" "${JOB_DIR}/${TOOL}_whole.yml" "$CWL"

# ── Test 2: Masked time series ───────────────────────────────
cat > "${JOB_DIR}/${TOOL}_masked.yml" <<EOF
input:
  class: File
  path: ${MERGED_4D}
output: fslmeants_masked.txt
mask:
  class: File
  path: ${T1W_MASK}
EOF
run_tool "${TOOL}_masked" "${JOB_DIR}/${TOOL}_masked.yml" "$CWL"

# ── Verify text outputs ──────────────────────────────────────
for t in whole masked; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  for f in "$dir"/*.txt; do
    [[ -f "$f" ]] || continue
    if [[ -s "$f" ]]; then
      echo "  ${t}: $(wc -l < "$f") lines — first: $(head -1 "$f")"
    else
      echo "  WARN: ${t} output empty"
    fi
  done
done
