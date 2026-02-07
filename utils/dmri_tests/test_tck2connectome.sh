#!/usr/bin/env bash
set -euo pipefail

# Test: MRtrix3 tck2connectome - Generate connectivity matrix
# CWL: public/cwl/mrtrix3/tck2connectome.cwl
# DEPENDS: tckgen output

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="tck2connectome"
CWL_FILE="$CWL_DIR/mrtrix3/tck2connectome.cwl"
OUTPUT_DIR="$(setup_output_dir "$TOOL_NAME")"
RESULTS_FILE="$OUTPUT_DIR/results.txt"

echo "=== Testing $TOOL_NAME ===" | tee "$RESULTS_FILE"
echo "Date: $(date)" | tee -a "$RESULTS_FILE"

# Ensure tracks exist
TRACKS_INPUT="$INTERMEDIATE_DIR/tracks.tck"
if [[ ! -f "$TRACKS_INPUT" ]]; then
    TRACKS_INPUT="$OUTPUT_BASE/tckgen/tracks.tck"
fi
if [[ ! -f "$TRACKS_INPUT" ]]; then
    echo "Running tckgen first..." | tee -a "$RESULTS_FILE"
    bash "$SCRIPT_DIR/test_tckgen.sh"
    TRACKS_INPUT="$INTERMEDIATE_DIR/tracks.tck"
fi

# Step 1: Validate CWL
validate_cwl "$CWL_FILE" "$RESULTS_FILE" || exit 1

# Step 2: Generate template
echo "--- Generating template ---" | tee -a "$RESULTS_FILE"
cwltool --make-template "$CWL_FILE" > "$OUTPUT_DIR/template.yml" 2>/dev/null
echo "Template saved to $OUTPUT_DIR/template.yml" | tee -a "$RESULTS_FILE"

# Step 3: Create job YAML
cat > "$OUTPUT_DIR/job.yml" << EOF
input_tracks:
  class: File
  path: $TRACKS_INPUT
parcellation:
  class: File
  path: $DATA_DIR/parcellation.nii.gz
output: connectome.csv
symmetric: true
zero_diagonal: true
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
check_file_exists "$OUTPUT_DIR/connectome.csv" "connectome" "$RESULTS_FILE" || PASS=false
check_file_nonempty "$OUTPUT_DIR/connectome.csv" "connectome" "$RESULTS_FILE" || PASS=false

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
