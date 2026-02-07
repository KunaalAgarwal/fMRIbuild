#!/usr/bin/env bash
set -euo pipefail

# Test: FSL probtrackx2 - Probabilistic tractography
# CWL: public/cwl/fsl/probtrackx2.cwl
# DEPENDS: bedpostx output (run test_bedpostx.sh first)

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="probtrackx2"
CWL_FILE="$CWL_DIR/fsl/probtrackx2.cwl"
OUTPUT_DIR="$(setup_output_dir "$TOOL_NAME")"
RESULTS_FILE="$OUTPUT_DIR/results.txt"

echo "=== Testing $TOOL_NAME ===" | tee "$RESULTS_FILE"
echo "Date: $(date)" | tee -a "$RESULTS_FILE"

# Check for bedpostx output
BEDPOSTX_DIR="$INTERMEDIATE_DIR/bedpostx_output"
if [[ ! -d "$BEDPOSTX_DIR" ]]; then
    BEDPOSTX_DIR="$OUTPUT_BASE/bedpostx/bedpostx_input.bedpostX"
fi
if [[ ! -d "$BEDPOSTX_DIR" ]]; then
    echo -e "${YELLOW}SKIP: bedpostx output not found. Run test_bedpostx.sh first.${NC}" | tee -a "$RESULTS_FILE"
    exit 0
fi

# Step 1: Validate CWL
validate_cwl "$CWL_FILE" "$RESULTS_FILE" || exit 1

# Step 2: Generate template
echo "--- Generating template ---" | tee -a "$RESULTS_FILE"
cwltool --make-template "$CWL_FILE" > "$OUTPUT_DIR/template.yml" 2>/dev/null
echo "Template saved to $OUTPUT_DIR/template.yml" | tee -a "$RESULTS_FILE"

# Step 3: Create job YAML
cat > "$OUTPUT_DIR/job.yml" << EOF
samples: $BEDPOSTX_DIR/merged
mask:
  class: File
  path: $DATA_DIR/mask.nii.gz
seed:
  class: File
  path: $DATA_DIR/mask.nii.gz
output_dir: probtrack_out
n_samples: 100
loopcheck: true
opd: true
force_dir: true
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
check_file_exists "$OUTPUT_DIR/probtrack_out" "output_directory" "$RESULTS_FILE" || PASS=false

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
