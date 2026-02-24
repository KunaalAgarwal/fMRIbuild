#!/usr/bin/env bash
# Test: ANTs Atropos (Segmentation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="Atropos"
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
intensity_image:
  class: File
  path: "${T1_RES}"
mask_image:
  class: File
  path: "${ANTS_MASK}"
output_prefix: "atropos_seg.nii.gz"
initialization: "kmeans[2]"
convergence: "[3,0.001]"
mrf: "[0.1,1x1x1]"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

verify_nifti "${TOOL_OUT}/atropos_seg.nii.gz" "INT"

# Posteriors array (produced only when using formatted -o syntax)
post_count=0
for post in "${TOOL_OUT}"/atropos_seg*Posteriors*.nii.gz; do
  [[ -f "$post" ]] || continue
  verify_nifti "$post" "FLOAT"
  ((post_count++))
done
if [[ "$post_count" -gt 0 ]]; then
  echo "  Posteriors found: ${post_count}"
else
  echo "  OPTIONAL-SKIP: posteriors (not produced with simple output prefix)"
fi

verify_log "$TOOL"
