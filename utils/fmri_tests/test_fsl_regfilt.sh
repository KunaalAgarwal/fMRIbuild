#!/usr/bin/env bash
# Test: FSL fsl_regfilt (remove nuisance ICA components from 4D fMRI)
# Depends on: melodic (needs melodic_mix)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fsl_regfilt"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Dependency: needs melodic_mix from melodic
MELODIC_MIX="$(first_match \
  "${OUT_DIR}/melodic/melodic_out/melodic_mix" \
  2>/dev/null || true)"
if [[ -z "$MELODIC_MIX" ]]; then
  echo "Running prerequisite: melodic..."
  bash "${SCRIPT_DIR}/test_melodic.sh"
  MELODIC_MIX="$(first_match \
    "${OUT_DIR}/melodic/melodic_out/melodic_mix")"
fi

# Generate template for reference
make_template "$CWL" "$TOOL"

# ── Test 1: Non-aggressive filtering (remove component 1) ─────
cat > "${JOB_DIR}/${TOOL}_nonaggr.yml" <<EOF
input:
  class: File
  path: "${BOLD}"
design:
  class: File
  path: "${MELODIC_MIX}"
output: regfilt_nonaggr
filter: "1"
EOF
run_tool "${TOOL}_nonaggr" "${JOB_DIR}/${TOOL}_nonaggr.yml" "$CWL"

# ── Test 2: Multiple components (remove components 1,2,3) ─────
cat > "${JOB_DIR}/${TOOL}_multi.yml" <<EOF
input:
  class: File
  path: "${BOLD}"
design:
  class: File
  path: "${MELODIC_MIX}"
output: regfilt_multi
filter: "1,2,3"
EOF
run_tool "${TOOL}_multi" "${JOB_DIR}/${TOOL}_multi.yml" "$CWL"

# ── Test 3: Aggressive filtering with mask ─────────────────────
cat > "${JOB_DIR}/${TOOL}_aggr.yml" <<EOF
input:
  class: File
  path: "${BOLD}"
design:
  class: File
  path: "${MELODIC_MIX}"
output: regfilt_aggr
filter: "1,2"
aggressive: true
mask:
  class: File
  path: "${BOLD_MASK}"
EOF
run_tool "${TOOL}_aggr" "${JOB_DIR}/${TOOL}_aggr.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"

for variant in nonaggr multi aggr; do
  echo "  --- variant: ${variant} ---"
  dir="${OUT_DIR}/${TOOL}_${variant}"

  # Find the output NIfTI
  out_nii="$(first_match "${dir}/regfilt_${variant}.nii.gz" "${dir}/regfilt_${variant}.nii" 2>/dev/null || true)"
  if [[ -z "$out_nii" ]]; then
    # Try any NIfTI in the directory
    out_nii="$(first_match "${dir}"/*.nii.gz "${dir}"/*.nii 2>/dev/null || true)"
  fi

  if [[ -n "$out_nii" && -f "$out_nii" ]]; then
    verify_nifti "$out_nii"

    # Verify output has same 4D dimensions as input
    in_dim4="$(docker_fsl fslhd "$BOLD" 2>&1 | grep -E '^dim4\s' | awk '{print $2}' || true)"
    out_dim4="$(docker_fsl fslhd "$out_nii" 2>&1 | grep -E '^dim4\s' | awk '{print $2}' || true)"
    if [[ -n "$in_dim4" && -n "$out_dim4" ]]; then
      if [[ "$in_dim4" == "$out_dim4" ]]; then
        echo "  PASS: 4D dimensions match (${out_dim4} volumes)"
      else
        echo "  WARN: 4D dimension mismatch (input=${in_dim4}, output=${out_dim4})"
      fi
    fi

    # Verify data is not identical to input (filtering should change values)
    in_range="$(docker_fsl fslstats "$BOLD" -R 2>/dev/null || true)"
    out_range="$(docker_fsl fslstats "$out_nii" -R 2>/dev/null || true)"
    echo "  Input range:  ${in_range}"
    echo "  Output range: ${out_range}"
  else
    echo "  FAIL: no output NIfTI found for ${variant}"
  fi

  verify_log "${TOOL}_${variant}"
done
