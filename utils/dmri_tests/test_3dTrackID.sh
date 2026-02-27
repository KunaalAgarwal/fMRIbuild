#!/usr/bin/env bash
set -euo pipefail

# Test: AFNI 3dTrackID - Deterministic and probabilistic tractography
# CWL: public/cwl/afni/3dTrackID.cwl
# Depends on: 3dDWItoDT output (needs DTI parameter volumes with -eigs -sep_dsets)

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="3dTrackID"
CWL_FILE="$CWL_DIR/afni/3dTrackID.cwl"
OUTPUT_DIR="$(setup_output_dir "$TOOL_NAME")"
RESULTS_FILE="$OUTPUT_DIR/results.txt"

echo "=== Testing $TOOL_NAME ===" | tee "$RESULTS_FILE"
echo "Date: $(date)" | tee -a "$RESULTS_FILE"

# Step 1: Validate CWL
validate_cwl "$CWL_FILE" "$RESULTS_FILE" || exit 1

# Step 2: Generate template
echo "--- Generating template ---" | tee -a "$RESULTS_FILE"
(cd /tmp && cwltool --make-template "$CWL_FILE") > "$OUTPUT_DIR/template.yml" 2>/dev/null
echo "Template saved to $OUTPUT_DIR/template.yml" | tee -a "$RESULTS_FILE"

# Step 3: Prerequisite — run 3dDWItoDT with -eigs -sep_dsets
# This produces separate files: dt_linear_FA, dt_linear_V1, dt_linear_V2, dt_linear_V3, etc.
DTI_DIR="$OUTPUT_BASE/3dDWItoDT"

# Check for the FA file as indicator that sep_dsets was used
DTI_FA_HEAD=""
DTI_SUFFIX=""
for suffix in +orig +tlrc; do
    if [[ -f "${DTI_DIR}/dt_linear_FA${suffix}.HEAD" ]]; then
        DTI_FA_HEAD="${DTI_DIR}/dt_linear_FA${suffix}.HEAD"
        DTI_SUFFIX="${suffix}"
        break
    fi
done
if [[ -z "$DTI_FA_HEAD" ]]; then
    echo "Running prerequisite: 3dDWItoDT (with -sep_dsets)..." | tee -a "$RESULTS_FILE"
    bash "$(dirname "${BASH_SOURCE[0]}")/test_3dDWItoDT.sh"
    for suffix in +orig +tlrc; do
        if [[ -f "${DTI_DIR}/dt_linear_FA${suffix}.HEAD" ]]; then
            DTI_FA_HEAD="${DTI_DIR}/dt_linear_FA${suffix}.HEAD"
            DTI_SUFFIX="${suffix}"
            break
        fi
    done
fi

if [[ -z "$DTI_FA_HEAD" ]]; then
    echo -e "${RED}FAIL: 3dDWItoDT prerequisite: no separate DTI files found${NC}" | tee -a "$RESULTS_FILE"
    echo "  Expected dt_linear_FA+orig.HEAD or dt_linear_FA+tlrc.HEAD" | tee -a "$RESULTS_FILE"
    echo "  Files in DTI dir:" | tee -a "$RESULTS_FILE"
    ls -la "$DTI_DIR"/ 2>/dev/null | tee -a "$RESULTS_FILE"
    echo -e "${RED}=== $TOOL_NAME: PREREQUISITE FAILED ===${NC}" | tee -a "$RESULTS_FILE"
    exit 1
fi

echo "DTI suffix: $DTI_SUFFIX" | tee -a "$RESULTS_FILE"
echo "DTI prefix: dt_linear" | tee -a "$RESULTS_FILE"

# Build the dti_files YAML entries — collect all separate DTI HEAD+BRIK pairs
DTI_FILES_YAML=""
for param in DT FA MD RD L1 L2 L3 V1 V2 V3; do
    head_f="${DTI_DIR}/dt_linear_${param}${DTI_SUFFIX}.HEAD"
    brik_f="${DTI_DIR}/dt_linear_${param}${DTI_SUFFIX}.BRIK"
    if [[ -f "$head_f" ]]; then
        DTI_FILES_YAML="${DTI_FILES_YAML}  - class: File
    path: $head_f
"
    fi
    if [[ -f "$brik_f" ]]; then
        DTI_FILES_YAML="${DTI_FILES_YAML}  - class: File
    path: $brik_f
"
    fi
done

echo "DTI files found:" | tee -a "$RESULTS_FILE"
echo "$DTI_FILES_YAML" | grep "path:" | tee -a "$RESULTS_FILE"

# Step 4: Create ROI mask for tractography (use parcellation atlas)
NETROIS="$DATA_DIR/parcellation.nii.gz"
if [[ ! -f "$NETROIS" ]]; then
    echo -e "${RED}FAIL: parcellation.nii.gz not found${NC}" | tee -a "$RESULTS_FILE"
    exit 1
fi

PASS=true

# Step 5: Test deterministic tractography
echo "--- Running $TOOL_NAME (DET mode) ---" | tee -a "$RESULTS_FILE"
cat > "$OUTPUT_DIR/job_det.yml" << EOF
mode: DET
dti_in: "dt_linear"
dti_files:
${DTI_FILES_YAML}netrois:
  class: File
  path: $NETROIS
prefix: track_det
mask:
  class: File
  path: $DATA_DIR/mask.nii.gz
logic: OR
alg_Thresh_FA: 0.1
alg_Thresh_ANG: 60.0
alg_Thresh_Len: 10.0
EOF

if (cd /tmp && cwltool --outdir "$OUTPUT_DIR" "$CWL_FILE" "$OUTPUT_DIR/job_det.yml") >> "$RESULTS_FILE" 2>&1; then
    echo -e "${GREEN}PASS: $TOOL_NAME DET execution${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}FAIL: $TOOL_NAME DET execution${NC}" | tee -a "$RESULTS_FILE"
    PASS=false
fi

# Step 6: Check DET outputs
echo "--- DET output validation ---" | tee -a "$RESULTS_FILE"

# Tract files
for ext in .trk .niml.tract; do
    tract="$(find "$OUTPUT_DIR" -maxdepth 1 -name "track_det*${ext}" 2>/dev/null | head -1 || true)"
    if [[ -n "$tract" && -f "$tract" ]]; then
        check_file_nonempty "$tract" "DET_tracts${ext}" "$RESULTS_FILE" || PASS=false
    else
        echo "OPTIONAL: no ${ext} tract file found" | tee -a "$RESULTS_FILE"
    fi
done

# Connectivity matrix (.grid)
grid="$(find "$OUTPUT_DIR" -maxdepth 1 -name "track_det*.grid" 2>/dev/null | head -1 || true)"
if [[ -n "$grid" && -f "$grid" ]]; then
    check_file_nonempty "$grid" "DET_connectivity_matrix" "$RESULTS_FILE" || PASS=false
    lines="$(wc -l < "$grid" 2>/dev/null || echo 0)"
    echo "Connectivity matrix: $lines lines" | tee -a "$RESULTS_FILE"
fi

# Step 7: PROB and MINIP modes require uncertainty data from 3dDWUncert.
# 3dDWUncert has a known upstream AFNI bug (SIGSEGV), so uncertainty data
# is unavailable. We skip PROB/MINIP execution and document the dependency.
echo "--- PROB mode ---" | tee -a "$RESULTS_FILE"
echo -e "${YELLOW}SKIP: PROB mode requires uncertainty data from 3dDWUncert (upstream AFNI SIGSEGV bug)${NC}" | tee -a "$RESULTS_FILE"

echo "--- MINIP mode ---" | tee -a "$RESULTS_FILE"
echo -e "${YELLOW}SKIP: MINIP mode requires uncertainty data from 3dDWUncert (upstream AFNI SIGSEGV bug)${NC}" | tee -a "$RESULTS_FILE"

scan_log_for_errors "$RESULTS_FILE" "$TOOL_NAME"

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
