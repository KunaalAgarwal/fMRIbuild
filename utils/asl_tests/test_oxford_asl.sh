#!/usr/bin/env bash
# Test: FSL oxford_asl (Complete ASL processing pipeline)
# Runs 3 parameter sets: pCASL minimal, pCASL with calibration+structural, pASL mode (default)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="oxford_asl"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_asl_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# ── Parameter Set A: Minimal pCASL ────────────────────────────────

cat > "${JOB_DIR}/${TOOL}_pcasl.yml" <<EOF
input:
  class: File
  path: "${ASL_4D}"
output_dir: "oxford_asl_pcasl"
casl: true
tis: "3.6"
bolus: 1.8
EOF

run_tool "${TOOL}_pcasl" "${JOB_DIR}/${TOOL}_pcasl.yml" "$CWL"

# ── Parameter Set B: pCASL with calibration + structural ──────────

cat > "${JOB_DIR}/${TOOL}_calib.yml" <<EOF
input:
  class: File
  path: "${ASL_4D}"
output_dir: "oxford_asl_calib"
structural:
  class: File
  path: "${T1W_STRUCTURAL}"
casl: true
tis: "3.6"
bolus: 1.8
bat: 1.3
calib:
  class: File
  path: "${M0_CALIB}"
EOF

run_tool "${TOOL}_calib" "${JOB_DIR}/${TOOL}_calib.yml" "$CWL"

# ── Parameter Set C: pASL mode (default, no --casl flag) ──────────

cat > "${JOB_DIR}/${TOOL}_pasl.yml" <<EOF
input:
  class: File
  path: "${ASL_4D}"
output_dir: "oxford_asl_pasl"
tis: "1.8"
bolus: 0.7
bat: 0.7
EOF

run_tool "${TOOL}_pasl" "${JOB_DIR}/${TOOL}_pasl.yml" "$CWL"

# ── Output validation ─────────────────────────────────────────────

for variant in pcasl calib pasl; do
  tool_out="${OUT_DIR}/${TOOL}_${variant}"
  if [[ -d "$tool_out" ]]; then
    echo ""
    echo "Validating ${TOOL}_${variant} outputs..."

    # Check files exist and are non-empty
    verify_files_nonempty "$tool_out" \
      "oxford_asl_${variant}/native_space/perfusion.nii.gz" \
      "oxford_asl.log" \
      || echo "  WARN: some files missing or empty for ${variant}"

    # Check NIfTI headers are readable
    verify_nifti_headers "$tool_out" \
      "oxford_asl_${variant}/native_space/perfusion.nii.gz" \
      "oxford_asl_${variant}/native_space/arrival.nii.gz" \
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
