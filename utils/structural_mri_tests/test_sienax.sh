#!/usr/bin/env bash
# Test: FSL sienax (Cross-sectional Brain Volume Estimation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="sienax"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Use 2mm T1 to keep memory usage manageable. The 1mm image causes
# Docker OOM on systems with limited RAM.
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${T1W_2MM}"
output_dir: "sienax_out"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# sienax produces an output directory
SIENAX_DIR="${TOOL_OUT}/sienax_out"
if [[ ! -d "$SIENAX_DIR" ]]; then
  SIENAX_DIR="$(find "${TOOL_OUT}" -maxdepth 1 -type d ! -name "${TOOL}" 2>/dev/null | head -1 || true)"
fi

if [[ -z "$SIENAX_DIR" || ! -d "$SIENAX_DIR" ]]; then
  echo "  FAIL: no sienax output directory found"
else
  echo "  Sienax directory: ${SIENAX_DIR}"
  for expected in "report.sienax" "I_brain_pve_0.nii.gz" "I_brain_pve_1.nii.gz" "I_brain_pve_2.nii.gz"; do
    f="${SIENAX_DIR}/${expected}"
    if [[ ! -f "$f" ]]; then
      echo "  MISSING: ${expected}"
    elif [[ ! -s "$f" ]]; then
      echo "  FAIL: zero-byte: ${expected}"
    else
      echo "  FOUND: ${expected}"
    fi
  done

  for nii in "${SIENAX_DIR}"/*.nii*; do
    [[ -f "$nii" ]] || continue
    bn="$(basename "$nii")"
    if [[ ! -s "$nii" ]]; then
      echo "  FAIL: zero-byte: ${bn}"
      continue
    fi
    dims="$(docker_fsl fslhd "$nii" 2>&1 | grep -E '^dim[1-4]' || true)"
    range="$(docker_fsl fslstats "$nii" -R 2>/dev/null || true)"
    echo "  Header (${bn}): ${dims}"
    echo "  Range  (${bn}): ${range}"
  done
fi

LOG_FILE="${LOG_DIR}/${TOOL}.log"
if [[ -f "$LOG_FILE" ]]; then
  if grep -qiE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" 2>/dev/null; then
    echo "  WARN: potential errors in log:"
    grep -iE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" | head -5
  else
    echo "  Log: no errors detected"
  fi
fi
