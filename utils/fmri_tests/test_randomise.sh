#!/usr/bin/env bash
# Test: FSL randomise (Permutation Testing)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="randomise"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Dependency: needs merged 4D from fslmerge
MERGED_4D="$(first_match "${OUT_DIR}/fslmerge/bold_merge.nii.gz" "${OUT_DIR}/fslmerge/bold_merge.nii" 2>/dev/null || true)"
if [[ -z "$MERGED_4D" ]]; then
  echo "Running prerequisite: fslmerge..."
  bash "${SCRIPT_DIR}/test_fslmerge.sh"
  MERGED_4D="$(first_match "${OUT_DIR}/fslmerge/bold_merge.nii.gz" "${OUT_DIR}/fslmerge/bold_merge.nii")"
fi

# Create design matrix and contrast (2 volumes = 2 points)
GROUP_POINTS=2
GROUP_DESIGN="${DERIVED_DIR}/group.mat"
GROUP_CON="${DERIVED_DIR}/group.con"
make_design_mat "$GROUP_DESIGN" "$GROUP_POINTS" 1
make_contrast "$GROUP_CON" 1

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${MERGED_4D}"
output: "randomise_out"
design_mat:
  class: File
  path: "${GROUP_DESIGN}"
tcon:
  class: File
  path: "${GROUP_CON}"
num_perm: 10
EOF

if [[ -n "${BOLD_MASK:-}" && -f "$BOLD_MASK" ]]; then
  cat >> "${JOB_DIR}/${TOOL}.yml" <<EOF
mask:
  class: File
  path: "${BOLD_MASK}"
EOF
fi

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
