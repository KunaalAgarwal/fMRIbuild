#!/usr/bin/env bash
# Test: dcm2niix (convert DICOM to NIfTI with BIDS sidecars)
# Creates synthetic DICOM data using nibabel + numpy for testing.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="dcm2niix"
LIB="dcm2niix"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Create synthetic DICOM test data via AFNI's 3dAFNItoNIFTI → dcm2niix approach
# Actually, the most reliable method: use FSL to create a small NIfTI, then use
# the dcm2niix Docker to confirm CWL plumbing works. We'll use a different strategy:
# create DICOMs by running mri_convert (if available) or use a Python DICOM writer.
DICOM_DIR="${DERIVED_DIR}/dcm2niix_dicom"
rm -rf "$DICOM_DIR" 2>/dev/null || true
mkdir -p "$DICOM_DIR"

echo "Creating synthetic DICOM data..."
python3 - "$T1W_2MM" "$DICOM_DIR" <<'PY'
import sys, os, struct
import nibabel as nib
import numpy as np

nifti_path, dcm_dir = sys.argv[1], sys.argv[2]
img = nib.load(nifti_path)
data = img.get_fdata()
affine = img.affine
zooms = img.header.get_zooms()

rows, cols = data.shape[0], data.shape[1]
n_slices = min(5, data.shape[2])
mid = data.shape[2] // 2
start = mid - n_slices // 2

for idx in range(n_slices):
    sl = start + idx
    slc_data = data[:, :, sl].astype(np.int16)

    # Build DICOM with explicit VR little-endian
    buf = bytearray()

    # 128-byte preamble + DICM
    buf += b'\x00' * 128 + b'DICM'

    def add_explicit(group, elem, vr, val_bytes):
        buf.extend(struct.pack('<HH', group, elem))
        buf.extend(vr.encode('ascii'))
        if vr in ('OB', 'OW', 'OF', 'SQ', 'UC', 'UN', 'UR', 'UT'):
            buf.extend(b'\x00\x00')
            buf.extend(struct.pack('<I', len(val_bytes)))
        else:
            buf.extend(struct.pack('<H', len(val_bytes)))
        buf.extend(val_bytes)

    def add_str(g, e, vr, s):
        b = s.encode('ascii')
        if len(b) % 2: b += b'\x20'
        add_explicit(g, e, vr, b)

    def add_us(g, e, val):
        add_explicit(g, e, 'US', struct.pack('<H', val))

    # File Meta Information
    add_explicit(0x0002, 0x0001, 'OB', b'\x00\x01')  # File Meta Info Version
    add_str(0x0002, 0x0002, 'UI', '1.2.840.10008.5.1.4.1.1.4')  # Media Storage SOP Class
    add_str(0x0002, 0x0003, 'UI', f'1.2.3.4.5.6.{idx}')  # Media Storage SOP Instance
    add_str(0x0002, 0x0010, 'UI', '1.2.840.10008.1.2.1')  # Transfer Syntax (Explicit VR LE)
    add_str(0x0002, 0x0012, 'UI', '1.2.3.99')  # Implementation Class UID

    # SOP Class / Instance
    add_str(0x0008, 0x0016, 'UI', '1.2.840.10008.5.1.4.1.1.4')  # MR Image Storage
    add_str(0x0008, 0x0018, 'UI', f'1.2.3.4.5.6.{idx}')  # SOP Instance UID
    add_str(0x0008, 0x0020, 'DA', '20260101')  # Study Date
    add_str(0x0008, 0x0030, 'TM', '120000')  # Study Time
    add_str(0x0008, 0x0060, 'CS', 'MR')  # Modality
    add_str(0x0008, 0x0070, 'LO', 'TestManufacturer')  # Manufacturer
    add_str(0x0008, 0x103E, 'LO', 'T1_MPRAGE')  # Series Description

    add_str(0x0010, 0x0010, 'PN', 'Test^Patient')  # Patient Name
    add_str(0x0010, 0x0020, 'LO', 'TEST001')  # Patient ID

    add_str(0x0018, 0x0050, 'DS', f'{zooms[2]:.4f}')  # Slice Thickness
    add_str(0x0018, 0x0080, 'DS', '2000')  # Repetition Time
    add_str(0x0018, 0x0081, 'DS', '3.5')  # Echo Time
    add_str(0x0018, 0x0087, 'DS', '3')  # Magnetic Field Strength
    add_str(0x0018, 0x1030, 'LO', 'T1_MPRAGE')  # Protocol Name

    add_str(0x0020, 0x000D, 'UI', '1.2.3.4.5.100')  # Study Instance UID
    add_str(0x0020, 0x000E, 'UI', '1.2.3.4.5.200')  # Series Instance UID
    add_str(0x0020, 0x0011, 'IS', '1')  # Series Number
    add_str(0x0020, 0x0013, 'IS', str(idx + 1))  # Instance Number

    # Image Position Patient (origin + slice offset)
    pos_z = float(affine[2, 3]) + sl * float(zooms[2])
    add_str(0x0020, 0x0032, 'DS', f'{affine[0,3]:.4f}\\{affine[1,3]:.4f}\\{pos_z:.4f}')
    # Image Orientation Patient
    add_str(0x0020, 0x0037, 'DS', '1\\0\\0\\0\\1\\0')

    add_us(0x0028, 0x0002, 1)  # Samples Per Pixel
    add_str(0x0028, 0x0004, 'CS', 'MONOCHROME2')  # Photometric Interpretation
    add_us(0x0028, 0x0010, rows)  # Rows
    add_us(0x0028, 0x0011, cols)  # Columns
    add_str(0x0028, 0x0030, 'DS', f'{zooms[0]:.4f}\\{zooms[1]:.4f}')  # Pixel Spacing
    add_us(0x0028, 0x0100, 16)  # Bits Allocated
    add_us(0x0028, 0x0101, 16)  # Bits Stored
    add_us(0x0028, 0x0102, 15)  # High Bit
    add_us(0x0028, 0x0103, 1)   # Pixel Representation (signed)

    # Pixel Data
    add_explicit(0x7FE0, 0x0010, 'OW', slc_data.tobytes())

    with open(os.path.join(dcm_dir, f'IM{idx:04d}.dcm'), 'wb') as f:
        f.write(bytes(buf))

print(f'Created {n_slices} DICOM slices ({rows}x{cols})')
PY

# ── Test 1: Basic conversion with BIDS sidecar ───────────────
cat > "${JOB_DIR}/${TOOL}_basic.yml" <<EOF
input_dir:
  class: Directory
  path: ${DICOM_DIR}
compress: "y"
bids: "y"
filename: "test_%p_%s"
EOF
run_tool "${TOOL}_basic" "${JOB_DIR}/${TOOL}_basic.yml" "$CWL"

# ── Test 2: No compression ───────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_nocompress.yml" <<EOF
input_dir:
  class: Directory
  path: ${DICOM_DIR}
compress: "n"
bids: "y"
filename: "test_nocomp_%s"
EOF
run_tool "${TOOL}_nocompress" "${JOB_DIR}/${TOOL}_nocompress.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"

for variant in basic nocompress; do
  echo "  --- variant: ${variant} ---"
  dir="${OUT_DIR}/${TOOL}_${variant}"

  # Check for NIfTI files
  nifti_count=0
  for f in "${dir}"/*.nii.gz "${dir}"/*.nii; do
    [[ -f "$f" ]] || continue
    nifti_count=$((nifti_count + 1))
    verify_nifti "$f"
  done
  echo "  NIfTI files produced: ${nifti_count}"

  # Check for JSON sidecars
  json_count=0
  for f in "${dir}"/*.json; do
    [[ -f "$f" ]] || continue
    [[ "$(basename "$f")" == "outputs.json" ]] && continue
    json_count=$((json_count + 1))
    verify_file "$f"
    if python3 -c "import json; json.load(open('$f'))" 2>/dev/null; then
      echo "  PASS: valid JSON sidecar: $(basename "$f")"
    else
      echo "  WARN: invalid JSON: $(basename "$f")"
    fi
  done
  echo "  JSON sidecars produced: ${json_count}"

  # bval/bvec optional (structural won't have them)
  for ext in bval bvec; do
    bfile="$(first_match "${dir}"/*.${ext} 2>/dev/null || true)"
    if [[ -n "$bfile" && -f "$bfile" ]]; then
      verify_file "$bfile"
    else
      echo "  OPTIONAL-SKIP: no .${ext} files (expected for structural)"
    fi
  done

  verify_log "${TOOL}_${variant}"
done
