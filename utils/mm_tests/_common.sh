#!/usr/bin/env bash
# Shared infrastructure for multimodal CWL test scripts.
# Sources the structural_mri_tests/_common.sh for core utilities,
# then overrides paths and adds multimodal-specific data preparation.

# Source core infrastructure (sets SCRIPT_DIR based on BASH_SOURCE[1],
# which will be this file's directory — mm_tests/)
PARENT_COMMON="$(cd "$(dirname "${BASH_SOURCE[0]}")/../structural_mri_tests" && pwd)/_common.sh"
if [[ ! -f "$PARENT_COMMON" ]]; then
  echo "ERROR: Cannot find ${PARENT_COMMON}" >&2
  exit 1
fi
source "$PARENT_COMMON"

# ANTs threading environment
CWLTOOL_ARGS+=(--preserve-environment ANTS_NUM_THREADS)
CWLTOOL_ARGS+=(--preserve-environment ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS)

# ── Multimodal data preparation ──────────────────────────────────

prepare_mm_data() {
  # Get MNI152 T1 templates from FSL container
  prepare_fsl_data

  # Try to get a T2 template from FSL (different cross-modal contrast)
  local t2_1mm="${DATA_DIR}/MNI152_T2_1mm.nii.gz"
  if [[ ! -f "$t2_1mm" ]]; then
    echo "  Copying MNI152 T2 from FSL container..."
    copy_from_fsl_image "data/standard/MNI152_T2_1mm.nii.gz" "$t2_1mm" 2>/dev/null || true
  fi
  if [[ ! -f "$t2_1mm" ]]; then
    copy_from_fsl_image "data/standard/avg152T2.nii.gz" "$t2_1mm" 2>/dev/null || true
  fi
  # Final fallback: use T1_2mm as cross-modal stand-in
  if [[ ! -f "$t2_1mm" ]]; then
    echo "  Warning: No T2 template found, using T1_2mm as cross-modal stand-in"
    cp "$T1W_2MM" "$t2_1mm"
  fi

  # Downsample to ${RES_MM}mm for fast execution
  local t1_res="${DERIVED_DIR}/mm_t1_${RES_MM}mm.nii.gz"
  local t2_res="${DERIVED_DIR}/mm_t2_${RES_MM}mm.nii.gz"
  local mask="${DERIVED_DIR}/mm_mask_${RES_MM}mm.nii.gz"

  if [[ ! -f "$t1_res" ]]; then
    echo "  Downsampling T1 to ${RES_MM}mm..."
    docker_ants ResampleImage 3 "$T1W" "$t1_res" "${RES_MM}x${RES_MM}x${RES_MM}" 0 0
  fi
  if [[ ! -f "$t2_res" ]]; then
    echo "  Downsampling T2 to ${RES_MM}mm..."
    docker_ants ResampleImage 3 "$t2_1mm" "$t2_res" "${RES_MM}x${RES_MM}x${RES_MM}" 0 0
  fi
  if [[ ! -f "$mask" ]]; then
    echo "  Creating brain mask..."
    docker_ants ThresholdImage 3 "$t1_res" "$mask" 0.01 100000 1 0
  fi

  # Export paths for test scripts
  MM_T1="$t1_res"
  MM_T2="$t2_res"
  MM_T1_2MM="$T1W_2MM"
  MM_MASK="$mask"
}

# ── Extra verification helpers ────────────────────────────────────

check_nonempty() {
  local file="$1" label="$2"
  if [[ -s "$file" ]]; then
    echo "    [OK] ${label} is non-empty ($(stat --printf='%s' "$file" 2>/dev/null || stat -f '%z' "$file") bytes)"
  else
    echo "    [FAIL] ${label} is empty or missing"
    return 1
  fi
}

check_nifti_header() {
  local file="$1" label="$2"
  if docker_ants PrintHeader "$file" 1 >/dev/null 2>&1; then
    echo "    [OK] ${label} has readable NIfTI header"
  else
    echo "    [FAIL] ${label} NIfTI header unreadable"
    return 1
  fi
}
