#!/usr/bin/env bash
set -euo pipefail

# Test: MRtrix3 tckgen - Streamline tractography generation
# CWL: public/cwl/mrtrix3/tckgen.cwl
# DEPENDS: dwi2fod output

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="tckgen"
CWL_FILE="$CWL_DIR/mrtrix3/tckgen.cwl"
OUTPUT_DIR="$(setup_output_dir "$TOOL_NAME")"
RESULTS_FILE="$OUTPUT_DIR/results.txt"

echo "=== Testing $TOOL_NAME ===" | tee "$RESULTS_FILE"
echo "Date: $(date)" | tee -a "$RESULTS_FILE"

# Ensure FOD exists
FOD_INPUT="$INTERMEDIATE_DIR/wm_fod.mif"
if [[ ! -f "$FOD_INPUT" ]]; then
    FOD_INPUT="$OUTPUT_BASE/dwi2fod/wm_fod.mif"
fi
if [[ ! -f "$FOD_INPUT" ]]; then
    echo "Running dwi2fod first..." | tee -a "$RESULTS_FILE"
    bash "$SCRIPT_DIR/test_dwi2fod.sh"
    FOD_INPUT="$INTERMEDIATE_DIR/wm_fod.mif"
fi

# Step 1: Validate CWL
validate_cwl "$CWL_FILE" "$RESULTS_FILE" || exit 1

# Step 2: Generate template
echo "--- Generating template ---" | tee -a "$RESULTS_FILE"
cwltool --make-template "$CWL_FILE" > "$OUTPUT_DIR/template.yml" 2>/dev/null
echo "Template saved to $OUTPUT_DIR/template.yml" | tee -a "$RESULTS_FILE"

# Step 3: Create job YAML
cat > "$OUTPUT_DIR/job.yml" << EOF
source:
  class: File
  path: $FOD_INPUT
output: tracks.tck
algorithm: iFOD2
seed_image:
  class: File
  path: $DATA_DIR/mask.nii.gz
select: 1000
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
check_file_exists "$OUTPUT_DIR/tracks.tck" "tractogram" "$RESULTS_FILE" || PASS=false
check_file_nonempty "$OUTPUT_DIR/tracks.tck" "tractogram" "$RESULTS_FILE" || PASS=false

# Save intermediate for tcksift/tck2connectome
ensure_intermediate
if [[ -f "$OUTPUT_DIR/tracks.tck" ]]; then
    cp "$OUTPUT_DIR/tracks.tck" "$INTERMEDIATE_DIR/tracks.tck" 2>/dev/null || true
fi

scan_log_for_errors "$RESULTS_FILE" "$TOOL_NAME"

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
