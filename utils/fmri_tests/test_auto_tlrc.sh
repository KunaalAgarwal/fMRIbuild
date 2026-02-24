#!/usr/bin/env bash
# Test: AFNI auto_tlrc (Automatic Talairach Transformation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="auto_tlrc"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_templates

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${AUTO_TLRC_INPUT}"
base:
  class: File
  path: "${AUTO_TLRC_BASE_RES}"
no_ss: true
maxite: 1
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# auto_tlrc produces +tlrc version of input
found_tlrc=0
for f in "${TOOL_OUT}"/*+tlrc.HEAD; do
  [[ -f "$f" ]] || continue
  verify_afni "$f"
  found_tlrc=1
  break
done
if [[ "$found_tlrc" -eq 0 ]]; then
  echo "  WARN: no +tlrc output found"
fi
verify_log "$TOOL"
