#!/usr/bin/env bash
# Test: ANTs LabelGeometryMeasures (compute geometry statistics per label)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="LabelGeometryMeasures"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

prepare_ants_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# ── Test 1: With intensity image and CSV output ──────────────
cat > "${JOB_DIR}/${TOOL}_default.yml" <<EOF
dimensionality: 3
label_image:
  class: File
  path: "${ANTS_SEGMENTATION}"
intensity_image:
  class: File
  path: "${T1_RES}"
output_csv: lgm_measures.csv
EOF
run_tool "${TOOL}_default" "${JOB_DIR}/${TOOL}_default.yml" "$CWL"

# ── Test 2: Without intensity image ──────────────────────────
cat > "${JOB_DIR}/${TOOL}_nointensity.yml" <<EOF
dimensionality: 3
label_image:
  class: File
  path: "${ANTS_SEGMENTATION}"
output_csv: lgm_no_intensity.csv
EOF
run_tool "${TOOL}_nointensity" "${JOB_DIR}/${TOOL}_nointensity.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"

for t in default nointensity; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  echo "  --- variant: ${t} ---"

  if [[ "$t" == "default" ]]; then
    verify_csv "${dir}/lgm_measures.csv" 2
  else
    verify_csv "${dir}/lgm_no_intensity.csv" 2
  fi

  verify_log "${TOOL}_${t}"
done
