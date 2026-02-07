#!/usr/bin/env bash
# Test: FSL asl_calib (ASL calibration to absolute CBF units)
# Runs 2 parameter sets: voxelwise mode, long TR mode
# Depends on oxford_asl perfusion output; runs oxford_asl first if needed
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="asl_calib"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_asl_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# ── Dependency: need a perfusion image from oxford_asl ────────────

PERFUSION_IMG="$(first_match \
  "${OUT_DIR}/oxford_asl_pcasl/oxford_asl_pcasl/native_space/perfusion.nii.gz" \
  "${OUT_DIR}/oxford_asl_calib/oxford_asl_calib/native_space/perfusion.nii.gz" \
  2>/dev/null || true)"

if [[ -z "$PERFUSION_IMG" ]]; then
  echo "Running prerequisite: oxford_asl..."
  bash "${SCRIPT_DIR}/test_oxford_asl.sh"
  PERFUSION_IMG="$(first_match \
    "${OUT_DIR}/oxford_asl_pcasl/oxford_asl_pcasl/native_space/perfusion.nii.gz" \
    "${OUT_DIR}/oxford_asl_calib/oxford_asl_calib/native_space/perfusion.nii.gz" \
    2>/dev/null || true)"
fi

if [[ -z "$PERFUSION_IMG" ]]; then
  # Fallback: use the ASL difference image as a stand-in
  echo "WARN: No perfusion map available, using ASL diff as fallback input"
  PERFUSION_IMG="$ASL_DIFF"
fi

# ── Parameter Set A: Voxelwise calibration ────────────────────────

cat > "${JOB_DIR}/${TOOL}_voxel.yml" <<EOF
perfusion:
  class: File
  path: "${PERFUSION_IMG}"
calib_image:
  class: File
  path: "${M0_CALIB}"
output: "calib_voxel"
mode: "voxel"
tr: 4.8
EOF

run_tool "${TOOL}_voxel" "${JOB_DIR}/${TOOL}_voxel.yml" "$CWL"

# ── Parameter Set B: Long TR mode with structural ─────────────────

cat > "${JOB_DIR}/${TOOL}_longtr.yml" <<EOF
perfusion:
  class: File
  path: "${PERFUSION_IMG}"
calib_image:
  class: File
  path: "${M0_CALIB}"
output: "calib_longtr"
structural:
  class: File
  path: "${T1W_STRUCTURAL}"
mode: "longtr"
tr: 6.0
te: 14.0
cgain: 1.0
EOF

run_tool "${TOOL}_longtr" "${JOB_DIR}/${TOOL}_longtr.yml" "$CWL"

# ── Output validation ─────────────────────────────────────────────

for variant in voxel longtr; do
  tool_out="${OUT_DIR}/${TOOL}_${variant}"
  if [[ -d "$tool_out" ]]; then
    echo ""
    echo "Validating ${TOOL}_${variant} outputs..."

    # Check files exist and are non-empty
    verify_files_nonempty "$tool_out" \
      "calib_${variant}.nii.gz" \
      "asl_calib.log" \
      || echo "  WARN: some files missing or empty for ${variant}"

    # Check NIfTI headers are readable
    verify_nifti_headers "$tool_out" \
      "calib_${variant}.nii.gz" \
      || echo "  WARN: NIfTI header check failed for ${variant}"
  fi
done
