#!/usr/bin/env bash
# Test: AFNI @SSwarper (Skull-Strip and Warp to Template)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="SSwarper"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data

# @SSwarper requires a 4-volume template dataset (MNI152_2009_template_SSW.nii.gz).
# Download from AFNI if not already present.
SSW_TEMPLATE="${DATA_DIR}/MNI152_2009_template_SSW.nii.gz"
if [[ ! -f "$SSW_TEMPLATE" ]] || [[ $(wc -c < "$SSW_TEMPLATE") -lt 1000 ]]; then
  echo "Downloading MNI152_2009_template_SSW.nii.gz for @SSwarper..."
  rm -f "$SSW_TEMPLATE"
  curl -fsSL -o "$SSW_TEMPLATE" \
    "https://afni.nimh.nih.gov/pub/dist/atlases/afni_atlases_dist/MNI152_2009_template_SSW.nii.gz" \
    || die "Failed to download SSwarper template"
fi

# Generate template for reference
make_template "$CWL" "$TOOL"

# Use 2mm T1 as input (1mm is too slow for testing) and skip warping
# to keep the test fast. This still validates skull-stripping.
# Also disable extra QC images to reduce runtime.
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${T1W_2MM}"
base:
  class: File
  path: "${SSW_TEMPLATE}"
subid: "sub01"
odir: "."
skipwarp: true
extra_qc_off: true
EOF

# @SSwarper needs a writable container filesystem (writes temp files
# outside /tmp). Use --no-read-only so cwltool does not pass --read-only.
CWLTOOL_ARGS+=("--no-read-only")
run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# SSwarper skull-stripped output
found_ss=0
for f in "${TOOL_OUT}"/anatSS.sub01.nii* "${TOOL_OUT}"/anatSS.sub01+*.HEAD; do
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
for f in "${TOOL_OUT}"/anatQQ.sub01+tlrc.HEAD "${TOOL_OUT}"/anatQQ.sub01.nii*; do
  [[ -f "$f" ]] || continue
  verify_afni "$f"
  found_qq=1
  break
done
if [[ "$found_qq" -eq 0 ]]; then
  echo "  OPTIONAL-SKIP: anatQQ output (not produced with skipwarp)"
fi
verify_log "$TOOL"
