#!/usr/bin/env bash
# Test: FSL fslinfo (display concise image dimensions and voxel sizes)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="fslinfo"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Test 1: 3D T1-weighted image ──────────────────────────────
cat > "${JOB_DIR}/${TOOL}_3d.yml" <<EOF
input:
  class: File
  path: ${T1W}
EOF
run_tool "${TOOL}_3d" "${JOB_DIR}/${TOOL}_3d.yml" "$CWL"

# ── Test 2: 2mm resolution image (different voxel sizes) ─────
cat > "${JOB_DIR}/${TOOL}_2mm.yml" <<EOF
input:
  class: File
  path: ${T1W_2MM}
EOF
run_tool "${TOOL}_2mm" "${JOB_DIR}/${TOOL}_2mm.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"

for variant in 3d 2mm; do
  echo "  --- variant: ${variant} ---"
  dir="${OUT_DIR}/${TOOL}_${variant}"

  # fslinfo writes to stdout, captured in log
  log_out="$(first_match "${dir}/fslinfo_output.txt" "${dir}"/*.txt 2>/dev/null || true)"
  if [[ -n "$log_out" && -f "$log_out" && -s "$log_out" ]]; then
    echo "  FOUND: output ($(wc -l < "$log_out") lines)"

    # Verify output contains expected fields
    for field in data_type dim1 dim2 dim3 pixdim1 pixdim2 pixdim3; do
      if grep -qi "${field}" "$log_out" 2>/dev/null; then
        val="$(grep -i "${field}" "$log_out" | head -1 | xargs)"
        echo "  FOUND field: ${val}"
      else
        echo "  WARN: expected field '${field}' not found"
      fi
    done

    # Verify non-zero dimensions reported
    dim1="$(grep -i '^dim1' "$log_out" | head -1 | awk '{print $2}' || true)"
    if [[ -n "$dim1" ]] && (( dim1 > 0 )) 2>/dev/null; then
      echo "  PASS: valid dim1=${dim1}"
    else
      echo "  WARN: dim1 missing or zero"
    fi
  else
    echo "  WARN: no output found"
  fi

  verify_log "${TOOL}_${variant}"
done
