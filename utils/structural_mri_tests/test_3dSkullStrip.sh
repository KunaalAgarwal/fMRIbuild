#!/usr/bin/env bash
# Test: AFNI 3dSkullStrip (Skull Stripping)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dSkullStrip"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${T1W}"
prefix: "ss_out"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# 3dSkullStrip may produce +orig or +tlrc depending on input space
found=0
for head in "${TOOL_OUT}"/ss_out+*.HEAD; do
  [[ -f "$head" ]] || continue
  verify_afni "$head"
  found=1
done
if (( found == 0 )); then
  echo "  FAIL: no ss_out+{orig,tlrc}.HEAD found"; exit 1
fi
verify_log "$TOOL"
