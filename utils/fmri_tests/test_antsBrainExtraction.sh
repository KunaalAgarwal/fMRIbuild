#!/usr/bin/env bash
# Test: ANTs antsBrainExtraction (Brain Extraction)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="antsBrainExtraction"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_fmri_data

make_template "$CWL" "$TOOL"

# Self-extraction: use T1_RES as both input and template, ANTS_MASK as brain probability mask
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
output_prefix: "brainextract_"
use_floatingpoint: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_nifti "${TOOL_OUT}/brainextract_BrainExtractionBrain.nii.gz"
verify_nifti "${TOOL_OUT}/brainextract_BrainExtractionMask.nii.gz" "INT"
verify_nifti_optional "${TOOL_OUT}/brainextract_BrainExtractionBrain_N4.nii.gz"

# registration_template uses a glob pattern — check for any match
found_reg_tmpl=0
for f in "${TOOL_OUT}"/brainextract_BrainExtractionPrior*Warped.nii.gz; do
  [[ -f "$f" ]] || continue
  verify_nifti "$f"
  found_reg_tmpl=1
  break
done
if [[ "$found_reg_tmpl" -eq 0 ]]; then
  echo "  OPTIONAL-SKIP: registration_template (not produced)"
fi

verify_log "$TOOL"
