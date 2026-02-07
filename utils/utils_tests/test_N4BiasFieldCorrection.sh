#!/usr/bin/env bash
# Test: ANTs N4BiasFieldCorrection (correct intensity inhomogeneity/bias field)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="N4BiasFieldCorrection"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_ants_data
make_template "$CWL" "$TOOL"

# ── Test 1: Default correction ───────────────────────────────
cat > "${JOB_DIR}/${TOOL}_default.yml" <<EOF
input_image:
  class: File
  path: ${T1_RES}
output_prefix: n4_default
dimensionality: 3
EOF
run_tool "${TOOL}_default" "${JOB_DIR}/${TOOL}_default.yml" "$CWL"

# ── Test 2: With mask and shrink factor ──────────────────────
cat > "${JOB_DIR}/${TOOL}_masked.yml" <<EOF
input_image:
  class: File
  path: ${T1_RES}
output_prefix: n4_masked
dimensionality: 3
mask_image:
  class: File
  path: ${ANTS_MASK}
shrink_factor: 4
EOF
run_tool "${TOOL}_masked" "${JOB_DIR}/${TOOL}_masked.yml" "$CWL"

# ── Test 3: With convergence params ──────────────────────────
cat > "${JOB_DIR}/${TOOL}_converge.yml" <<EOF
input_image:
  class: File
  path: ${T1_RES}
output_prefix: n4_converge
dimensionality: 3
shrink_factor: 4
convergence: "[50x50,0.001]"
EOF
run_tool "${TOOL}_converge" "${JOB_DIR}/${TOOL}_converge.yml" "$CWL"

# ── Non-null & header checks ─────────────────────────────────
for t in default masked converge; do
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
