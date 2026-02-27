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

# Create job YAML — quick mode, all stages
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dimensionality: 3
anatomical_image:
  class: File
  path: "${T1_RES}"
template:
  class: File
  path: "${T1W_2MM}"
brain_probability_mask:
  class: File
  path: "${T1W_2MM_MASK}"
segmentation_priors: "priors%d.nii.gz"
segmentation_priors_dir:
  class: Directory
  basename: "priors"
  location: "file://${ANTS_PRIORS_DIR}"
  listing: []
output_prefix: "cortical_"
quick_registration: true
run_stage: "0"
keep_temporary: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# Stage 1: Brain extraction
verify_nifti "${TOOL_OUT}/cortical_BrainExtractionMask.nii.gz" "INT"

# Stage 2: Template normalization outputs (version-dependent; fnndsc/ants
#   does not produce SubjectToTemplate / TemplateToSubject named files)
verify_nifti_optional "${TOOL_OUT}/cortical_BrainNormalizedToTemplate.nii.gz"
verify_nifti_optional "${TOOL_OUT}/cortical_SubjectToTemplate1Warp.nii.gz"
verify_mat_optional  "${TOOL_OUT}/cortical_SubjectToTemplate0GenericAffine.mat"
verify_nifti_optional "${TOOL_OUT}/cortical_TemplateToSubject0Warp.nii.gz"
verify_mat_optional  "${TOOL_OUT}/cortical_TemplateToSubject1GenericAffine.mat"

# Stage 3: Segmentation & cortical thickness (required with run_stage 0)
verify_nifti "${TOOL_OUT}/cortical_BrainSegmentation.nii.gz" "INT"
verify_nifti "${TOOL_OUT}/cortical_CorticalThickness.nii.gz" "FLOAT"

# Segmentation posteriors array (required with run_stage 0)
post_count=0
for post in "${TOOL_OUT}"/cortical_BrainSegmentationPosteriors*.nii.gz; do
  [[ -f "$post" ]] || continue
  verify_nifti "$post" "FLOAT"
  post_count=$((post_count + 1))
done
if [[ "$post_count" -gt 0 ]]; then
  echo "  Segmentation posteriors found: ${post_count}"
else
  echo "  FAIL: segmentation_posteriors not produced"
  exit 1
fi

verify_log "$TOOL"
