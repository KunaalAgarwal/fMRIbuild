#!/usr/bin/env bash
set -euo pipefail

# Test: FSL eddy - Eddy current and motion correction
# CWL: public/cwl/fsl/eddy.cwl

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="eddy"
CWL_FILE="$CWL_DIR/fsl/eddy.cwl"
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
input:
  class: File
  path: $DATA_DIR/dwi.nii.gz
bvals:
  class: File
  path: $DATA_DIR/dwi.bval
bvecs:
  class: File
  path: $DATA_DIR/dwi.bvec
acqp:
  class: File
  path: $DATA_DIR/acqparams.txt
index:
  class: File
  path: $DATA_DIR/index.txt
mask:
  class: File
  path: $DATA_DIR/mask.nii.gz
output: eddy_out
nvoxhp: 400
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
check_file_exists "$OUTPUT_DIR/eddy_out.nii.gz" "corrected_image" "$RESULTS_FILE" || PASS=false
check_file_nonempty "$OUTPUT_DIR/eddy_out.nii.gz" "corrected_image" "$RESULTS_FILE" || PASS=false
check_file_exists "$OUTPUT_DIR/eddy_out.eddy_rotated_bvecs" "rotated_bvecs" "$RESULTS_FILE" || PASS=false
check_file_nonempty "$OUTPUT_DIR/eddy_out.eddy_rotated_bvecs" "rotated_bvecs" "$RESULTS_FILE" || PASS=false
check_file_exists "$OUTPUT_DIR/eddy_out.eddy_parameters" "parameters" "$RESULTS_FILE" || PASS=false

# Step 6: Header checks
echo "--- Header checks ---" | tee -a "$RESULTS_FILE"
if [[ -f "$OUTPUT_DIR/eddy_out.nii.gz" ]]; then
    check_nifti_header "$OUTPUT_DIR/eddy_out.nii.gz" "corrected_image" "$RESULTS_FILE" || PASS=false
fi

scan_log_for_errors "$RESULTS_FILE" "$TOOL_NAME"

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
