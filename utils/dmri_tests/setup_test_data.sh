#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/test_data"

echo "=== Setting up dMRI test data ==="

# Check Python3
if ! command -v python3 &>/dev/null; then
    echo "ERROR: python3 not found"
    exit 1
fi

# Check nibabel
if ! python3 -c "import nibabel" 2>/dev/null; then
    echo "Installing nibabel..."
    pip3 install nibabel
fi

# Generate synthetic data
mkdir -p "$DATA_DIR"
python3 "$SCRIPT_DIR/generate_test_data.py" "$DATA_DIR"

# Convert DWI to MIF with embedded gradients (for MRtrix3 tools)
echo ""
echo "--- Converting DWI to MIF format ---"
if command -v docker &>/dev/null; then
    docker run --rm \
        -v "$DATA_DIR:/data" \
        mrtrix3/mrtrix3:latest \
        mrconvert /data/dwi.nii.gz /data/dwi.mif \
        -fslgrad /data/dwi.bvec /data/dwi.bval \
        -force
    echo "Created dwi.mif with embedded gradients"
else
    echo "WARNING: docker not found, skipping MIF conversion (MRtrix3 tests may fail)"
fi

echo ""
echo "=== Test data setup complete ==="
echo "Data directory: $DATA_DIR"
ls -la "$DATA_DIR"
