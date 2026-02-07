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

# ── Non-null & header checks ─────────────────────────────────
for t in mgz conform orient; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  for f in "$dir"/*.mgz; do
    [[ -f "$f" ]] || continue
    if [[ ! -s "$f" ]]; then
      echo "  WARN: zero-byte: $f"
    else
      echo "  Header (${t}/mgz): $(docker_fs mri_info "$f" 2>&1 | head -5 || true)"
    fi
  done
  for f in "$dir"/*.nii*; do
    [[ -f "$f" ]] || continue
    if [[ ! -s "$f" ]]; then
      echo "  WARN: zero-byte: $f"
    else
      echo "  Header (${t}/nii): $(docker_fsl fslhd "$f" 2>&1 | grep -E '^dim[1-4]' || true)"
    fi
  done
done
