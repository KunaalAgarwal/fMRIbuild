#!/usr/bin/env bash
# Test: ANTs antsAtroposN4.sh (Joint N4 Bias Correction + Atropos Segmentation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="antsAtroposN4"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dimensionality: 3
input_image:
  class: File
  path: "${T1_RES}"
mask_image:
  class: File
  path: "${ANTS_MASK}"
output_prefix: "atroposn4_"
num_classes: 2
n4_atropos_iterations: 1
atropos_iterations: 3
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_nifti "${TOOL_OUT}/atroposn4_Segmentation.nii.gz" "INT"
verify_nifti "${TOOL_OUT}/atroposn4_Segmentation0N4.nii.gz"

# Posteriors array
post_count=0
for post in "${TOOL_OUT}"/atroposn4_SegmentationPosteriors*.nii.gz; do
  [[ -f "$post" ]] || continue
  verify_nifti "$post" "FLOAT"
  ((post_count++))
done
echo "  Posteriors found: ${post_count}"
if [[ "$post_count" -eq 0 ]]; then
  echo "  WARN: no posterior probability maps found"
fi

verify_log "$TOOL"
