#!/usr/bin/env bash
# Test: AFNI 3dcopy (copy/convert a dataset)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="3dcopy"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data
make_template "$CWL" "$TOOL"

# ── Test 1: Simple copy ──────────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_default.yml" <<EOF
old_dataset:
  class: File
  path: ${T1W}
new_prefix: copy_out
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
