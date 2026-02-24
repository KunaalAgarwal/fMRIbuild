#!/usr/bin/env bash
# Test: FreeSurfer mri_convert (convert between neuroimaging file formats)
# Requires FreeSurfer license (set FS_LICENSE env var)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="mri_convert"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data

# FreeSurfer CWL requires subjects_dir and fs_license
if [[ -z "${FS_LICENSE:-}" ]]; then
  die "FreeSurfer license not found. Set FS_LICENSE env var."
fi
FS_SUBJECTS="${DERIVED_DIR}/fs_subjects"
mkdir -p "$FS_SUBJECTS"

make_template "$CWL" "$TOOL"

# ── Test 1: NIfTI to MGZ conversion ─────────────────────────
cat > "${JOB_DIR}/${TOOL}_mgz.yml" <<EOF
subjects_dir:
  class: Directory
  path: ${FS_SUBJECTS}
fs_license:
  class: File
  path: ${FS_LICENSE}
input:
  class: File
  path: ${T1W}
output: converted_out.mgz
EOF
run_tool "${TOOL}_mgz" "${JOB_DIR}/${TOOL}_mgz.yml" "$CWL"

# ── Test 2: With conform (resample to 256^3 1mm iso) ────────
cat > "${JOB_DIR}/${TOOL}_conform.yml" <<EOF
subjects_dir:
  class: Directory
  path: ${FS_SUBJECTS}
fs_license:
  class: File
  path: ${FS_LICENSE}
input:
  class: File
  path: ${T1W}
output: converted_conform.nii.gz
conform: true
EOF
run_tool "${TOOL}_conform" "${JOB_DIR}/${TOOL}_conform.yml" "$CWL"

# ── Test 3: Change orientation to LPI ────────────────────────
cat > "${JOB_DIR}/${TOOL}_orient.yml" <<EOF
subjects_dir:
  class: Directory
  path: ${FS_SUBJECTS}
fs_license:
  class: File
  path: ${FS_LICENSE}
input:
  class: File
  path: ${T1W}
output: converted_lpi.nii.gz
out_orientation: LPI
EOF
run_tool "${TOOL}_orient" "${JOB_DIR}/${TOOL}_orient.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"

echo "  --- variant: mgz ---"
verify_mgz "${OUT_DIR}/${TOOL}_mgz/converted_out.mgz"
verify_log "${TOOL}_mgz"

echo "  --- variant: conform ---"
verify_nifti "${OUT_DIR}/${TOOL}_conform/converted_conform.nii.gz"
verify_log "${TOOL}_conform"

echo "  --- variant: orient ---"
verify_nifti "${OUT_DIR}/${TOOL}_orient/converted_lpi.nii.gz"
verify_log "${TOOL}_orient"
