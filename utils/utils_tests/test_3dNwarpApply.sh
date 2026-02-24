#!/usr/bin/env bash
# Test: AFNI 3dNwarpApply (apply nonlinear warp to dataset)
# Phase 3: requires precomputed AFNI warp
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="3dNwarpApply"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data
make_template "$CWL" "$TOOL"

# ── Prepare: generate warp via 3dQwarp (very coarse) ─────────
source "${SCRIPT_DIR}/_common_utils.sh"
generate_qwarp_warp

# ── Test 1: Apply warp ───────────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_default.yml" <<EOF
nwarp:
  class: File
  path: ${QWARP_WARP}
source:
  class: File
  path: ${T1W_2MM}
prefix: nwarpapply_out
EOF
run_tool "${TOOL}_default" "${JOB_DIR}/${TOOL}_default.yml" "$CWL"

# ── Verify ────────────────────────────────────────────────────
dir="${OUT_DIR}/${TOOL}_default"
for f in "$dir"/*.HEAD "$dir"/*.nii*; do
  [[ -f "$f" ]] || continue
  if [[ ! -s "$f" ]]; then
    echo "  WARN: zero-byte: $f"
  else
    echo "  Header: $(docker_afni 3dinfo "$f" 2>&1 | head -3 || true)"
  fi
done
verify_log "${TOOL}_default"
