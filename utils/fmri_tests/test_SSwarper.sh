#!/usr/bin/env bash
# Test: AFNI SSwarper (Skull-Stripping and Warping)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="SSwarper"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_templates

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${T1_RES}"
base:
  class: File
  path: "${SSW_TEMPLATE_MULTI}"
subid: "sub016"
odir: "."
minp: 5
warpscale: 0.2
unifize_off: true
aniso_off: true
ceil_off: true
init_skullstr_off: true
extra_qc_off: true
skipwarp: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# SSwarper skull-stripped output
found_ss=0
for f in "${TOOL_OUT}"/anatSS.sub016.nii* "${TOOL_OUT}"/anatSS.sub016+*.HEAD; do
  [[ -f "$f" ]] || continue
  verify_afni "$f"
  found_ss=1
  break
done
if [[ "$found_ss" -eq 0 ]]; then
  echo "  WARN: no skull-stripped output (anatSS) found"
fi

# SSwarper warped output (may not exist with skipwarp)
found_qq=0
for f in "${TOOL_OUT}"/anatQQ.sub016+tlrc.HEAD "${TOOL_OUT}"/anatQQ.sub016.nii*; do
  [[ -f "$f" ]] || continue
  verify_afni "$f"
  found_qq=1
  break
done
if [[ "$found_qq" -eq 0 ]]; then
  echo "  OPTIONAL-SKIP: anatQQ output (not produced with skipwarp)"
fi
verify_log "$TOOL"
