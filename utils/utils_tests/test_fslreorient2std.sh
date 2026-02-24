#!/usr/bin/env bash
# Test: FSL fslreorient2std (reorient image to standard MNI orientation)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="fslreorient2std"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Test 1: Default reorientation ─────────────────────────────
cat > "${JOB_DIR}/${TOOL}_default.yml" <<EOF
input:
  class: File
  path: ${T1W}
output: reorient_out
EOF
run_tool "${TOOL}_default" "${JOB_DIR}/${TOOL}_default.yml" "$CWL"

# ── Non-null & header check ───────────────────────────────────
dir="${OUT_DIR}/${TOOL}_default"
for f in "$dir"/*.nii*; do
  [[ -f "$f" ]] || continue
  if [[ ! -s "$f" ]]; then
    echo "  WARN: zero-byte output: $f"
  else
    echo "  Header: $(docker_fsl fslhd "$f" 2>&1 | grep -E '^(dim[1-4]|sform_[xyz]orient)' || true)"
  fi
done
verify_log "${TOOL}_default"
