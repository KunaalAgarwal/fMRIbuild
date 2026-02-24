#!/usr/bin/env bash
# Test: FSL cluster (Cluster-based Thresholding)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="cluster"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Try to find randomise tstat output first, fall back to fslmaths output
CLUSTER_INPUT="$(first_match \
  "${OUT_DIR}/randomise/randomise_out_tstat1.nii.gz" \
  "${OUT_DIR}/randomise/randomise_out_tstat1.nii" \
  2>/dev/null || true)"

if [[ -z "$CLUSTER_INPUT" ]]; then
  # Fall back to fslmaths constant image
  CLUSTER_INPUT="$(first_match \
    "${OUT_DIR}/fslmaths/fslmaths_const.nii.gz" \
    "${OUT_DIR}/fslmaths/fslmaths_const.nii" \
    2>/dev/null || true)"
fi

if [[ -z "$CLUSTER_INPUT" ]]; then
  echo "Running prerequisite: fslmaths..."
  bash "${SCRIPT_DIR}/test_fslmaths.sh"
  CLUSTER_INPUT="$(first_match \
    "${OUT_DIR}/fslmaths/fslmaths_const.nii.gz" \
    "${OUT_DIR}/fslmaths/fslmaths_const.nii")"
fi

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${CLUSTER_INPUT}"
threshold: 1.0
oindex: "cluster_index"
othresh: "cluster_thresh"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

for expected in "cluster_index.nii.gz" "cluster_thresh.nii.gz"; do
  f="${TOOL_OUT}/${expected}"
  if [[ ! -f "$f" ]]; then
    echo "  MISSING: ${expected}"
  elif [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte: ${expected}"
  else
    echo "  FOUND: ${expected}"
  fi
done

# Check for cluster table (text output)
CLUSTER_TABLE="$(find "${TOOL_OUT}" -name 'cluster_table*' -o -name '*.txt' 2>/dev/null | head -1 || true)"
if [[ -n "$CLUSTER_TABLE" && -f "$CLUSTER_TABLE" && -s "$CLUSTER_TABLE" ]]; then
  echo "  FOUND: $(basename "$CLUSTER_TABLE") ($(wc -l < "$CLUSTER_TABLE") lines)"
fi

for nii in "${TOOL_OUT}/cluster_index.nii.gz" "${TOOL_OUT}/cluster_thresh.nii.gz"; do
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
