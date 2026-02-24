#!/usr/bin/env bash
# Test: AFNI 3dNwarpApply (Apply Nonlinear Warp)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dNwarpApply"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_templates

make_template "$CWL" "$TOOL"

# 3dNwarpApply depends on 3dQwarp output
QWARP_WARP="$(first_match \
  "${OUT_DIR}/3dQwarp/qwarp_out_WARP.nii"* \
  "${OUT_DIR}/3dQwarp/qwarp_out_WARP+"*.HEAD \
  "${OUT_DIR}/3dQwarp/qwarp_out_WARP+"*.BRIK* \
  || true)"

if [[ -z "$QWARP_WARP" ]]; then
  echo "3dQwarp output not found; running 3dQwarp first..."
  bash "${SCRIPT_DIR}/test_3dQwarp.sh"
  QWARP_WARP="$(first_match \
    "${OUT_DIR}/3dQwarp/qwarp_out_WARP.nii"* \
    "${OUT_DIR}/3dQwarp/qwarp_out_WARP+"*.HEAD \
    "${OUT_DIR}/3dQwarp/qwarp_out_WARP+"*.BRIK* \
    )" || die "3dQwarp warp output not found after running prerequisite"
fi

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
nwarp:
  class: File
  path: "${QWARP_WARP}"
source:
  class: File
  path: "${T1_RES}"
prefix: "nwarp_apply"
interp: linear
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

found_nwa=0
for f in "${TOOL_OUT}"/nwarp_apply+*.HEAD "${TOOL_OUT}"/nwarp_apply.nii*; do
  [[ -f "$f" ]] || continue
  verify_afni "$f"
  found_nwa=1
  break
done
if [[ "$found_nwa" -eq 0 ]]; then
  echo "  WARN: no warped output found"
fi
verify_log "$TOOL"
