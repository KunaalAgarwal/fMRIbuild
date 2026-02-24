#!/usr/bin/env bash
# Test: AFNI 3dANOVA2 (Two-Way Analysis of Variance)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dANOVA2"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
type: 1
alevels: 2
blevels: 2
dset:
  - alevel: 1
    blevel: 1
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_1.nii.gz"
  - alevel: 1
    blevel: 1
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_5.nii.gz"
  - alevel: 1
    blevel: 2
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_2.nii.gz"
  - alevel: 1
    blevel: 2
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_6.nii.gz"
  - alevel: 2
    blevel: 1
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_3.nii.gz"
  - alevel: 2
    blevel: 1
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_7.nii.gz"
  - alevel: 2
    blevel: 2
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_4.nii.gz"
  - alevel: 2
    blevel: 2
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_8.nii.gz"
fa: "anova2_fa"
fb: "anova2_fb"
bucket: "anova2_bucket"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_afni "${TOOL_OUT}/anova2_fa+orig.HEAD"
verify_afni "${TOOL_OUT}/anova2_fb+orig.HEAD"
verify_afni "${TOOL_OUT}/anova2_bucket+orig.HEAD"
verify_log "$TOOL"
