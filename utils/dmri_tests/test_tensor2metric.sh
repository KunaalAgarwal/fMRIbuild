#!/usr/bin/env bash
set -euo pipefail

# Test: MRtrix3 tensor2metric - Extract metrics from diffusion tensors
# CWL: public/cwl/mrtrix3/tensor2metric.cwl
# DEPENDS: dwi2tensor output

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="tensor2metric"
CWL_FILE="$CWL_DIR/mrtrix3/tensor2metric.cwl"
OUTPUT_DIR="$(setup_output_dir "$TOOL_NAME")"
RESULTS_FILE="$OUTPUT_DIR/results.txt"

echo "=== Testing $TOOL_NAME ===" | tee "$RESULTS_FILE"
echo "Date: $(date)" | tee -a "$RESULTS_FILE"

# Ensure tensor exists
TENSOR_INPUT="$INTERMEDIATE_DIR/tensor.mif"
if [[ ! -f "$TENSOR_INPUT" ]]; then
    TENSOR_INPUT="$OUTPUT_BASE/dwi2tensor/tensor.mif"
fi
if [[ ! -f "$TENSOR_INPUT" ]]; then
    echo "Running dwi2tensor first..." | tee -a "$RESULTS_FILE"
    bash "$SCRIPT_DIR/test_dwi2tensor.sh"
    TENSOR_INPUT="$INTERMEDIATE_DIR/tensor.mif"
fi

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
  path: $TENSOR_INPUT
fa: fa.mif
adc: md.mif
ad: ad.mif
rd: rd.mif
mask:
  class: File
  path: $DATA_DIR/mask.nii.gz
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
check_file_exists "$OUTPUT_DIR/fa.mif" "fa_map" "$RESULTS_FILE" || PASS=false
check_file_nonempty "$OUTPUT_DIR/fa.mif" "fa_map" "$RESULTS_FILE" || PASS=false
check_file_exists "$OUTPUT_DIR/md.mif" "md_map" "$RESULTS_FILE" || PASS=false
check_file_exists "$OUTPUT_DIR/ad.mif" "ad_map" "$RESULTS_FILE" || PASS=false
check_file_exists "$OUTPUT_DIR/rd.mif" "rd_map" "$RESULTS_FILE" || PASS=false

# Step 6: Header checks
echo "--- Header checks ---" | tee -a "$RESULTS_FILE"
if [[ -f "$OUTPUT_DIR/fa.mif" ]]; then
    check_mif_header "$OUTPUT_DIR/fa.mif" "fa_map" "$RESULTS_FILE" || PASS=false
fi

scan_log_for_errors "$RESULTS_FILE" "$TOOL_NAME"

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
