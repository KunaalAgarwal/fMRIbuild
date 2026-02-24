#!/usr/bin/env bash
# Test: FSL slicetimer (Slice Timing Correction)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="slicetimer"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${BOLD}"
output: "slicetimer_out"
slice_order:
  interleaved: true
EOF

if [[ -n "${BOLD_TR:-}" ]]; then
  cat >> "${JOB_DIR}/${TOOL}.yml" <<EOF
tr: ${BOLD_TR}
EOF
fi

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

for expected in "slicetimer_out.nii.gz"; do
  f="${TOOL_OUT}/${expected}"
  if [[ ! -f "$f" ]]; then
    echo "  MISSING: ${expected}"
  elif [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte: ${expected}"
  else
    echo "  FOUND: ${expected}"
  fi
done

for nii in "${TOOL_OUT}/slicetimer_out.nii.gz"; do
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
