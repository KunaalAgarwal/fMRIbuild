#!/usr/bin/env bash
# Test: FSL fslchfiletype (convert between NIfTI/ANALYZE file formats)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="fslchfiletype"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Test 1: Convert to uncompressed NIfTI (.nii) ─────────────
cat > "${JOB_DIR}/${TOOL}_nifti.yml" <<EOF
filetype: NIFTI
input:
  class: File
  path: ${T1W}
EOF
run_tool "${TOOL}_nifti" "${JOB_DIR}/${TOOL}_nifti.yml" "$CWL"

# ── Test 2: Convert to compressed NIfTI (.nii.gz) ────────────
cat > "${JOB_DIR}/${TOOL}_nifti_gz.yml" <<EOF
filetype: NIFTI_GZ
input:
  class: File
  path: ${T1W}
EOF
run_tool "${TOOL}_nifti_gz" "${JOB_DIR}/${TOOL}_nifti_gz.yml" "$CWL"

# ── Test 3: Convert to NIfTI pair (.hdr/.img) ────────────────
cat > "${JOB_DIR}/${TOOL}_pair.yml" <<EOF
filetype: NIFTI_PAIR
input:
  class: File
  path: ${T1W}
EOF
run_tool "${TOOL}_pair" "${JOB_DIR}/${TOOL}_pair.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"

# Test 1: uncompressed NIfTI
echo "  --- variant: NIFTI ---"
dir="${OUT_DIR}/${TOOL}_nifti"
nii="$(first_match "${dir}"/*.nii 2>/dev/null || true)"
if [[ -n "$nii" && -f "$nii" ]]; then
  verify_nifti "$nii"
  # Verify dimensions match original
  orig_dims="$(docker_fsl fslhd "$T1W" 2>&1 | grep -E '^dim[1-3]\s' || true)"
  conv_dims="$(docker_fsl fslhd "$nii" 2>&1 | grep -E '^dim[1-3]\s' || true)"
  if [[ "$orig_dims" == "$conv_dims" ]]; then
    echo "  PASS: dimensions preserved after conversion"
  else
    echo "  WARN: dimensions changed after conversion"
    echo "    orig: ${orig_dims}"
    echo "    conv: ${conv_dims}"
  fi
else
  echo "  WARN: no .nii output found for NIFTI conversion"
fi
verify_log "${TOOL}_nifti"

# Test 2: compressed NIfTI
echo "  --- variant: NIFTI_GZ ---"
dir="${OUT_DIR}/${TOOL}_nifti_gz"
nii_gz="$(first_match "${dir}"/*.nii.gz 2>/dev/null || true)"
if [[ -n "$nii_gz" && -f "$nii_gz" ]]; then
  verify_nifti "$nii_gz"
else
  echo "  WARN: no .nii.gz output found for NIFTI_GZ conversion"
fi
verify_log "${TOOL}_nifti_gz"

# Test 3: NIfTI pair
echo "  --- variant: NIFTI_PAIR ---"
dir="${OUT_DIR}/${TOOL}_pair"
hdr="$(first_match "${dir}"/*.hdr 2>/dev/null || true)"
img="$(first_match "${dir}"/*.img 2>/dev/null || true)"
if [[ -n "$hdr" && -f "$hdr" ]]; then
  verify_file "$hdr"
else
  echo "  WARN: no .hdr file found for NIFTI_PAIR conversion"
fi
if [[ -n "$img" && -f "$img" ]]; then
  verify_file "$img"
else
  echo "  WARN: no .img file found for NIFTI_PAIR conversion"
fi
verify_log "${TOOL}_pair"
