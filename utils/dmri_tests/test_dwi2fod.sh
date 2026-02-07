#!/usr/bin/env bash
set -euo pipefail

# Test: MRtrix3 dwi2fod - Fibre orientation distribution estimation (CSD)
# CWL: public/cwl/mrtrix3/dwi2fod.cwl
# NOTE: Requires .mif input with embedded gradients

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="dwi2fod"
CWL_FILE="$CWL_DIR/mrtrix3/dwi2fod.cwl"
OUTPUT_DIR="$(setup_output_dir "$TOOL_NAME")"
RESULTS_FILE="$OUTPUT_DIR/results.txt"

echo "=== Testing $TOOL_NAME ===" | tee "$RESULTS_FILE"
echo "Date: $(date)" | tee -a "$RESULTS_FILE"

# Check for MIF input
MIF_INPUT="$DATA_DIR/dwi.mif"
if [[ ! -f "$MIF_INPUT" ]]; then
    echo -e "${RED}ERROR: dwi.mif not found. Run setup_test_data.sh first.${NC}" | tee -a "$RESULTS_FILE"
    exit 1
fi

# Step 1: Validate CWL
validate_cwl "$CWL_FILE" "$RESULTS_FILE" || exit 1

# Step 2: Generate template
echo "--- Generating template ---" | tee -a "$RESULTS_FILE"
cwltool --make-template "$CWL_FILE" > "$OUTPUT_DIR/template.yml" 2>/dev/null
echo "Template saved to $OUTPUT_DIR/template.yml" | tee -a "$RESULTS_FILE"

# Step 3: Create job YAML
cat > "$OUTPUT_DIR/job.yml" << EOF
algorithm: csd
input:
  class: File
  path: $MIF_INPUT
wm_response:
  class: File
  path: $DATA_DIR/wm_response.txt
wm_fod: wm_fod.mif
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
check_file_exists "$OUTPUT_DIR/wm_fod.mif" "wm_fod" "$RESULTS_FILE" || PASS=false
check_file_nonempty "$OUTPUT_DIR/wm_fod.mif" "wm_fod" "$RESULTS_FILE" || PASS=false

# Step 6: Header checks
echo "--- Header checks ---" | tee -a "$RESULTS_FILE"
if [[ -f "$OUTPUT_DIR/wm_fod.mif" ]]; then
    check_mif_header "$OUTPUT_DIR/wm_fod.mif" "wm_fod" "$RESULTS_FILE" || PASS=false
fi

# Save intermediate for tckgen/tcksift
ensure_intermediate
if [[ -f "$OUTPUT_DIR/wm_fod.mif" ]]; then
    cp "$OUTPUT_DIR/wm_fod.mif" "$INTERMEDIATE_DIR/wm_fod.mif" 2>/dev/null || true
fi

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
