#!/usr/bin/env bash
# Test: AFNI 3dANOVA (One-Way Analysis of Variance)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dANOVA"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
levels: 2
dset:
  - level: 1
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_1.nii.gz"
  - level: 1
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_2.nii.gz"
  - level: 2
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_3.nii.gz"
  - level: 2
    dataset:
      class: File
      path: "${DERIVED_DIR}/anova_4.nii.gz"
ftr: "anova_ftr"
bucket: "anova_bucket"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# F-test may be folded into bucket; check whichever exists
for head in "${TOOL_OUT}"/anova_ftr+*.HEAD; do
  [[ -f "$head" ]] && verify_afni "$head"
done
found=0
for head in "${TOOL_OUT}"/anova_bucket+*.HEAD; do
  [[ -f "$head" ]] || continue
  verify_afni "$head"
  found=1
done
if (( found == 0 )); then
  echo "  FAIL: no anova_bucket+{orig,tlrc}.HEAD found"; exit 1
fi
verify_log "$TOOL"
