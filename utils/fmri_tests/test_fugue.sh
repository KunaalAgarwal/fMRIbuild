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
