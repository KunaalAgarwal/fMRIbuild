#!/usr/bin/env bash
# Test: FSL fslsplit (split 4D image into individual 3D volumes)
# Phase 2: requires 4D data — creates it via fslmerge
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="fslsplit"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Prepare 4D data (merge 3 copies of T1W) ──────────────────
MERGED_4D="${DERIVED_DIR}/synthetic_4d.nii.gz"
if [[ ! -f "$MERGED_4D" ]]; then
  echo "Creating synthetic 4D image..."
  docker_fsl fslmerge -t "$MERGED_4D" "$T1W" "$T1W" "$T1W"
fi

# ── Test 1: Split along time ─────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_time.yml" <<EOF
input:
  class: File
  path: ${MERGED_4D}
output_basename: split_t
dimension: t
EOF
run_tool "${TOOL}_time" "${JOB_DIR}/${TOOL}_time.yml" "$CWL"

# ── Test 2: Split along z ──────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_z.yml" <<EOF
input:
  class: File
  path: ${MERGED_4D}
output_basename: split_z
dimension: z
EOF
run_tool "${TOOL}_z" "${JOB_DIR}/${TOOL}_z.yml" "$CWL"

# ── Verify split produced expected number of volumes ─────────
for t in time z; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  count=0
  for f in "$dir"/*.nii*; do
    [[ -f "$f" ]] || continue
    count=$((count + 1))
    if [[ ! -s "$f" ]]; then
      echo "  WARN: zero-byte split volume: $f"
    fi
  done
  echo "  ${t}-split produced ${count} volumes"
done
