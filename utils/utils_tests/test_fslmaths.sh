#!/usr/bin/env bash
# Test: FSL fslmaths (image calculator — arithmetic, thresholding, smoothing)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="fslmaths"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Test 1: Binarize ──────────────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_bin.yml" <<EOF
input:
  class: File
  path: ${T1W}
output: fslmaths_bin_out
bin: true
EOF
run_tool "${TOOL}_bin" "${JOB_DIR}/${TOOL}_bin.yml" "$CWL"

# ── Test 2: Gaussian smoothing (sigma=2mm) ────────────────────
cat > "${JOB_DIR}/${TOOL}_smooth.yml" <<EOF
input:
  class: File
  path: ${T1W}
output: fslmaths_smooth_out
s: 2.0
EOF
run_tool "${TOOL}_smooth" "${JOB_DIR}/${TOOL}_smooth.yml" "$CWL"

# ── Test 3: Lower threshold ───────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_thr.yml" <<EOF
input:
  class: File
  path: ${T1W}
output: fslmaths_thr_out
thr: 1000.0
EOF
run_tool "${TOOL}_thr" "${JOB_DIR}/${TOOL}_thr.yml" "$CWL"

# ── Test 4: Multiply by scalar ────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_mul.yml" <<EOF
input:
  class: File
  path: ${T1W}
output: fslmaths_mul_out
mul_value: 2.0
EOF
run_tool "${TOOL}_mul" "${JOB_DIR}/${TOOL}_mul.yml" "$CWL"

# ── Non-null & header checks ─────────────────────────────────
for t in bin smooth thr mul; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  for f in "$dir"/*.nii*; do
    [[ -f "$f" ]] || continue
    if [[ ! -s "$f" ]]; then
      echo "  WARN: zero-byte output: $f"
    else
      echo "  Header (${t}): $(docker_fsl fslhd "$f" 2>&1 | grep -E '^dim[1-4]' || true)"
    fi
  done
  verify_log "${TOOL}_${t}"
done
