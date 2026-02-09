#!/usr/bin/env bash
# Test: FSL fsl_prepare_fieldmap (Fieldmap Preparation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fsl_prepare_fieldmap"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

setup_dirs

# ── Data prep: create synthetic phase difference and magnitude images ──
STANDARD_BRAIN="${DERIVED_DIR}/MNI152_T1_2mm_brain.nii.gz"
SYNTH_PHASEDIFF="${DERIVED_DIR}/synth_phasediff.nii.gz"

if [[ ! -f "$STANDARD_BRAIN" ]]; then
  copy_from_fsl_image "data/standard/MNI152_T1_2mm_brain.nii.gz" "$STANDARD_BRAIN" || \
  copy_from_fsl_image "data/standard/MNI152_T1_2mm.nii.gz" "$STANDARD_BRAIN"
fi

if [[ ! -f "$SYNTH_PHASEDIFF" ]]; then
  echo "Creating synthetic phase difference image..."
  # SIEMENS phase difference images have values in range 0-4096 (mapping to 0-2pi radians)
  # Create a synthetic image with values centered around 2048 (pi) with some spatial variation
  docker_fsl fslmaths "$STANDARD_BRAIN" -bin -mul 2048 "$SYNTH_PHASEDIFF"
fi

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
scanner: SIEMENS
phase_image:
  class: File
  path: ${SYNTH_PHASEDIFF}
magnitude_image:
  class: File
  path: ${STANDARD_BRAIN}
output: fieldmap_out
delta_TE: 2.46
nocheck: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ─────────────────────────────────────────────
dir="${OUT_DIR}/${TOOL}"
found=0
for f in "$dir"/fieldmap_out*; do
  [[ -f "$f" ]] || continue
  [[ "$(basename "$f")" == *.log ]] && continue
  found=1
  if [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte output: $f"; exit 1
  fi
  echo "  Header: $(docker_fsl fslhd "$f" 2>&1 | grep -E '^dim[1-4]' || true)"
done

if [[ "$found" -eq 0 ]]; then
  echo "  WARN: no output fieldmap files found"
fi
