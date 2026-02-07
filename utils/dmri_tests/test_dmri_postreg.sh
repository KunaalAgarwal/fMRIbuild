#!/usr/bin/env bash
set -euo pipefail

# Test: FreeSurfer dmri_postreg - dMRI post-registration
# CWL: public/cwl/freesurfer/dmri_postreg.cwl
# NOTE: Requires FreeSurfer license file

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="dmri_postreg"
CWL_FILE="$CWL_DIR/freesurfer/dmri_postreg.cwl"
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
subjects_dir:
  class: Directory
  path: $DATA_DIR/freesurfer_subjects
fs_license:
  class: File
  path: $DATA_DIR/fs_license.txt
input:
  class: File
  path: $DATA_DIR/b0.nii.gz
output: postreg_output.nii.gz
EOF

# Step 4: Run tool
echo "--- Running $TOOL_NAME ---" | tee -a "$RESULTS_FILE"
echo "NOTE: This tool requires a valid FreeSurfer license. Test may fail with dummy license." | tee -a "$RESULTS_FILE"
PASS=true
if cwltool --outdir "$OUTPUT_DIR" "$CWL_FILE" "$OUTPUT_DIR/job.yml" >> "$RESULTS_FILE" 2>&1; then
    echo -e "${GREEN}PASS: $TOOL_NAME execution${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}FAIL: $TOOL_NAME execution${NC}" | tee -a "$RESULTS_FILE"
    PASS=false
fi

# Step 5: Check outputs
echo "--- Output validation ---" | tee -a "$RESULTS_FILE"
# Output glob is $(inputs.output)* so could be postreg_output.nii.gz or similar
for f in "$OUTPUT_DIR"/postreg_output*; do
    if [[ -f "$f" ]]; then
        check_file_nonempty "$f" "out_file" "$RESULTS_FILE" || PASS=false
        # Try header check if NIfTI
        if [[ "$f" == *.nii.gz || "$f" == *.nii ]]; then
            check_nifti_header "$f" "out_file" "$RESULTS_FILE" || PASS=false
        fi
        break
    fi
done

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
