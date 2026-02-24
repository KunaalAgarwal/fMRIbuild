#!/usr/bin/env bash
# Test: ANTs antsCorticalThickness.sh (Cortical Thickness Pipeline)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="antsCorticalThickness"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML — quick mode, stage 1 only for speed
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dimensionality: 3
anatomical_image:
  class: File
  path: "${T1_RES}"
template:
  class: File
  path: "${T1_RES}"
brain_probability_mask:
  class: File
  path: "${ANTS_MASK}"
segmentation_priors: "priors%d.nii.gz"
segmentation_priors_dir:
  class: Directory
  basename: "priors"
  location: "file://${ANTS_PRIORS_DIR}"
  listing: []
output_prefix: "cortical_"
quick_registration: true
run_stage: "1"
keep_temporary: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# Required output
verify_nifti "${TOOL_OUT}/cortical_BrainExtractionMask.nii.gz" "INT"

# Optional outputs (may not all be produced with quick/stage1)
verify_nifti_optional "${TOOL_OUT}/cortical_BrainSegmentation.nii.gz" "INT"
verify_nifti_optional "${TOOL_OUT}/cortical_CorticalThickness.nii.gz" "FLOAT"
verify_nifti_optional "${TOOL_OUT}/cortical_BrainNormalizedToTemplate.nii.gz"
verify_nifti_optional "${TOOL_OUT}/cortical_SubjectToTemplate1Warp.nii.gz"
verify_mat_optional "${TOOL_OUT}/cortical_SubjectToTemplate0GenericAffine.mat"
verify_nifti_optional "${TOOL_OUT}/cortical_TemplateToSubject0Warp.nii.gz"
verify_mat_optional "${TOOL_OUT}/cortical_TemplateToSubject1GenericAffine.mat"

# Segmentation posteriors array
post_count=0
for post in "${TOOL_OUT}"/cortical_BrainSegmentationPosteriors*.nii.gz; do
  [[ -f "$post" ]] || continue
  verify_nifti "$post" "FLOAT"
  ((post_count++))
done
if [[ "$post_count" -gt 0 ]]; then
  echo "  Segmentation posteriors found: ${post_count}"
else
  echo "  OPTIONAL-SKIP: segmentation_posteriors (not produced)"
fi

verify_log "$TOOL"
