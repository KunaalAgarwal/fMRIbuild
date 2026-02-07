#!/usr/bin/env bash
set -euo pipefail

# Test: FSL tbss_4_prestats - TBSS Step 4: Pre-statistics thresholding
# CWL: public/cwl/fsl/tbss_4_prestats.cwl
# DEPENDS: tbss_3_postreg output

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="tbss_4_prestats"
CWL_FILE="$CWL_DIR/fsl/tbss_4_prestats.cwl"
OUTPUT_DIR="$(setup_output_dir "$TOOL_NAME")"
RESULTS_FILE="$OUTPUT_DIR/results.txt"

echo "=== Testing $TOOL_NAME ===" | tee "$RESULTS_FILE"
echo "Date: $(date)" | tee -a "$RESULTS_FILE"

# Ensure tbss_3 output exists
FA_INPUT="$INTERMEDIATE_DIR/tbss_FA_step3"
if [[ ! -d "$FA_INPUT" ]]; then
    FA_INPUT="$OUTPUT_BASE/tbss_3_postreg/FA"
fi
if [[ ! -d "$FA_INPUT" ]]; then
    echo "Running tbss_3_postreg first..." | tee -a "$RESULTS_FILE"
    bash "$SCRIPT_DIR/test_tbss_3_postreg.sh"
    FA_INPUT="$INTERMEDIATE_DIR/tbss_FA_step3"
fi

# Step 1: Validate CWL
validate_cwl "$CWL_FILE" "$RESULTS_FILE" || exit 1

# Step 2: Generate template
echo "--- Generating template ---" | tee -a "$RESULTS_FILE"
cwltool --make-template "$CWL_FILE" > "$OUTPUT_DIR/template.yml" 2>/dev/null
echo "Template saved to $OUTPUT_DIR/template.yml" | tee -a "$RESULTS_FILE"

# Step 3: Create job YAML
cat > "$OUTPUT_DIR/job.yml" << EOF
threshold: 0.2
fa_directory:
  class: Directory
  path: $FA_INPUT
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
check_file_exists "$OUTPUT_DIR/all_FA_skeletonised.nii.gz" "all_FA_skeletonised" "$RESULTS_FILE" || PASS=false
check_file_nonempty "$OUTPUT_DIR/all_FA_skeletonised.nii.gz" "all_FA_skeletonised" "$RESULTS_FILE" || PASS=false

# Step 6: Header checks
echo "--- Header checks ---" | tee -a "$RESULTS_FILE"
if [[ -f "$OUTPUT_DIR/all_FA_skeletonised.nii.gz" ]]; then
    check_nifti_header "$OUTPUT_DIR/all_FA_skeletonised.nii.gz" "all_FA_skeletonised" "$RESULTS_FILE" || PASS=false
fi

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
