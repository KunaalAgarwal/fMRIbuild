#!/usr/bin/env bash
# Test: FSL fslmerge (Merge Images into 4D)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fslmerge"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Dependency: needs split volumes from fslsplit
SPLIT_FILES=( "${OUT_DIR}/fslsplit"/bold_split*.nii* )
if [[ "${#SPLIT_FILES[@]}" -lt 2 ]]; then
  echo "Running prerequisite: fslsplit..."
  bash "${SCRIPT_DIR}/test_fslsplit.sh"
  SPLIT_FILES=( "${OUT_DIR}/fslsplit"/bold_split*.nii* )
fi

if [[ "${#SPLIT_FILES[@]}" -lt 2 ]]; then
  echo "ERROR: fslsplit did not produce enough volumes"
  exit 1
fi

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dimension: t
output: "bold_merge"
input_files:
  - class: File
    path: "${SPLIT_FILES[0]}"
  - class: File
    path: "${SPLIT_FILES[1]}"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

for expected in "bold_merge.nii.gz"; do
  f="${TOOL_OUT}/${expected}"
  if [[ ! -f "$f" ]]; then
    echo "  MISSING: ${expected}"
  elif [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte: ${expected}"
  else
    echo "  FOUND: ${expected}"
  fi
done

for nii in "${TOOL_OUT}/bold_merge.nii.gz"; do
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
  if [[ "$range" == "0.000000 0.000000" ]]; then
    echo "  WARN: image appears to be all zeros: ${bn}"
  fi
done

LOG_FILE="${LOG_DIR}/${TOOL}.log"
if [[ -f "$LOG_FILE" ]]; then
  if grep -qiE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" 2>/dev/null; then
    echo "  WARN: potential errors in log:"
    grep -iE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" | head -5
  else
    echo "  Log: no errors detected"
  fi
fi
