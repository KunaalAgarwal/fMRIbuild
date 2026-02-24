#!/usr/bin/env bash
# Test: FSL fsl_anat (Comprehensive Anatomical Processing Pipeline)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fsl_anat"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML — skip most processing steps for speed
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${T1W}"
output_dir: "fsl_anat_out"
noreorient: true
nocrop: true
nobias: true
noreg: true
nononlinreg: true
noseg: true
nosubcortseg: true
nocleanup: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# fsl_anat produces a .anat directory
ANAT_DIR=""
for d in "${TOOL_OUT}"/*.anat "${TOOL_OUT}"/fsl_anat_out.anat; do
  [[ -d "$d" ]] && ANAT_DIR="$d" && break
done
if [[ -n "$ANAT_DIR" ]]; then
  verify_directory "$ANAT_DIR"
else
  echo "  WARN: no .anat output directory found"
fi
verify_log "$TOOL"
