#!/usr/bin/env bash
# Common utilities for dMRI CWL tool testing

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CWL_DIR="$PROJECT_ROOT/public/cwl"
DATA_DIR="$SCRIPT_DIR/test_data"
OUTPUT_BASE="$SCRIPT_DIR/outputs"
INTERMEDIATE_DIR="$OUTPUT_BASE/intermediates"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_prerequisites() {
    local missing=0
    for cmd in cwltool docker python3; do
        if ! command -v "$cmd" &>/dev/null; then
            echo -e "${RED}ERROR: $cmd not found${NC}"
            missing=1
        fi
    done
    if [[ $missing -eq 1 ]]; then
        echo "Install missing prerequisites before running tests."
        exit 1
    fi
}

validate_cwl() {
    local cwl_file="$1"
    local result_file="$2"
    echo "--- CWL Validation ---" | tee -a "$result_file"
    if cwltool --validate "$cwl_file" 2>&1 | tee -a "$result_file"; then
        echo -e "${GREEN}PASS: CWL validation${NC}" | tee -a "$result_file"
        return 0
    else
        echo -e "${RED}FAIL: CWL validation${NC}" | tee -a "$result_file"
        return 1
    fi
}

check_file_exists() {
    local file="$1"
    local label="$2"
    local result_file="$3"
    if [[ -e "$file" ]]; then
        echo -e "${GREEN}PASS: $label exists${NC}" | tee -a "$result_file"
        return 0
    else
        echo -e "${RED}FAIL: $label does not exist ($file)${NC}" | tee -a "$result_file"
        return 1
    fi
}

check_file_nonempty() {
    local file="$1"
    local label="$2"
    local result_file="$3"
    if [[ -s "$file" ]]; then
        local size
        size=$(wc -c < "$file" 2>/dev/null || echo "unknown")
        echo -e "${GREEN}PASS: $label is non-empty ($size bytes)${NC}" | tee -a "$result_file"
        return 0
    else
        echo -e "${RED}FAIL: $label is empty or missing${NC}" | tee -a "$result_file"
        return 1
    fi
}

check_nifti_header() {
    local file="$1"
    local label="$2"
    local result_file="$3"
    echo "Checking NIfTI header for $label..." | tee -a "$result_file"
    if python3 -c "
import nibabel as nib
img = nib.load('$file')
hdr = img.header
print(f'  Shape: {img.shape}')
print(f'  Voxel sizes: {hdr.get_zooms()}')
print(f'  Data type: {hdr.get_data_dtype()}')
" 2>&1 | tee -a "$result_file"; then
        echo -e "${GREEN}PASS: $label header readable${NC}" | tee -a "$result_file"
        return 0
    else
        echo -e "${RED}FAIL: $label header unreadable${NC}" | tee -a "$result_file"
        return 1
    fi
}

check_mif_header() {
    local file="$1"
    local label="$2"
    local result_file="$3"
    echo "Checking MIF header for $label..." | tee -a "$result_file"
    if docker run --rm -v "$(dirname "$file"):/data" mrtrix3/mrtrix3:latest \
        mrinfo "/data/$(basename "$file")" 2>&1 | tee -a "$result_file"; then
        echo -e "${GREEN}PASS: $label header readable${NC}" | tee -a "$result_file"
        return 0
    else
        echo -e "${RED}FAIL: $label header unreadable${NC}" | tee -a "$result_file"
        return 1
    fi
}

setup_output_dir() {
    local tool_name="$1"
    local output_dir="$OUTPUT_BASE/$tool_name"
    mkdir -p "$output_dir"
    echo "$output_dir"
}

check_test_data() {
    if [[ ! -d "$DATA_DIR" ]]; then
        echo -e "${RED}ERROR: Test data not found at $DATA_DIR${NC}"
        echo "Run setup_test_data.sh first."
        exit 1
    fi
}

ensure_intermediate() {
    mkdir -p "$INTERMEDIATE_DIR"
}
