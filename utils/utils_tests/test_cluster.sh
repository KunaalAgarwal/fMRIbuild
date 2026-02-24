#!/usr/bin/env bash
# Test: FSL cluster (find clusters in statistical images above threshold)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="cluster"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Test 1: Basic clustering ─────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_basic.yml" <<EOF
input:
  class: File
  path: ${T1W}
threshold: 3000.0
EOF
run_tool "${TOOL}_basic" "${JOB_DIR}/${TOOL}_basic.yml" "$CWL"

# ── Test 2: With cluster index output + mm coordinates ───────
cat > "${JOB_DIR}/${TOOL}_index.yml" <<EOF
input:
  class: File
  path: ${T1W}
threshold: 3000.0
oindex: cluster_index
mm: true
EOF
run_tool "${TOOL}_index" "${JOB_DIR}/${TOOL}_index.yml" "$CWL"

# ── Verify ────────────────────────────────────────────────────
for t in basic index; do
  table="${OUT_DIR}/${TOOL}_${t}/cluster_table.txt"
  if [[ -f "$table" && -s "$table" ]]; then
    echo "  ${t}: cluster table has $(wc -l < "$table") lines"
  else
    echo "  WARN: ${t} cluster table missing or empty"
  fi
done
# Check index image if produced
for f in "${OUT_DIR}/${TOOL}_index"/*.nii*; do
  [[ -f "$f" ]] || continue
  if [[ ! -s "$f" ]]; then
    echo "  WARN: zero-byte index image: $f"
  else
    echo "  Index header: $(docker_fsl fslhd "$f" 2>&1 | grep -E '^dim[1-4]' || true)"
  fi
done
for t in basic index; do
  verify_log "${TOOL}_${t}"
done
