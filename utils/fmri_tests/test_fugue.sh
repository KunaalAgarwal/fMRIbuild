#!/usr/bin/env bash
# Test: FSL fugue (FMRIB's Utility for Geometrically Unwarping EPIs)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fugue"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Derive fugue input from BOLD_MEAN (subsampled for speed)
FUGUE_SOURCE=""
if [[ -f "${BOLD_MEAN:-}" ]]; then
  FUGUE_SOURCE="$BOLD_MEAN"
else
  FUGUE_SOURCE="${DERIVED_DIR}/fugue_source.nii.gz"
  docker_fsl fslroi "${BOLD}" "${FUGUE_SOURCE}" 0 1 >/dev/null 2>&1 || true
fi

FUGUE_INPUT="${DERIVED_DIR}/fugue_input.nii.gz"
if [[ -f "$FUGUE_SOURCE" ]]; then
  docker_fsl fslmaths "${FUGUE_SOURCE}" -subsamp2 -subsamp2 "${FUGUE_INPUT}" >/dev/null 2>&1 || true
  if [[ ! -f "$FUGUE_INPUT" ]]; then
    cp "$FUGUE_SOURCE" "$FUGUE_INPUT"
  fi
fi

if [[ ! -f "$FUGUE_INPUT" ]]; then
  echo "ERROR: failed to create fugue input"
  exit 1
fi

# Create a zero shift map
SHIFT_MAP="${DERIVED_DIR}/zero_shift.nii.gz"
docker_fsl fslmaths "${FUGUE_INPUT}" -mul 0 "${SHIFT_MAP}" >/dev/null 2>&1 || true

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${FUGUE_INPUT}"
loadshift:
  class: File
  path: "${SHIFT_MAP}"
unwarp: "fugue_unwarp"
dwell: 0.0005
unwarpdir: y
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

for expected in "fugue_unwarp.nii.gz"; do
  f="${TOOL_OUT}/${expected}"
  if [[ ! -f "$f" ]]; then
    echo "  MISSING: ${expected}"
  elif [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte: ${expected}"
  else
    echo "  FOUND: ${expected}"
  fi
done

for nii in "${TOOL_OUT}/fugue_unwarp.nii.gz"; do
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
