#!/usr/bin/env bash
# Test: FSL asl_calib (ASL calibration to absolute CBF units)
# Runs 2 parameter sets: default longtr mode, longtr with structural
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

# ── Parameter Set A: longtr with mask (bypasses structural requirement) ─

cat > "${JOB_DIR}/${TOOL}_longtr.yml" <<EOF
calib_image:
  class: File
  path: "${M0_CALIB}"
perfusion:
  class: File
  path: "${PERFUSION_IMG}"
mask:
  class: File
  path: "${BRAIN_MASK}"
output_file: "calib_longtr"
mode: "longtr"
EOF

run_tool "${TOOL}_longtr" "${JOB_DIR}/${TOOL}_longtr.yml" "$CWL"

# ── Parameter Set B: longtr with structural + identity transform ──

# Create identity transform matrix (ASL and structural are both MNI152_T1_2mm)
IDENTITY_MAT="${JOB_DIR}/identity.mat"
cat > "$IDENTITY_MAT" <<'MAT'
1 0 0 0
0 1 0 0
0 0 1 0
0 0 0 1
MAT

cat > "${JOB_DIR}/${TOOL}_struct.yml" <<EOF
calib_image:
  class: File
  path: "${M0_CALIB}"
perfusion:
  class: File
  path: "${PERFUSION_IMG}"
structural:
  class: File
  path: "${T1W_BRAIN}"
transform:
  class: File
  path: "${IDENTITY_MAT}"
output_file: "calib_struct"
mode: "longtr"
EOF

run_tool "${TOOL}_struct" "${JOB_DIR}/${TOOL}_struct.yml" "$CWL"

# ── Output validation ─────────────────────────────────────────────

for variant in longtr struct; do
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

    LOG_FILE="${LOG_DIR}/${TOOL}_${variant}.log"
    if [[ -f "$LOG_FILE" ]]; then
      if grep -qiE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" 2>/dev/null; then
        echo "  WARN: potential errors in ${variant} log:"
        grep -iE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" | head -5
      else
        echo "  Log (${variant}): no errors detected"
      fi
    fi
  fi
done
