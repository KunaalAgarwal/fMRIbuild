#!/usr/bin/env bash
# Test: AFNI align_epi_anat (EPI-to-Anatomical Alignment)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="align_epi_anat"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

CWLTOOL_ARGS+=(--disable-pull)
CWLTOOL_ARGS+=(--preserve-environment AFNI_OUTPUT_TYPE)

prepare_afni_fmri_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
epi:
  class: File
  path: "${BOLD_CLIP_RES}"
anat:
  class: File
  path: "${T1_RES}"
epi_base: "0"
epi2anat: true
volreg: "off"
tshift: "off"
anat_has_skull: "no"
epi_strip: "None"
deoblique: "off"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# align_epi_anat produces outputs named from the input basenames
# with epi2anat: aligned EPI gets _al suffix, plus a .aff12.1D matrix
found_al=0
for f in "${TOOL_OUT}"/*_al+orig.HEAD "${TOOL_OUT}"/*_al.nii*; do
  [[ -f "$f" ]] || continue
  verify_afni "$f"
  found_al=1
  break
done
if [[ "$found_al" -eq 0 ]]; then
  echo "  WARN: no aligned output (*_al) found"
fi

verify_file_optional "${TOOL_OUT}"/*_al_mat.aff12.1D
verify_log "$TOOL"
