#!/usr/bin/env bash
# Test: FSL fsl_anat (Automated Anatomical Pipeline)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fsl_anat"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML (reduced runtime flags)
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

# Find the .anat directory
ANAT_DIR="$(find "${TOOL_OUT}" -maxdepth 1 -name '*.anat' -type d 2>/dev/null | head -1 || true)"
if [[ -z "$ANAT_DIR" || ! -d "$ANAT_DIR" ]]; then
  echo "  FAIL: no .anat directory found"
else
  echo "  .anat directory: ${ANAT_DIR}"
  # With all --no* flags only T1.nii.gz is guaranteed
  for expected in "T1.nii.gz"; do
    f="${ANAT_DIR}/${expected}"
    if [[ ! -f "$f" ]]; then
      echo "  MISSING: ${expected}"
    elif [[ ! -s "$f" ]]; then
      echo "  FAIL: zero-byte: ${expected}"
    else
      echo "  FOUND: ${expected}"
    fi
  done

  for nii in "${ANAT_DIR}/T1.nii.gz"; do
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
