#!/usr/bin/env bash
set -euo pipefail

# Test: FSL tbss_non_FA - TBSS Step 5: Project non-FA data onto FA skeleton
# CWL: public/cwl/fsl/tbss_non_FA.cwl
# DEPENDS: tbss_4_prestats output (needs FA/ and stats/ from steps 3+4)

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="tbss_non_FA"
CWL_FILE="$CWL_DIR/fsl/tbss_non_FA.cwl"
OUTPUT_DIR="$(setup_output_dir "$TOOL_NAME")"
RESULTS_FILE="$OUTPUT_DIR/results.txt"

echo "=== Testing $TOOL_NAME ===" | tee "$RESULTS_FILE"
echo "Date: $(date)" | tee -a "$RESULTS_FILE"

# The tbss_non_FA CWL needs:
#   fa_directory: FA directory from step 3 (contains per-subject FA images)
#   stats_directory: stats from step 3+4 (mean_FA_skeleton, all_FA_skeletonised, plus all_MD)

# Step 3 outputs
FA_STEP3="$INTERMEDIATE_DIR/tbss_FA_step3"
STATS_STEP3="$INTERMEDIATE_DIR/tbss_stats_step3"

# Step 4 output
SKEL_STEP4="$OUTPUT_BASE/tbss_4_prestats/all_FA_skeletonised.nii.gz"

# Run prerequisites if needed
if [[ ! -d "$FA_STEP3" || ! -d "$STATS_STEP3" ]]; then
    echo "Running tbss_3_postreg first..." | tee -a "$RESULTS_FILE"
    bash "$SCRIPT_DIR/test_tbss_3_postreg.sh"
fi
if [[ ! -f "$SKEL_STEP4" ]]; then
    echo "Running tbss_4_prestats first..." | tee -a "$RESULTS_FILE"
    bash "$SCRIPT_DIR/test_tbss_4_prestats.sh"
    SKEL_STEP4="$OUTPUT_BASE/tbss_4_prestats/all_FA_skeletonised.nii.gz"
fi

if [[ ! -d "$FA_STEP3" || ! -d "$STATS_STEP3" || ! -f "$SKEL_STEP4" ]]; then
    echo -e "${RED}FAIL: Cannot find TBSS prerequisite data${NC}" | tee -a "$RESULTS_FILE"
    exit 1
fi

# Assemble a combined stats directory for tbss_non_FA
# It needs: mean_FA_skeleton.nii.gz (from step 3), all_FA_skeletonised.nii.gz (from step 4),
# plus all_MD.nii.gz (synthetic non-FA data to project)
ensure_intermediate
SYNTH_STATS="$INTERMEDIATE_DIR/tbss_stats_nonFA"
if [[ ! -d "$SYNTH_STATS" ]]; then
    echo "Assembling stats directory for tbss_non_FA..." | tee -a "$RESULTS_FILE"
    mkdir -p "$SYNTH_STATS"
    # Copy step 3 stats
    cp "$STATS_STEP3"/*.nii.gz "$SYNTH_STATS/"
    # Copy step 4 skeleton
    cp "$SKEL_STEP4" "$SYNTH_STATS/"
    # Create a skeleton mask from the skeleton (threshold > 0)
    (cd /tmp && docker run --rm -v "$SYNTH_STATS:/data" brainlife/fsl:latest \
        fslmaths /data/mean_FA_skeleton.nii.gz -thr 0.2 -bin /data/mean_FA_skeleton_mask.nii.gz) 2>/dev/null || true
    # Create thresh.txt (needed by tbss_non_FA to read the skeleton threshold)
    echo "0.2" > "$SYNTH_STATS/thresh.txt"
    # Create synthetic distance map from skeleton mask (tbss_skeleton -p needs it)
    # Real distancemap is too slow; fslmaths approximation is sufficient for CWL testing
    (cd /tmp && docker run --rm -v "$SYNTH_STATS:/data" brainlife/fsl:latest \
        fslmaths /data/mean_FA_skeleton_mask -kernel gauss 3 -dilM -s 2 /data/mean_FA_skeleton_mask_dst) 2>/dev/null || true
    # Create synthetic MD data by copying all_FA as all_MD
    cp "$SYNTH_STATS/all_FA.nii.gz" "$SYNTH_STATS/all_MD.nii.gz"
fi

# Reset cwd after docker operations (WSL Docker cwd bug)
cd "$SCRIPT_DIR"

# Create MD directory with per-subject images matching FA naming convention
# tbss_non_FA strips _FA from FA filenames (e.g. fa_sub01_FA -> fa_sub01)
# then looks for ../MD/fa_sub01 (FSL auto-adds .nii.gz)
MD_DIR="$INTERMEDIATE_DIR/tbss_MD_nonFA"
if [[ ! -d "$MD_DIR" ]]; then
    echo "Creating synthetic MD directory..." | tee -a "$RESULTS_FILE"
    mkdir -p "$MD_DIR"
    for fa_file in "$FA_STEP3"/*_FA.nii.gz; do
        [[ -f "$fa_file" ]] || continue
        base="$(basename "$fa_file")"
        # Strip _FA suffix: fa_sub01_FA.nii.gz -> fa_sub01.nii.gz
        md_name="${base/_FA.nii.gz/.nii.gz}"
        cp "$fa_file" "$MD_DIR/$md_name"
    done
    echo "MD directory contents:" | tee -a "$RESULTS_FILE"
    ls "$MD_DIR" 2>/dev/null | tee -a "$RESULTS_FILE"
fi

# Step 1: Validate CWL
validate_cwl "$CWL_FILE" "$RESULTS_FILE" || exit 1

# Step 2: Generate template
echo "--- Generating template ---" | tee -a "$RESULTS_FILE"
(cd /tmp && cwltool --make-template "$CWL_FILE") > "$OUTPUT_DIR/template.yml" 2>/dev/null
echo "Template saved to $OUTPUT_DIR/template.yml" | tee -a "$RESULTS_FILE"

# Step 3: Create job YAML
cat > "$OUTPUT_DIR/job.yml" << EOF
measure: MD
fa_directory:
  class: Directory
  path: $FA_STEP3
stats_directory:
  class: Directory
  path: $SYNTH_STATS
measure_directory:
  class: Directory
  path: $MD_DIR
EOF

# Step 4: Run tool
echo "--- Running $TOOL_NAME ---" | tee -a "$RESULTS_FILE"
PASS=true
if (cd /tmp && cwltool --outdir "$OUTPUT_DIR" "$CWL_FILE" "$OUTPUT_DIR/job.yml") >> "$RESULTS_FILE" 2>&1; then
    echo -e "${GREEN}PASS: $TOOL_NAME execution${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}FAIL: $TOOL_NAME execution${NC}" | tee -a "$RESULTS_FILE"
    PASS=false
fi

# Step 5: Check outputs
echo "--- Output validation ---" | tee -a "$RESULTS_FILE"
SKEL_FILE="$OUTPUT_DIR/stats/all_MD_skeletonised.nii.gz"
if [[ ! -f "$SKEL_FILE" ]]; then
    SKEL_FILE="$OUTPUT_DIR/all_MD_skeletonised.nii.gz"
fi
check_file_exists "$SKEL_FILE" "all_MD_skeletonised" "$RESULTS_FILE" || PASS=false
check_file_nonempty "$SKEL_FILE" "all_MD_skeletonised" "$RESULTS_FILE" || PASS=false

# Step 6: Header checks
echo "--- Header checks ---" | tee -a "$RESULTS_FILE"
if [[ -f "$SKEL_FILE" ]]; then
    check_nifti_header "$SKEL_FILE" "all_MD_skeletonised" "$RESULTS_FILE" || PASS=false
fi

scan_log_for_errors "$RESULTS_FILE" "$TOOL_NAME"

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
