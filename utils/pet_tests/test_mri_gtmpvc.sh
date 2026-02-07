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

# Create a synthetic PET-like image from brain.mgz.
# We convert to NIfTI to exercise the .nii.gz code path.
# The image is just the structural brain — not real PET data, but
# sufficient for validating CWL execution and output file production.
SYNTHETIC_PET="${DERIVED_DIR}/synthetic_pet.nii.gz"
if [[ ! -f "$SYNTHETIC_PET" ]]; then
  echo "Creating synthetic PET image from brain.mgz..."
  docker_fs mri_convert "${BRAIN_MGZ}" "${SYNTHETIC_PET}" \
    >/dev/null 2>&1 || die "Failed to create synthetic PET image"
fi
[[ -f "$SYNTHETIC_PET" ]] || die "Synthetic PET not created at ${SYNTHETIC_PET}"

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
  path: "${ASEG_MGZ}"
output_dir: "gtmpvc_setA"
regheader: true
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
  path: "${ASEG_MGZ}"
output_dir: "gtmpvc_setB"
regheader: true
EOF

run_tool "$TOOL_B" "${JOB_DIR}/${TOOL_B}.yml" "$CWL"

# ── Parameter Set C: No rescale ───────────────────────────────────

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
psf: 4.0
seg:
  class: File
  path: "${ASEG_MGZ}"
output_dir: "gtmpvc_setC"
regheader: true
no_rescale: true
EOF

run_tool "$TOOL_C" "${JOB_DIR}/${TOOL_C}.yml" "$CWL"

# ── Parameter Set D: Auto-mask ────────────────────────────────────

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
psf: 4.0
seg:
  class: File
  path: "${ASEG_MGZ}"
output_dir: "gtmpvc_setD"
regheader: true
auto_mask: 0.1
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
  path: "${ASEG_MGZ}"
output_dir: "gtmpvc_setE"
regheader: true
no_reduce_fov: true
EOF

run_tool "$TOOL_E" "${JOB_DIR}/${TOOL_E}.yml" "$CWL"

# ── Summary ───────────────────────────────────────────────────────

echo ""
echo "=========================================="
echo "  mri_gtmpvc Test Summary"
echo "=========================================="
if [[ -f "$SUMMARY_FILE" ]]; then
  cat "$SUMMARY_FILE"
fi
echo ""

PASS_COUNT="$(awk -F $'\t' 'NR>1 && $2=="PASS" {c++} END {print c+0}' "$SUMMARY_FILE")"
FAIL_COUNT="$(awk -F $'\t' 'NR>1 && $2=="FAIL" {c++} END {print c+0}' "$SUMMARY_FILE")"
echo "Results: PASS=${PASS_COUNT} FAIL=${FAIL_COUNT}"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
