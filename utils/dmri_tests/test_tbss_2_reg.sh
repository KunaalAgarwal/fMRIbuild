#!/usr/bin/env bash
set -euo pipefail

# Test: FSL tbss_2_reg - TBSS Step 2: Registration to standard space
# CWL: public/cwl/fsl/tbss_2_reg.cwl
# DEPENDS: tbss_1_preproc output

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="tbss_2_reg"
CWL_FILE="$CWL_DIR/fsl/tbss_2_reg.cwl"
OUTPUT_DIR="$(setup_output_dir "$TOOL_NAME")"
RESULTS_FILE="$OUTPUT_DIR/results.txt"

echo "=== Testing $TOOL_NAME ===" | tee "$RESULTS_FILE"
echo "Date: $(date)" | tee -a "$RESULTS_FILE"

# Ensure tbss_1 output exists
FA_INPUT="$INTERMEDIATE_DIR/tbss_FA_step1"
if [[ ! -d "$FA_INPUT" ]]; then
    FA_INPUT="$OUTPUT_BASE/tbss_1_preproc/FA"
fi
if [[ ! -d "$FA_INPUT" ]]; then
    echo "Running tbss_1_preproc first..." | tee -a "$RESULTS_FILE"
    bash "$SCRIPT_DIR/test_tbss_1_preproc.sh"
    FA_INPUT="$INTERMEDIATE_DIR/tbss_FA_step1"
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
use_fmrib_target: true
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
check_file_exists "$OUTPUT_DIR/FA" "FA_directory" "$RESULTS_FILE" || PASS=false

# Save intermediate for tbss_3
ensure_intermediate
if [[ -d "$OUTPUT_DIR/FA" ]]; then
    rm -rf "$INTERMEDIATE_DIR/tbss_FA_step2"
    cp -r "$OUTPUT_DIR/FA" "$INTERMEDIATE_DIR/tbss_FA_step2"
fi

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
