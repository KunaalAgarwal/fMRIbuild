#!/usr/bin/env bash
# Test: FSL siena (Longitudinal Brain Atrophy Estimation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="siena"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data

# Siena needs two timepoint T1 images. Use synthetic variants
# so the two timepoints are genuinely different files.
SIENA_T1A="${DERIVED_DIR}/siena_t1a.nii.gz"
SIENA_T1B="${DERIVED_DIR}/siena_t1b.nii.gz"
if [[ ! -f "$SIENA_T1A" || ! -f "$SIENA_T1B" ]]; then
  echo "Creating synthetic siena timepoint images..."
  python3 - "$T1W_2MM" "$SIENA_T1A" "$SIENA_T1B" <<'PY'
import sys
import numpy as np
try:
    import nibabel as nib
    img = nib.load(sys.argv[1])
    data = img.get_fdata(dtype=np.float32)
    # Timepoint A: original
    nib.save(nib.Nifti1Image(data, img.affine, img.header), sys.argv[2])
    # Timepoint B: slight intensity perturbation (simulates atrophy)
    rng = np.random.default_rng(42)
    noise = rng.normal(1.0, 0.02, data.shape).astype(np.float32)
    nib.save(nib.Nifti1Image(data * noise, img.affine, img.header), sys.argv[3])
    print("  Created siena_t1a and siena_t1b")
except ImportError:
    print("  nibabel not available, copying T1 as fallback")
    import shutil
    shutil.copy(sys.argv[1], sys.argv[2])
    shutil.copy(sys.argv[1], sys.argv[3])
PY
fi

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input1:
  class: File
  path: "${SIENA_T1A}"
input2:
  class: File
  path: "${SIENA_T1B}"
output_dir: "siena_out"
ventricle_analysis: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# siena produces an output directory
SIENA_DIR="${TOOL_OUT}/siena_out"
if [[ ! -d "$SIENA_DIR" ]]; then
  SIENA_DIR="$(find "${TOOL_OUT}" -maxdepth 1 -type d ! -name "${TOOL}" 2>/dev/null | head -1 || true)"
fi

if [[ -z "$SIENA_DIR" || ! -d "$SIENA_DIR" ]]; then
  echo "  FAIL: no siena output directory found"
else
  echo "  Siena directory: ${SIENA_DIR}"
  # Required: main report
  verify_file "${SIENA_DIR}/report.siena"

  # Optional: ventricle analysis report (ventricle_analysis=true)
  verify_file_optional "${SIENA_DIR}/report.sienax"

  # Verify NIfTI outputs (brain extractions, masks, PVE, edge, flow)
  for nii in "${SIENA_DIR}"/*.nii*; do
    [[ -f "$nii" ]] || continue
    bn="$(basename "$nii")"
    if [[ ! -s "$nii" ]]; then
      echo "  FAIL: zero-byte: ${bn}"
      continue
    fi
    dims="$(docker_fsl fslhd "$nii" 2>&1 | grep -E '^dim[1-4]' || true)"
    range="$(docker_fsl fslstats "$nii" -R 2>/dev/null || true)"
    echo "  Header (${bn}): ${dims}"
    echo "  Range  (${bn}): ${range}"
  done

  # Optional: edge point files (from ventricle analysis)
  edge_count=0
  for edge in "${SIENA_DIR}"/*_edge*.nii*; do
    [[ -f "$edge" ]] || continue
    edge_count=$((edge_count + 1))
  done
  echo "  Edge point files: ${edge_count}"

  # Optional: flow images
  flow_count=0
  for flow in "${SIENA_DIR}"/*_flow*.nii*; do
    [[ -f "$flow" ]] || continue
    flow_count=$((flow_count + 1))
  done
  echo "  Flow image files: ${flow_count}"
fi

verify_log "$TOOL"
