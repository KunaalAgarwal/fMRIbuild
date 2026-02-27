#!/usr/bin/env bash
# Run cwltool validation on generated CWL files (executed inside WSL)
set -uo pipefail

export PATH="/home/kunaal/.local/bin:$PATH"

PROJ_DIR="/mnt/c/Users/kuna8/personal_projects/niBuild"
GEN_DIR="${PROJ_DIR}/utils/workflow_tests/generated"
LOG_DIR="${PROJ_DIR}/utils/workflow_tests/logs"

mkdir -p "$LOG_DIR"

PASS=0
FAIL=0

for f in "${GEN_DIR}"/*.cwl; do
  [ -f "$f" ] || continue
  name="$(basename "$f" .cwl)"
  log_file="${LOG_DIR}/${name}_validate.log"
  if cwltool --validate "$f" > "$log_file" 2>&1; then
    echo "  PASS: ${name}"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: ${name}"
    tail -5 "$log_file" | sed 's/^/    /'
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "Summary: PASS=${PASS} FAIL=${FAIL}"
[ "$FAIL" -eq 0 ]
