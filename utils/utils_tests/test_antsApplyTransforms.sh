#!/usr/bin/env bash
# Test: ANTs antsApplyTransforms (apply precomputed transforms to an image)
# Phase 3: generates a quick affine transform as prerequisite
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="antsApplyTransforms"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_ants_data
make_template "$CWL" "$TOOL"

# ── Prepare: generate quick affine via antsRegistration ──────
ANTS_AFFINE="${DERIVED_DIR}/ants_quick_0GenericAffine.mat"
if [[ ! -f "$ANTS_AFFINE" ]]; then
  echo "Generating ANTs affine transform (rigid, minimal iterations)..."
  docker_ants antsRegistration \
    -d 3 \
    --output "${DERIVED_DIR}/ants_quick_" \
    --fixed-image "$T1_RES" \
    --moving-image "$T1_RES" \
    --metric "MI[$T1_RES,$T1_RES,1,32,Regular,0.25]" \
    --transform "Rigid[0.1]" \
    --convergence "[10,1e-6,5]" \
    --shrink-factors "1" \
    --smoothing-sigmas "0"
fi

# ── Test 1: Apply affine with Linear interpolation ───────────
cat > "${JOB_DIR}/${TOOL}_linear.yml" <<EOF
dimensionality: 3
input_image:
  class: File
  path: ${T1_RES}
reference_image:
  class: File
  path: ${T1_RES}
output_image: aat_linear_out.nii.gz
transforms:
  - class: File
    path: ${ANTS_AFFINE}
interpolation: Linear
EOF
run_tool "${TOOL}_linear" "${JOB_DIR}/${TOOL}_linear.yml" "$CWL"

# ── Test 2: Apply with NearestNeighbor (for labels) ──────────
cat > "${JOB_DIR}/${TOOL}_nn.yml" <<EOF
dimensionality: 3
input_image:
  class: File
  path: ${ANTS_SEGMENTATION}
reference_image:
  class: File
  path: ${T1_RES}
output_image: aat_nn_out.nii.gz
transforms:
  - class: File
    path: ${ANTS_AFFINE}
interpolation: NearestNeighbor
EOF
run_tool "${TOOL}_nn" "${JOB_DIR}/${TOOL}_nn.yml" "$CWL"

# ── Non-null & header checks ─────────────────────────────────
for t in linear nn; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  for f in "$dir"/*.nii*; do
    [[ -f "$f" ]] || continue
    if [[ ! -s "$f" ]]; then
      echo "  WARN: zero-byte: $f"
    else
      echo "  Header (${t}): $(docker_fsl fslhd "$f" 2>&1 | grep -E '^dim[1-4]' || true)"
    fi
  done
done
