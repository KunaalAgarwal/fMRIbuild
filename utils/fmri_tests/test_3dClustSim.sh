#!/usr/bin/env bash
# Test: AFNI 3dClustSim (Cluster-Size Threshold Simulation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="3dClustSim"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
prefix: "clustsim"
mask:
  class: File
  path: "${AFNI_BOLD_MASK}"
iter: 5
pthr: "0.05"
athr: "0.1"
quiet: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# ClustSim produces .NN*.1D and/or .NN*.niml text files
found_cs=0
for f in "${TOOL_OUT}"/clustsim.NN*.1D "${TOOL_OUT}"/clustsim.NN*.niml; do
  [[ -f "$f" ]] || continue
  verify_file "$f"
  found_cs=1
done
if [[ "$found_cs" -eq 0 ]]; then
  echo "  WARN: no ClustSim output tables found"
fi
verify_log "$TOOL"
