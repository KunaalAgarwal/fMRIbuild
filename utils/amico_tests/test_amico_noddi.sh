#!/usr/bin/env bash
# Test: AMICO NODDI (Neurite Orientation Dispersion and Density Imaging)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="amico_noddi"
LIB="amico"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

setup_dirs
prepare_amico_data

make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
dwi:
  class: File
  path: ${AMICO_DWI}
bvals:
  class: File
  path: ${AMICO_BVALS}
bvecs:
  class: File
  path: ${AMICO_BVECS}
mask:
  class: File
  path: ${AMICO_MASK}
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ─────────────────────────────────────────────
# AMICO output naming uses 'x' separator: NODDIFITxICVF.nii.gz
dir="${OUT_DIR}/${TOOL}"
expected_patterns=("NODDI*ICVF.nii.gz" "NODDI*OD.nii.gz" "NODDI*ISOVF.nii.gz")

for pattern in "${expected_patterns[@]}"; do
  found_file=""
  for candidate in "${dir}"/${pattern} "${dir}"/output/${pattern}; do
    if [[ -f "$candidate" ]]; then
      found_file="$candidate"
      break
    fi
  done

  if [[ -n "$found_file" ]]; then
    if [[ ! -s "$found_file" ]]; then
      echo "  FAIL: zero-byte output: $found_file"; exit 1
    fi
    echo "  OK: $(basename "$found_file") ($(wc -c < "$found_file") bytes)"
  else
    echo "  WARN: ${pattern} not found"
  fi
done
verify_log "$TOOL"
