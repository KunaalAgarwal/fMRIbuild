#!/usr/bin/env bash
# Test: FSL fnirt (FMRIB's Non-linear Image Registration Tool)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fnirt"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Dependency: needs affine matrix from flirt
FLIRT_MAT="$(first_match "${OUT_DIR}/flirt/flirt_affine.mat" 2>/dev/null || true)"
if [[ -z "$FLIRT_MAT" ]]; then
  echo "Running prerequisite: flirt..."
  bash "${SCRIPT_DIR}/test_flirt.sh"
  FLIRT_MAT="$(first_match "${OUT_DIR}/flirt/flirt_affine.mat")"
fi

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${T1W}"
reference:
  class: File
  path: "${STANDARD_REF}"
cout: "fnirt_coeff"
iout: "fnirt_warped"
fout: "fnirt_field"
EOF

if [[ -n "$FLIRT_MAT" ]]; then
  cat >> "${JOB_DIR}/${TOOL}.yml" <<EOF
affine:
  class: File
  path: "${FLIRT_MAT}"
EOF
fi

if [[ -n "$STANDARD_MASK" && -f "$STANDARD_MASK" ]]; then
  cat >> "${JOB_DIR}/${TOOL}.yml" <<EOF
refmask:
  class: File
  path: "${STANDARD_MASK}"
EOF
fi

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

for expected in "fnirt_coeff.nii.gz" "fnirt_warped.nii.gz" "fnirt_field.nii.gz"; do
  f="${TOOL_OUT}/${expected}"
  if [[ ! -f "$f" ]]; then
    echo "  MISSING: ${expected}"
  elif [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte: ${expected}"
  else
    echo "  FOUND: ${expected}"
  fi
done

for nii in \
  "${TOOL_OUT}/fnirt_coeff.nii.gz" \
  "${TOOL_OUT}/fnirt_warped.nii.gz" \
  "${TOOL_OUT}/fnirt_field.nii.gz"; do
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

LOG_FILE="${LOG_DIR}/${TOOL}.log"
if [[ -f "$LOG_FILE" ]]; then
  if grep -qiE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" 2>/dev/null; then
    echo "  WARN: potential errors in log:"
    grep -iE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" | head -5
  else
    echo "  Log: no errors detected"
  fi
fi
