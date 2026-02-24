#!/usr/bin/env bash
# Test: FSL fslmerge (merge 3D images into 4D along time/spatial axes)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="fslmerge"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fsl_data
make_template "$CWL" "$TOOL"

# ── Test 1: Time merge (3 copies → 4D with 3 volumes) ────────
cat > "${JOB_DIR}/${TOOL}_time.yml" <<EOF
dimension: t
output: fslmerge_time_out
input_files:
  - class: File
    path: ${T1W}
  - class: File
    path: ${T1W}
  - class: File
    path: ${T1W}
EOF
run_tool "${TOOL}_time" "${JOB_DIR}/${TOOL}_time.yml" "$CWL"

# ── Test 2: Z merge (two images along z) ─────────────────────
cat > "${JOB_DIR}/${TOOL}_z.yml" <<EOF
dimension: z
output: fslmerge_z_out
input_files:
  - class: File
    path: ${T1W}
  - class: File
    path: ${T1W}
EOF
run_tool "${TOOL}_z" "${JOB_DIR}/${TOOL}_z.yml" "$CWL"

# ── Non-null & header checks ─────────────────────────────────
for t in time z; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  for f in "$dir"/*.nii*; do
    [[ -f "$f" ]] || continue
    if [[ ! -s "$f" ]]; then
      echo "  WARN: zero-byte output: $f"
    else
      echo "  Header (${t}): $(docker_fsl fslhd "$f" 2>&1 | grep -E '^dim[1-4]' || true)"
    fi
  done
  verify_log "${TOOL}_${t}"
done
