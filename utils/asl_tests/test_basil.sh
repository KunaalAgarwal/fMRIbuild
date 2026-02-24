#!/usr/bin/env bash
# Test: FSL basil (Bayesian Inference for Arterial Spin Labeling)
# Runs 3 parameter sets: pCASL minimal, pCASL with spatial, pASL mode (default)
# Uses ASL difference data (control - tag) as input
# Model parameters are passed via FABBER options files (-@)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="basil"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_asl_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# ── Create FABBER options files ────────────────────────────────────

OPTS_PCASL="${JOB_DIR}/basil_pcasl_opts.txt"
cat > "$OPTS_PCASL" <<'OPTS'
--casl
--ti1=3.6
--tau=1.8
OPTS

OPTS_SPATIAL="${JOB_DIR}/basil_spatial_opts.txt"
cat > "$OPTS_SPATIAL" <<'OPTS'
--casl
--ti1=3.6
--tau=1.8
--bat=1.3
OPTS

OPTS_PASL="${JOB_DIR}/basil_pasl_opts.txt"
cat > "$OPTS_PASL" <<'OPTS'
--ti1=1.8
--tau=0.7
--bat=0.7
OPTS

# ── Parameter Set A: Minimal pCASL ────────────────────────────────

cat > "${JOB_DIR}/${TOOL}_pcasl.yml" <<EOF
input:
  class: File
  path: "${ASL_DIFF}"
output_dir: "basil_pcasl"
mask:
  class: File
  path: "${BRAIN_MASK}"
options_file:
  class: File
  path: "${OPTS_PCASL}"
EOF

run_tool "${TOOL}_pcasl" "${JOB_DIR}/${TOOL}_pcasl.yml" "$CWL"

# ── Parameter Set B: pCASL with spatial regularisation ────────────

cat > "${JOB_DIR}/${TOOL}_spatial.yml" <<EOF
input:
  class: File
  path: "${ASL_DIFF}"
output_dir: "basil_spatial"
mask:
  class: File
  path: "${BRAIN_MASK}"
options_file:
  class: File
  path: "${OPTS_SPATIAL}"
spatial: true
EOF

run_tool "${TOOL}_spatial" "${JOB_DIR}/${TOOL}_spatial.yml" "$CWL"

# ── Parameter Set C: pASL mode (default, no --casl in opts) ───────

cat > "${JOB_DIR}/${TOOL}_pasl.yml" <<EOF
input:
  class: File
  path: "${ASL_DIFF}"
output_dir: "basil_pasl"
mask:
  class: File
  path: "${BRAIN_MASK}"
options_file:
  class: File
  path: "${OPTS_PASL}"
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
      "basil.log" \
      || echo "  WARN: some files missing or empty for ${variant}"

    # Check for perfusion map in step subdirectories
    perfusion_file="$(find "$tool_out" -name 'mean_ftiss.nii.gz' -print -quit 2>/dev/null || true)"
    if [[ -n "$perfusion_file" ]]; then
      echo "  OK: mean_ftiss.nii.gz found at ${perfusion_file}"
      verify_nifti_headers "$(dirname "$perfusion_file")" \
        "mean_ftiss.nii.gz" \
        || echo "  WARN: NIfTI header check failed for ${variant}"
    else
      echo "  WARN: mean_ftiss.nii.gz not found for ${variant}"
    fi

    LOG_FILE="${LOG_DIR}/${TOOL}_${variant}.log"
    if [[ -f "$LOG_FILE" ]]; then
      if grep -qiE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" 2>/dev/null; then
        echo "  WARN: potential errors in ${variant} log:"
        grep -iE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" | head -5
      else
        echo "  Log (${variant}): no errors detected"
      fi
    fi
  fi
done
