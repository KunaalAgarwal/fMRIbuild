#!/usr/bin/env bash
# Test: FSL basil (Bayesian Inference for Arterial Spin Labeling)
# Runs 3 parameter sets: pCASL minimal, pCASL with spatial+mask, PASL mode
# Uses ASL difference data (control - tag) as input
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="basil"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_asl_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# ── Parameter Set A: Minimal pCASL ────────────────────────────────

cat > "${JOB_DIR}/${TOOL}_pcasl.yml" <<EOF
input:
  class: File
  path: "${ASL_DIFF}"
output_dir: "basil_pcasl"
casl: true
tis: "3.6"
bolus: 1.8
EOF

run_tool "${TOOL}_pcasl" "${JOB_DIR}/${TOOL}_pcasl.yml" "$CWL"

# ── Parameter Set B: pCASL with spatial regularisation + mask ─────

cat > "${JOB_DIR}/${TOOL}_spatial.yml" <<EOF
input:
  class: File
  path: "${ASL_DIFF}"
output_dir: "basil_spatial"
casl: true
tis: "3.6"
bolus: 1.8
bat: 1.3
mask:
  class: File
  path: "${BRAIN_MASK}"
spatial: true
EOF

run_tool "${TOOL}_spatial" "${JOB_DIR}/${TOOL}_spatial.yml" "$CWL"

# ── Parameter Set C: PASL mode ────────────────────────────────────

cat > "${JOB_DIR}/${TOOL}_pasl.yml" <<EOF
input:
  class: File
  path: "${ASL_DIFF}"
output_dir: "basil_pasl"
pasl: true
tis: "1.8"
bolus: 0.7
bat: 0.7
EOF

run_tool "${TOOL}_pasl" "${JOB_DIR}/${TOOL}_pasl.yml" "$CWL"

# ── Output validation ─────────────────────────────────────────────

for variant in pcasl spatial pasl; do
  tool_out="${OUT_DIR}/${TOOL}_${variant}"
  if [[ -d "$tool_out" ]]; then
    echo ""
    echo "Validating ${TOOL}_${variant} outputs..."

    # Check files exist and are non-empty
    verify_files_nonempty "$tool_out" \
      "basil_${variant}/mean_ftiss.nii.gz" \
      "basil.log" \
      || echo "  WARN: some files missing or empty for ${variant}"

    # Check NIfTI headers are readable
    verify_nifti_headers "$tool_out" \
      "basil_${variant}/mean_ftiss.nii.gz" \
      || echo "  WARN: NIfTI header check failed for ${variant}"
  fi
done
