#!/usr/bin/env bash
set -euo pipefail

# Test: FSL bedpostx - Bayesian estimation of diffusion parameters
# CWL: public/cwl/fsl/bedpostx.cwl
# NOTE: This tool is VERY slow. Consider using a small ROI mask for testing.

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="bedpostx"
CWL_FILE="$CWL_DIR/fsl/bedpostx.cwl"
OUTPUT_DIR="$(setup_output_dir "$TOOL_NAME")"
RESULTS_FILE="$OUTPUT_DIR/results.txt"

echo "=== Testing $TOOL_NAME ===" | tee "$RESULTS_FILE"
echo "Date: $(date)" | tee -a "$RESULTS_FILE"
echo "WARNING: bedpostx is computationally intensive and may take a long time." | tee -a "$RESULTS_FILE"

# Step 1: Validate CWL
validate_cwl "$CWL_FILE" "$RESULTS_FILE" || exit 1

# Step 2: Generate template
echo "--- Generating template ---" | tee -a "$RESULTS_FILE"
cwltool --make-template "$CWL_FILE" > "$OUTPUT_DIR/template.yml" 2>/dev/null
echo "Template saved to $OUTPUT_DIR/template.yml" | tee -a "$RESULTS_FILE"

# Step 3: Create job YAML
cat > "$OUTPUT_DIR/job.yml" << EOF
data_dir:
  class: Directory
  path: $DATA_DIR/bedpostx_input
nfibres: 2
model: 1
EOF

# Step 4: Run tool
echo "--- Running $TOOL_NAME ---" | tee -a "$RESULTS_FILE"
PASS=true
if cwltool --no-read-only --outdir "$OUTPUT_DIR" "$CWL_FILE" "$OUTPUT_DIR/job.yml" >> "$RESULTS_FILE" 2>&1; then
    echo -e "${GREEN}PASS: $TOOL_NAME execution${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}FAIL: $TOOL_NAME execution${NC}" | tee -a "$RESULTS_FILE"
    PASS=false
fi

# Step 5: Check outputs
echo "--- Output validation ---" | tee -a "$RESULTS_FILE"
check_file_exists "$OUTPUT_DIR/bedpostx_input.bedpostX" "output_directory" "$RESULTS_FILE" || PASS=false

# Save intermediate for probtrackx2
ensure_intermediate
if [[ -d "$OUTPUT_DIR/bedpostx_input.bedpostX" ]]; then
    cp -r "$OUTPUT_DIR/bedpostx_input.bedpostX" "$INTERMEDIATE_DIR/bedpostx_output" 2>/dev/null || true
fi

scan_log_for_errors "$RESULTS_FILE" "$TOOL_NAME"

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
