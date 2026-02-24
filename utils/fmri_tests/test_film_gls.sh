#!/usr/bin/env bash
# Test: FSL film_gls (FMRIB's Improved Linear Model - General Least Squares)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="film_gls"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Get number of volumes in BOLD
N_VOLS="$(docker_fsl fslnvols "${BOLD}" 2>/dev/null | tr -d '[:space:]' || true)"
if [[ -z "$N_VOLS" ]]; then
  echo "ERROR: could not determine BOLD volume count"
  exit 1
fi

# Create design matrix
FILM_DESIGN="${DERIVED_DIR}/film_gls.mat"
make_design_mat "$FILM_DESIGN" "$N_VOLS" 1

# Create contrast file
FILM_CONTRAST="${DERIVED_DIR}/film_gls.con"
make_contrast "$FILM_CONTRAST" 1

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${BOLD}"
design_file:
  class: File
  path: "${FILM_DESIGN}"
contrast_file:
  class: File
  path: "${FILM_CONTRAST}"
results_dir: "film_gls_results"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# Check the results directory
RESULTS="${TOOL_OUT}/film_gls_results"
if [[ ! -d "$RESULTS" ]]; then
  echo "  FAIL: no results directory found"
else
  echo "  Results directory: ${RESULTS}"
  for expected in "pe1.nii.gz" "sigmasquareds.nii.gz" "dof"; do
    f="${RESULTS}/${expected}"
    if [[ ! -f "$f" ]]; then
      echo "  MISSING: ${expected}"
    elif [[ ! -s "$f" ]]; then
      echo "  FAIL: zero-byte: ${expected}"
    else
      echo "  FOUND: ${expected}"
    fi
  done

  for nii in "${RESULTS}"/pe*.nii* "${RESULTS}"/sigmasquareds.nii*; do
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
    if [[ "$range" == "0.000000 0.000000" ]]; then
      echo "  WARN: image appears to be all zeros: ${bn}"
    fi
  done

  # Verify contrast outputs (produced by --con flag)
  for prefix in cope1 varcope1 tstat1 zstat1; do
    f="${RESULTS}/${prefix}.nii.gz"
    if [[ ! -f "$f" ]]; then
      echo "  MISSING: ${prefix}.nii.gz"
    elif [[ ! -s "$f" ]]; then
      echo "  FAIL: zero-byte: ${prefix}.nii.gz"
    else
      echo "  FOUND: ${prefix}.nii.gz"
      dims="$(docker_fsl fslhd "$f" 2>&1 | grep -E '^dim[1-4]' || true)"
      range="$(docker_fsl fslstats "$f" -R 2>/dev/null || true)"
      echo "  Header (${prefix}): ${dims}"
      echo "  Range  (${prefix}): ${range}"
      if [[ "$range" == "0.000000 0.000000" ]]; then
        echo "  WARN: image appears to be all zeros: ${prefix}.nii.gz"
      fi
    fi
  done

  # Verify DOF file is numeric
  DOF_FILE="${RESULTS}/dof"
  if [[ -f "$DOF_FILE" && -s "$DOF_FILE" ]]; then
    echo "  DOF value: $(cat "$DOF_FILE")"
  fi
fi

LOG_FILE="${LOG_DIR}/${TOOL}.log"
if [[ -f "$LOG_FILE" ]]; then
  if grep -qiE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" 2>/dev/null; then
    echo "  WARN: potential errors in log:"
    grep -iE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" | head -5
  else
    echo "  Log: no errors detected"
  fi
fi
