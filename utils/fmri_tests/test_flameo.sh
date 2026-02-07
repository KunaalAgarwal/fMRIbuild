#!/usr/bin/env bash
# Test: FSL flameo (FMRIB's Local Analysis of Mixed Effects)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="flameo"
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

# Determine mask: prefer BOLD_MASK, fall back to BET mask
USE_MASK="${BOLD_MASK:-}"
if [[ -z "$USE_MASK" || ! -f "$USE_MASK" ]]; then
  BET_MASK="$(first_match "${OUT_DIR}/bet/bet_out_mask.nii.gz" "${OUT_DIR}/bet/bet_out_mask.nii" 2>/dev/null || true)"
  if [[ -z "$BET_MASK" ]]; then
    echo "Running prerequisite: bet..."
    bash "${SCRIPT_DIR}/test_bet.sh"
    BET_MASK="$(first_match "${OUT_DIR}/bet/bet_out_mask.nii.gz" "${OUT_DIR}/bet/bet_out_mask.nii")"
  fi
  USE_MASK="$BET_MASK"
fi

# Create design matrix, contrast, and group file (2 volumes = 2 points)
GROUP_POINTS=2
GROUP_DESIGN="${DERIVED_DIR}/group.mat"
GROUP_CON="${DERIVED_DIR}/group.con"
FLAMEO_COVSPLIT="${DERIVED_DIR}/flameo.covsplit"
make_design_mat "$GROUP_DESIGN" "$GROUP_POINTS" 1
make_contrast "$GROUP_CON" 1
make_group_file "$FLAMEO_COVSPLIT" "$GROUP_POINTS"

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
cope_file:
  class: File
  path: "${MERGED_4D}"
mask_file:
  class: File
  path: "${USE_MASK}"
design_file:
  class: File
  path: "${GROUP_DESIGN}"
t_con_file:
  class: File
  path: "${GROUP_CON}"
cov_split_file:
  class: File
  path: "${FLAMEO_COVSPLIT}"
run_mode: ols
log_dir: "flameo_stats"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
