#!/usr/bin/env bash
set -euo pipefail

# Test: FSL dtifit - Diffusion tensor fitting
# CWL: public/cwl/fsl/dtifit.cwl

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="dtifit"
CWL_FILE="$CWL_DIR/fsl/dtifit.cwl"
OUTPUT_DIR="$(setup_output_dir "$TOOL_NAME")"
RESULTS_FILE="$OUTPUT_DIR/results.txt"

echo "=== Testing $TOOL_NAME ===" | tee "$RESULTS_FILE"
echo "Date: $(date)" | tee -a "$RESULTS_FILE"

# Step 1: Validate CWL
validate_cwl "$CWL_FILE" "$RESULTS_FILE" || exit 1

# Step 2: Generate template
echo "--- Generating template ---" | tee -a "$RESULTS_FILE"
cwltool --make-template "$CWL_FILE" > "$OUTPUT_DIR/template.yml" 2>/dev/null
echo "Template saved to $OUTPUT_DIR/template.yml" | tee -a "$RESULTS_FILE"

# Step 3: Create job YAML
cat > "$OUTPUT_DIR/job.yml" << EOF
data:
  class: File
  path: $DATA_DIR/dwi.nii.gz
mask:
  class: File
  path: $DATA_DIR/mask.nii.gz
bvecs:
  class: File
  path: $DATA_DIR/dwi.bvec
bvals:
  class: File
  path: $DATA_DIR/dwi.bval
output: dti
EOF

# Step 4: Run tool
echo "--- Running $TOOL_NAME ---" | tee -a "$RESULTS_FILE"
PASS=true
if cwltool --outdir "$OUTPUT_DIR" "$CWL_FILE" "$OUTPUT_DIR/job.yml" >> "$RESULTS_FILE" 2>&1; then
    echo -e "${GREEN}PASS: $TOOL_NAME execution${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}FAIL: $TOOL_NAME execution${NC}" | tee -a "$RESULTS_FILE"
    PASS=false
fi

# Step 5: Check outputs
echo "--- Output validation ---" | tee -a "$RESULTS_FILE"
for metric in FA MD L1 L2 L3 V1 V2 V3; do
    check_file_exists "$OUTPUT_DIR/dti_${metric}.nii.gz" "$metric" "$RESULTS_FILE" || PASS=false
done
check_file_nonempty "$OUTPUT_DIR/dti_FA.nii.gz" "FA" "$RESULTS_FILE" || PASS=false
check_file_nonempty "$OUTPUT_DIR/dti_MD.nii.gz" "MD" "$RESULTS_FILE" || PASS=false

# Step 6: Header checks
echo "--- Header checks ---" | tee -a "$RESULTS_FILE"
if [[ -f "$OUTPUT_DIR/dti_FA.nii.gz" ]]; then
    check_nifti_header "$OUTPUT_DIR/dti_FA.nii.gz" "FA" "$RESULTS_FILE" || PASS=false
fi
if [[ -f "$OUTPUT_DIR/dti_MD.nii.gz" ]]; then
    check_nifti_header "$OUTPUT_DIR/dti_MD.nii.gz" "MD" "$RESULTS_FILE" || PASS=false
fi

scan_log_for_errors "$RESULTS_FILE" "$TOOL_NAME"

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
