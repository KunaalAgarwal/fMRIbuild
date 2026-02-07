#!/usr/bin/env bash
# Test: FSL fslroi (extract region of interest — spatial/temporal subvolume)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="fslroi"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Test 1: Spatial ROI (central cube) ────────────────────────
cat > "${JOB_DIR}/${TOOL}_spatial.yml" <<EOF
input:
  class: File
  path: ${T1W}
output: fslroi_spatial_out
x_min: 40
x_size: 100
y_min: 40
y_size: 100
z_min: 40
z_size: 100
EOF
run_tool "${TOOL}_spatial" "${JOB_DIR}/${TOOL}_spatial.yml" "$CWL"

# ── Test 2: Single slice extraction ───────────────────────────
cat > "${JOB_DIR}/${TOOL}_slice.yml" <<EOF
input:
  class: File
  path: ${T1W}
output: fslroi_slice_out
x_min: 0
x_size: 182
y_min: 0
y_size: 218
z_min: 90
z_size: 1
EOF
run_tool "${TOOL}_slice" "${JOB_DIR}/${TOOL}_slice.yml" "$CWL"

# ── Non-null & header checks ─────────────────────────────────
for t in spatial slice; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  for f in "$dir"/*.nii*; do
    [[ -f "$f" ]] || continue
    if [[ ! -s "$f" ]]; then
      echo "  WARN: zero-byte output: $f"
    else
      echo "  Header (${t}): $(docker_fsl fslhd "$f" 2>&1 | grep -E '^dim[1-4]' || true)"
    fi
  done
done
