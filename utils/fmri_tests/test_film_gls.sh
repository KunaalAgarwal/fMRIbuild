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
results_dir: "film_gls_results"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
