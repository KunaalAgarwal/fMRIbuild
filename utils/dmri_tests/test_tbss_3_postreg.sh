#!/usr/bin/env bash
set -euo pipefail

# Test: FSL tbss_3_postreg - TBSS Step 3: Post-registration
# CWL: public/cwl/fsl/tbss_3_postreg.cwl
# DEPENDS: tbss_2_reg output

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="tbss_3_postreg"
CWL_FILE="$CWL_DIR/fsl/tbss_3_postreg.cwl"
OUTPUT_DIR="$(setup_output_dir "$TOOL_NAME")"
RESULTS_FILE="$OUTPUT_DIR/results.txt"

echo "=== Testing $TOOL_NAME ===" | tee "$RESULTS_FILE"
echo "Date: $(date)" | tee -a "$RESULTS_FILE"

# Ensure tbss_2 output exists
FA_INPUT="$INTERMEDIATE_DIR/tbss_FA_step2"
if [[ ! -d "$FA_INPUT" ]]; then
    FA_INPUT="$OUTPUT_BASE/tbss_2_reg/FA"
fi
if [[ ! -d "$FA_INPUT" ]]; then
    echo "Running tbss_2_reg first..." | tee -a "$RESULTS_FILE"
    bash "$SCRIPT_DIR/test_tbss_2_reg.sh"
    FA_INPUT="$INTERMEDIATE_DIR/tbss_FA_step2"
fi

# Step 1: Validate CWL
validate_cwl "$CWL_FILE" "$RESULTS_FILE" || exit 1

# Step 2: Generate template
echo "--- Generating template ---" | tee -a "$RESULTS_FILE"
cwltool --make-template "$CWL_FILE" > "$OUTPUT_DIR/template.yml" 2>/dev/null
echo "Template saved to $OUTPUT_DIR/template.yml" | tee -a "$RESULTS_FILE"

# Step 3: Create job YAML
cat > "$OUTPUT_DIR/job.yml" << EOF
fa_directory:
  class: Directory
  path: $FA_INPUT
use_fmrib: true
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
check_file_exists "$OUTPUT_DIR/mean_FA.nii.gz" "mean_FA" "$RESULTS_FILE" || PASS=false
check_file_nonempty "$OUTPUT_DIR/mean_FA.nii.gz" "mean_FA" "$RESULTS_FILE" || PASS=false
check_file_exists "$OUTPUT_DIR/mean_FA_skeleton.nii.gz" "mean_FA_skeleton" "$RESULTS_FILE" || PASS=false
check_file_exists "$OUTPUT_DIR/all_FA.nii.gz" "all_FA" "$RESULTS_FILE" || PASS=false

# Step 6: Header checks
echo "--- Header checks ---" | tee -a "$RESULTS_FILE"
if [[ -f "$OUTPUT_DIR/mean_FA.nii.gz" ]]; then
    check_nifti_header "$OUTPUT_DIR/mean_FA.nii.gz" "mean_FA" "$RESULTS_FILE" || PASS=false
fi

# Save intermediate for tbss_4
ensure_intermediate
if [[ -d "$OUTPUT_DIR/stats" ]]; then
    rm -rf "$INTERMEDIATE_DIR/tbss_stats_step3"
    cp -r "$OUTPUT_DIR/stats" "$INTERMEDIATE_DIR/tbss_stats_step3"
fi
# Also save updated FA dir
if [[ -d "$OUTPUT_DIR/FA" ]]; then
    rm -rf "$INTERMEDIATE_DIR/tbss_FA_step3"
    cp -r "$OUTPUT_DIR/FA" "$INTERMEDIATE_DIR/tbss_FA_step3"
fi

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
