#!/usr/bin/env bash
# Test: FSL siena (Longitudinal Brain Atrophy Estimation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="siena"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data

# Siena needs two timepoint T1 images. Use the 2mm MNI152 as both
# timepoints (will yield ~0% change). The 1mm images cause OOM.
SIENA_T1A="$T1W_2MM"
SIENA_T1B="$T1W_2MM"

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input1:
  class: File
  path: "${SIENA_T1A}"
input2:
  class: File
  path: "${SIENA_T1B}"
output_dir: "siena_out"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# siena produces an output directory
SIENA_DIR="${TOOL_OUT}/siena_out"
if [[ ! -d "$SIENA_DIR" ]]; then
  SIENA_DIR="$(find "${TOOL_OUT}" -maxdepth 1 -type d ! -name "${TOOL}" 2>/dev/null | head -1 || true)"
fi

if [[ -z "$SIENA_DIR" || ! -d "$SIENA_DIR" ]]; then
  echo "  FAIL: no siena output directory found"
else
  echo "  Siena directory: ${SIENA_DIR}"
  for expected in "report.siena"; do
    f="${SIENA_DIR}/${expected}"
    if [[ ! -f "$f" ]]; then
      echo "  MISSING: ${expected}"
    elif [[ ! -s "$f" ]]; then
      echo "  FAIL: zero-byte: ${expected}"
    else
      echo "  FOUND: ${expected} ($(wc -l < "$f") lines)"
    fi
  done

  for nii in "${SIENA_DIR}"/*.nii*; do
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
