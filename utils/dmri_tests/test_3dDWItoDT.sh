#!/usr/bin/env bash
set -euo pipefail

# Test: AFNI 3dDWItoDT - Fit diffusion tensor model to DWI data
# CWL: public/cwl/afni/3dDWItoDT.cwl

source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

check_prerequisites
check_test_data

TOOL_NAME="3dDWItoDT"
CWL_FILE="$CWL_DIR/afni/3dDWItoDT.cwl"
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

# Step 3: Prepare AFNI-format gradient file (3 columns, one row per DW volume)
# 3dDWItoDT expects N-1 gradient rows (diffusion-weighted only, excludes B0)
# The dataset has N volumes (1 B0 + N-1 DWI), gradient file has N-1 rows.
GRADS_FILE="$OUTPUT_DIR/grads.1D"
echo "Creating AFNI-format gradient file..." | tee -a "$RESULTS_FILE"
python3 - "$DATA_DIR/dwi.bvec" "$DATA_DIR/dwi.bval" "$GRADS_FILE" <<'PY'
import sys, numpy as np
bvec = np.loadtxt(sys.argv[1])  # 3 x N_volumes (FSL format)
bval = np.loadtxt(sys.argv[2])  # N_volumes
grads = bvec.T  # N_volumes x 3
# Remove B0 rows (where bval == 0)
dw_mask = bval > 0
grads_dw = grads[dw_mask]
np.savetxt(sys.argv[3], grads_dw, fmt='%.6f')
print(f"Created gradient file: {grads_dw.shape[0]} DW directions (excluded {(~dw_mask).sum()} B0 volumes)")
PY

# Step 4: Create job YAML — linear fit with eigenvalues
cat > "$OUTPUT_DIR/job.yml" << EOF
prefix: dt_linear
gradient_file:
  class: File
  path: $GRADS_FILE
input:
  class: File
  path: $DATA_DIR/dwi.nii.gz
mask:
  class: File
  path: $DATA_DIR/mask.nii.gz
eigs: true
linear: true
sep_dsets: true
EOF

# Step 5: Run tool
echo "--- Running $TOOL_NAME (linear with eigs) ---" | tee -a "$RESULTS_FILE"
PASS=true
if (cd /tmp && cwltool --outdir "$OUTPUT_DIR" "$CWL_FILE" "$OUTPUT_DIR/job.yml") >> "$RESULTS_FILE" 2>&1; then
    echo -e "${GREEN}PASS: $TOOL_NAME linear execution${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}FAIL: $TOOL_NAME linear execution${NC}" | tee -a "$RESULTS_FILE"
    PASS=false
fi

# Step 6: Check outputs — with -sep_dsets, look for individual parameter files
echo "--- Output validation ---" | tee -a "$RESULTS_FILE"

# With -sep_dsets, outputs are: prefix_DT, prefix_FA, prefix_MD, etc.
# Check for FA file as primary indicator of successful sep_dsets output
FA_HEAD=""
for suffix in +orig.HEAD +tlrc.HEAD; do
    if [[ -f "$OUTPUT_DIR/dt_linear_FA${suffix}" ]]; then
        FA_HEAD="$OUTPUT_DIR/dt_linear_FA${suffix}"
        break
    fi
done
# Fallback: check for combined output (no sep_dsets)
if [[ -z "$FA_HEAD" ]]; then
    for suffix in +orig.HEAD +tlrc.HEAD; do
        [[ -f "$OUTPUT_DIR/dt_linear${suffix}" ]] && FA_HEAD="$OUTPUT_DIR/dt_linear${suffix}" && break
    done
fi

if [[ -n "$FA_HEAD" ]]; then
    check_file_exists "$FA_HEAD" "FA_dataset" "$RESULTS_FILE" || PASS=false
    check_file_nonempty "$FA_HEAD" "FA_dataset" "$RESULTS_FILE" || PASS=false

    # Step 7: Verify expected separate datasets exist
    echo "--- Separate dataset validation ---" | tee -a "$RESULTS_FILE"
    for param in DT FA MD RD L1 L2 L3 V1 V2 V3; do
        found=false
        for suffix in +orig.HEAD +tlrc.HEAD; do
            if [[ -f "$OUTPUT_DIR/dt_linear_${param}${suffix}" ]]; then
                echo -e "${GREEN}PASS: ${param} dataset exists${NC}" | tee -a "$RESULTS_FILE"
                found=true
                break
            fi
        done
        if ! $found; then
            echo -e "${RED}FAIL: ${param} dataset not found${NC}" | tee -a "$RESULTS_FILE"
            PASS=false
        fi
    done

    # Step 8: Header checks via 3dinfo on FA
    echo "--- Header checks (FA) ---" | tee -a "$RESULTS_FILE"
    if docker run --rm -v "$OUTPUT_DIR:/data" brainlife/afni:latest \
        3dinfo -n4 -ad3 -space "/data/$(basename "$FA_HEAD")" 2>&1 | tee -a "$RESULTS_FILE"; then
        echo -e "${GREEN}PASS: FA header readable${NC}" | tee -a "$RESULTS_FILE"
    else
        echo -e "${RED}FAIL: FA header unreadable${NC}" | tee -a "$RESULTS_FILE"
        PASS=false
    fi
else
    echo -e "${RED}FAIL: no tensor output found${NC}" | tee -a "$RESULTS_FILE"
    PASS=false
fi

# Step 9: Run nonlinear variant
echo "--- Running $TOOL_NAME (nonlinear) ---" | tee -a "$RESULTS_FILE"
cat > "$OUTPUT_DIR/job_nonlinear.yml" << EOF
prefix: dt_nonlinear
gradient_file:
  class: File
  path: $GRADS_FILE
input:
  class: File
  path: $DATA_DIR/dwi.nii.gz
mask:
  class: File
  path: $DATA_DIR/mask.nii.gz
nonlinear: true
EOF

if (cd /tmp && cwltool --outdir "$OUTPUT_DIR" "$CWL_FILE" "$OUTPUT_DIR/job_nonlinear.yml") >> "$RESULTS_FILE" 2>&1; then
    echo -e "${GREEN}PASS: $TOOL_NAME nonlinear execution${NC}" | tee -a "$RESULTS_FILE"
    # Check nonlinear output exists
    NL_HEAD=""
    for suffix in +orig.HEAD +tlrc.HEAD; do
        [[ -f "$OUTPUT_DIR/dt_nonlinear${suffix}" ]] && NL_HEAD="$OUTPUT_DIR/dt_nonlinear${suffix}" && break
    done
    for ext in .nii.gz .nii; do
        [[ -n "$NL_HEAD" ]] && break
        [[ -f "$OUTPUT_DIR/dt_nonlinear${ext}" ]] && NL_HEAD="$OUTPUT_DIR/dt_nonlinear${ext}" && break
    done
    if [[ -n "$NL_HEAD" ]]; then
        check_file_nonempty "$NL_HEAD" "nonlinear_tensor" "$RESULTS_FILE" || PASS=false
    fi
else
    echo -e "${RED}FAIL: $TOOL_NAME nonlinear execution${NC}" | tee -a "$RESULTS_FILE"
    PASS=false
fi

scan_log_for_errors "$RESULTS_FILE" "$TOOL_NAME"

# Summary
echo "" | tee -a "$RESULTS_FILE"
if $PASS; then
    echo -e "${GREEN}=== $TOOL_NAME: ALL TESTS PASSED ===${NC}" | tee -a "$RESULTS_FILE"
else
    echo -e "${RED}=== $TOOL_NAME: SOME TESTS FAILED ===${NC}" | tee -a "$RESULTS_FILE"
fi
