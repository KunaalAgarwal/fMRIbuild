#!/usr/bin/env bash
# Test: FSL run_first_all (FIRST — Subcortical Structure Segmentation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="run_first_all"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Use brain-extracted 2mm T1 with -b flag so FIRST skips its internal BET.
# Segment only L_Hipp to keep runtime manageable (~5 min vs ~30 min for all).
# Note: MNI152 is a template average, so segmentation quality is not
# meaningful — this test verifies the CWL wiring produces output files.
FIRST_INPUT="$T1W_2MM_BRAIN"
if [[ ! -f "$FIRST_INPUT" ]]; then
  echo "Brain-extracted 2mm T1 not found, running BET..."
  docker_fsl bet "$T1W_2MM" "${DERIVED_DIR}/bet_2mm_out" -R
  FIRST_INPUT="${DERIVED_DIR}/bet_2mm_out.nii.gz"
fi
[[ -f "$FIRST_INPUT" ]] || die "Missing brain-extracted input for run_first_all"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${FIRST_INPUT}"
output: "first_out"
brain_extracted: true
structures: "L_Hipp"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

for expected in "first_out-L_Hipp_first.vtk" "first_out_all_fast_firstseg.nii.gz"; do
  f="${TOOL_OUT}/${expected}"
  if [[ ! -f "$f" ]]; then
    echo "  MISSING: ${expected}"
  elif [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte: ${expected}"
  else
    echo "  FOUND: ${expected}"
  fi
done

# Check any NIfTI segmentation outputs
for nii in "${TOOL_OUT}"/*firstseg*.nii* "${TOOL_OUT}"/*first*.nii*; do
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
