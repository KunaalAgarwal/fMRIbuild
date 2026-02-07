#!/usr/bin/env bash
# Test: AFNI 3dUndump (create dataset from coordinate text file)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../structural_mri_tests/_common.sh"

TOOL="3dUndump"
LIB="afni"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_afni_data
make_template "$CWL" "$TOOL"

# ── Prepare: create synthetic coordinate file ─────────────────
COORD_FILE="${DERIVED_DIR}/test_coords.txt"
if [[ ! -f "$COORD_FILE" ]]; then
  cat > "$COORD_FILE" <<COORDS
45 54 45 1.0
50 60 50 2.0
30 40 30 1.5
60 70 60 3.0
COORDS
fi

# ── Test 1: With master grid ─────────────────────────────────
cat > "${JOB_DIR}/${TOOL}_master.yml" <<EOF
input:
  class: File
  path: ${COORD_FILE}
prefix: undump_master
master:
  class: File
  path: ${T1W}
datum: float
srad: 3.0
EOF
run_tool "${TOOL}_master" "${JOB_DIR}/${TOOL}_master.yml" "$CWL"

# ── Test 2: With explicit dimensions ───────────────────────
cat > "${JOB_DIR}/${TOOL}_dimen.yml" <<EOF
input:
  class: File
  path: ${COORD_FILE}
prefix: undump_dimen
dimen: "91 109 91"
datum: float
srad: 3.0
xyz: true
EOF
run_tool "${TOOL}_dimen" "${JOB_DIR}/${TOOL}_dimen.yml" "$CWL"

# ── Verify ────────────────────────────────────────────────────
for t in master dimen; do
  dir="${OUT_DIR}/${TOOL}_${t}"
  for f in "$dir"/*.HEAD; do
    [[ -f "$f" ]] || continue
    if [[ ! -s "$f" ]]; then
      echo "  WARN: zero-byte: $f"
    else
      echo "  Header (${t}): $(docker_afni 3dinfo "$f" 2>&1 | head -3 || true)"
    fi
  done
done
