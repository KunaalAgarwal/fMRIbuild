#!/usr/bin/env bash
# Test 00: CWL validation only for antsIntermodalityIntrasubject
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="antsIntermodalityIntrasubject"
LIB="ants"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

echo "── ${TOOL} (validate) ──────────────────────────────────"
echo "  CWL: ${CWL}"

# Generate template for reference
make_template "$CWL" "$TOOL"

if "$CWLTOOL_BIN" --validate "$CWL" > "${LOG_DIR}/${TOOL}_validate.log" 2>&1; then
  echo "  Result: PASS (CWL is valid)"
  echo -e "${TOOL}_validate\tPASS" >> "$SUMMARY_FILE"
else
  echo "  Result: FAIL (CWL validation failed, see ${LOG_DIR}/${TOOL}_validate.log)"
  echo -e "${TOOL}_validate\tFAIL" >> "$SUMMARY_FILE"
  exit 1
fi
