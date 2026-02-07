#!/usr/bin/env bash
# Test: FSL siena (Longitudinal Brain Atrophy Estimation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="siena"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data

# Siena needs two timepoint T1 images. Use aggressively downsampled copies
# of the same MNI152 as both timepoints (will yield ~0% change).
SIENA_T1A="${DERIVED_DIR}/siena_t1a.nii.gz"
SIENA_T1B="${DERIVED_DIR}/siena_t1b.nii.gz"
SIENA_SUBSAMP="${FSL_SIENA_SUBSAMP:-7}"

if [[ ! -f "$SIENA_T1A" || ! -f "$SIENA_T1B" ]]; then
  echo "Preparing downsampled T1 images for SIENA..."
  SUBSAMP_ARGS=()
  for ((i=0; i<SIENA_SUBSAMP; i++)); do
    SUBSAMP_ARGS+=("-subsamp2")
  done
  docker_fsl fslmaths "${T1W}" "${SUBSAMP_ARGS[@]}" "${SIENA_T1A}" >/dev/null 2>&1 || true
  docker_fsl fslmaths "${T1W}" "${SUBSAMP_ARGS[@]}" "${SIENA_T1B}" >/dev/null 2>&1 || true
  if [[ ! -f "$SIENA_T1A" ]]; then SIENA_T1A="$T1W"; fi
  if [[ ! -f "$SIENA_T1B" ]]; then SIENA_T1B="$T1W"; fi
fi

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
