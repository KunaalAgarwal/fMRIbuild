#!/usr/bin/env bash
# Test: FSL fslhd (display NIfTI header information)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="fslhd"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Test 1: Default header output ─────────────────────────────
cat > "${JOB_DIR}/${TOOL}_default.yml" <<EOF
input:
  class: File
  path: ${T1W}
EOF
run_tool "${TOOL}_default" "${JOB_DIR}/${TOOL}_default.yml" "$CWL"

# ── Test 2: XML output mode ──────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_xml.yml" <<EOF
input:
  class: File
  path: ${T1W}
xml: true
EOF
run_tool "${TOOL}_xml" "${JOB_DIR}/${TOOL}_xml.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"

# Test 1: Default output — stdout captured in log
echo "  --- variant: default ---"
dir="${OUT_DIR}/${TOOL}_default"
log_out="$(first_match "${dir}/fslhd_output.txt" "${dir}"/*.txt 2>/dev/null || true)"
if [[ -n "$log_out" && -f "$log_out" && -s "$log_out" ]]; then
  echo "  FOUND: log output ($(wc -l < "$log_out") lines)"
  # Verify header contains expected fields
  for field in dim1 dim2 dim3 pixdim1 pixdim2 pixdim3 data_type sform_code qform_code; do
    if grep -q "^${field}" "$log_out" 2>/dev/null; then
      val="$(grep "^${field}" "$log_out" | head -1)"
      echo "  FOUND field: ${val}"
    else
      echo "  WARN: expected field '${field}' not found in header output"
    fi
  done

  # Verify dimensions are reasonable (MNI152 1mm is 182x218x182)
  dim1="$(grep '^dim1' "$log_out" | awk '{print $2}' || true)"
  dim2="$(grep '^dim2' "$log_out" | awk '{print $2}' || true)"
  dim3="$(grep '^dim3' "$log_out" | awk '{print $2}' || true)"
  if [[ -n "$dim1" && "$dim1" -gt 0 && -n "$dim2" && "$dim2" -gt 0 && -n "$dim3" && "$dim3" -gt 0 ]]; then
    echo "  PASS: valid dimensions ${dim1}x${dim2}x${dim3}"
  else
    echo "  WARN: dimensions appear invalid: ${dim1}x${dim2}x${dim3}"
  fi
else
  echo "  WARN: no log output found"
fi
verify_log "${TOOL}_default"

# Test 2: XML output — verify XML structure
echo "  --- variant: xml ---"
dir="${OUT_DIR}/${TOOL}_xml"
xml_out="$(first_match "${dir}/fslhd_output.txt" "${dir}"/*.txt 2>/dev/null || true)"
if [[ -n "$xml_out" && -f "$xml_out" && -s "$xml_out" ]]; then
  echo "  FOUND: XML output ($(wc -l < "$xml_out") lines)"
  # Check for XML markers
  if grep -q '<nifti_image' "$xml_out" 2>/dev/null || grep -q '<?xml' "$xml_out" 2>/dev/null; then
    echo "  PASS: output contains XML structure"
  else
    echo "  WARN: output does not appear to be XML"
  fi
else
  echo "  WARN: no XML output found"
fi
verify_log "${TOOL}_xml"
