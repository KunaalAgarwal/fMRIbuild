#!/usr/bin/env bash
# Test: AFNI 3dANOVA3 (Three-Way Analysis of Variance)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dANOVA3"
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
clevels: 2
dset:
  - alevel: 1
    blevel: 1
    clevel: 1
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_1.nii.gz"
  - alevel: 1
    blevel: 1
    clevel: 1
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_9.nii.gz"
  - alevel: 1
    blevel: 1
    clevel: 2
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_2.nii.gz"
  - alevel: 1
    blevel: 1
    clevel: 2
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_10.nii.gz"
  - alevel: 1
    blevel: 2
    clevel: 1
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_3.nii.gz"
  - alevel: 1
    blevel: 2
    clevel: 1
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_11.nii.gz"
  - alevel: 1
    blevel: 2
    clevel: 2
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_4.nii.gz"
  - alevel: 1
    blevel: 2
    clevel: 2
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_12.nii.gz"
  - alevel: 2
    blevel: 1
    clevel: 1
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_5.nii.gz"
  - alevel: 2
    blevel: 1
    clevel: 1
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_13.nii.gz"
  - alevel: 2
    blevel: 1
    clevel: 2
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_6.nii.gz"
  - alevel: 2
    blevel: 1
    clevel: 2
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_14.nii.gz"
  - alevel: 2
    blevel: 2
    clevel: 1
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_7.nii.gz"
  - alevel: 2
    blevel: 2
    clevel: 1
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_15.nii.gz"
  - alevel: 2
    blevel: 2
    clevel: 2
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_8.nii.gz"
  - alevel: 2
    blevel: 2
    clevel: 2
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_16.nii.gz"
fa: "anova3_fa"
fb: "anova3_fb"
fc: "anova3_fc"
bucket: "anova3_bucket"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_afni "${TOOL_OUT}/anova3_fa+orig.HEAD"
verify_afni "${TOOL_OUT}/anova3_fb+orig.HEAD"
verify_afni "${TOOL_OUT}/anova3_fc+orig.HEAD"
verify_afni "${TOOL_OUT}/anova3_bucket+orig.HEAD"
verify_log "$TOOL"
