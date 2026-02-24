#!/usr/bin/env bash
# Test: FreeSurfer mri_gtmpvc (PET Partial Volume Correction)
#
# Runs mri_gtmpvc with multiple parameter sets against synthetic PET data
# derived from the bert FreeSurfer test subject.
#
# Prerequisites:
#   - cwltool, docker, python3
#   - FreeSurfer license (FS_LICENSE env var or tests/data/freesurfer/license.txt)
#   - bert test subject (auto-downloaded if missing)
#
# Usage:
#   bash utils/pet_tests/test_mri_gtmpvc.sh [--rerun-passed]

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="mri_gtmpvc"
LIB="freesurfer"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

# ── Data preparation ──────────────────────────────────────────────

prepare_freesurfer_data

BRAIN_MGZ="${FS_SUBJECT_DIR}/mri/brain.mgz"
ASEG_MGZ="${FS_SUBJECT_DIR}/mri/aseg.mgz"

[[ -f "$BRAIN_MGZ" ]] || die "Missing ${BRAIN_MGZ}"
[[ -f "$ASEG_MGZ" ]]  || die "Missing ${ASEG_MGZ}"

# Create synthetic PET and matching segmentation at 2 mm isotropic.
# Real PET is typically 2–4 mm and we must keep memory under Docker's limit
# (full 256^3 conformed space needs >5 GB; 128^3 at 2 mm needs ~700 MB).
SYNTHETIC_PET="${DERIVED_DIR}/synthetic_pet.nii.gz"
ASEG_2MM="${DERIVED_DIR}/aseg_2mm.mgz"
if [[ ! -f "$SYNTHETIC_PET" ]]; then
  echo "Creating 2 mm synthetic PET from brain.mgz..."
  docker_fs mri_convert --voxsize 2 2 2 "${BRAIN_MGZ}" "${SYNTHETIC_PET}" \
    >/dev/null 2>&1 || die "Failed to create synthetic PET"
fi
if [[ ! -f "$ASEG_2MM" ]]; then
  echo "Resampling aseg to 2 mm (nearest-neighbor)..."
  docker_fs mri_convert --voxsize 2 2 2 --resample_type nearest \
    "${ASEG_MGZ}" "${ASEG_2MM}" \
    >/dev/null 2>&1 || die "Failed to create 2 mm aseg"
fi
[[ -f "$SYNTHETIC_PET" ]] || die "Synthetic PET not created at ${SYNTHETIC_PET}"
[[ -f "$ASEG_2MM" ]]      || die "2 mm aseg not created at ${ASEG_2MM}"

# ── Generate CWL template for reference ───────────────────────────

make_template "$CWL" "$TOOL"

# ── Parameter Set A: Minimal with regheader, PSF=4 ───────────────

TOOL_A="${TOOL}_setA"
cat > "${JOB_DIR}/${TOOL_A}.yml" <<EOF
subjects_dir:
  class: Directory
  path: "${FS_SUBJECTS_DIR}"
  writable: true
fs_license:
  class: File
  path: "${FS_LICENSE}"
input:
  class: File
  path: "${SYNTHETIC_PET}"
psf: 4.0
seg:
  class: File
  path: "${ASEG_2MM}"
output_dir: "gtmpvc_setA"
regheader: true
default_seg_merge: true
ctab_default: true
no_rescale: true
EOF

run_tool "$TOOL_A" "${JOB_DIR}/${TOOL_A}.yml" "$CWL"

# ── Parameter Set B: Higher PSF (PSF=6) ──────────────────────────

TOOL_B="${TOOL}_setB"
cat > "${JOB_DIR}/${TOOL_B}.yml" <<EOF
subjects_dir:
  class: Directory
  path: "${FS_SUBJECTS_DIR}"
  writable: true
fs_license:
  class: File
  path: "${FS_LICENSE}"
input:
  class: File
  path: "${SYNTHETIC_PET}"
psf: 6.0
seg:
  class: File
  path: "${ASEG_2MM}"
output_dir: "gtmpvc_setB"
regheader: true
default_seg_merge: true
ctab_default: true
no_rescale: true
EOF

run_tool "$TOOL_B" "${JOB_DIR}/${TOOL_B}.yml" "$CWL"

# ── Parameter Set C: Higher PSF (PSF=8) ─────────────────────────

TOOL_C="${TOOL}_setC"
cat > "${JOB_DIR}/${TOOL_C}.yml" <<EOF
subjects_dir:
  class: Directory
  path: "${FS_SUBJECTS_DIR}"
  writable: true
fs_license:
  class: File
  path: "${FS_LICENSE}"
input:
  class: File
  path: "${SYNTHETIC_PET}"
psf: 8.0
seg:
  class: File
  path: "${ASEG_2MM}"
output_dir: "gtmpvc_setC"
regheader: true
no_rescale: true
default_seg_merge: true
ctab_default: true
EOF

run_tool "$TOOL_C" "${JOB_DIR}/${TOOL_C}.yml" "$CWL"

# ── Parameter Set D: PSF=3 ──────────────────────────────────────

TOOL_D="${TOOL}_setD"
cat > "${JOB_DIR}/${TOOL_D}.yml" <<EOF
subjects_dir:
  class: Directory
  path: "${FS_SUBJECTS_DIR}"
  writable: true
fs_license:
  class: File
  path: "${FS_LICENSE}"
input:
  class: File
  path: "${SYNTHETIC_PET}"
psf: 3.0
seg:
  class: File
  path: "${ASEG_2MM}"
output_dir: "gtmpvc_setD"
regheader: true
default_seg_merge: true
ctab_default: true
no_rescale: true
EOF

run_tool "$TOOL_D" "${JOB_DIR}/${TOOL_D}.yml" "$CWL"

# ── Parameter Set E: No reduce FOV ───────────────────────────────

TOOL_E="${TOOL}_setE"
cat > "${JOB_DIR}/${TOOL_E}.yml" <<EOF
subjects_dir:
  class: Directory
  path: "${FS_SUBJECTS_DIR}"
  writable: true
fs_license:
  class: File
  path: "${FS_LICENSE}"
input:
  class: File
  path: "${SYNTHETIC_PET}"
psf: 4.0
seg:
  class: File
  path: "${ASEG_2MM}"
output_dir: "gtmpvc_setE"
regheader: true
no_reduce_fov: true
default_seg_merge: true
ctab_default: true
no_rescale: true
EOF

run_tool "$TOOL_E" "${JOB_DIR}/${TOOL_E}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"

for t in setA setB setC setD setE; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  echo "  --- variant: ${t} ---"
  verify_directory "${dir}/gtmpvc_${t}"
  # gtm_stats is nullable — produced inside output directory
  verify_file_optional "${dir}/gtmpvc_${t}/gtm.stats.dat"
  verify_log "${TOOL}_${t}"
done

# ── Summary ───────────────────────────────────────────────────────

echo ""
echo "=========================================="
echo "  mri_gtmpvc Test Summary"
echo "=========================================="
if [[ -f "$SUMMARY_FILE" ]]; then
  cat "$SUMMARY_FILE"
fi
echo ""

PASS_COUNT="$(awk -F $'\t' '$2=="PASS" {c++} END {print c+0}' "$SUMMARY_FILE")"
FAIL_COUNT="$(awk -F $'\t' '$2=="FAIL" {c++} END {print c+0}' "$SUMMARY_FILE")"
echo "Results: PASS=${PASS_COUNT} FAIL=${FAIL_COUNT}"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
