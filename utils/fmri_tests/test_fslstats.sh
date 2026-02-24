#!/usr/bin/env bash
# Test: FSL fslstats (Image Statistics)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="fslstats"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${T1W}"
mean: true
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ────────────────────────────────────────────────
echo "── Verifying ${TOOL} outputs ──"
TOOL_OUT="${OUT_DIR}/${TOOL}"

# fslstats captures statistics to stdout → stats_output file
STATS_OUT="$(find "${TOOL_OUT}" -name 'fslstats_output.txt' -o -name '*.txt' 2>/dev/null | head -1 || true)"
if [[ -n "$STATS_OUT" && -f "$STATS_OUT" ]]; then
  if [[ ! -s "$STATS_OUT" ]]; then
    echo "  FAIL: zero-byte stats output"
  else
    echo "  FOUND: $(basename "$STATS_OUT") ($(wc -l < "$STATS_OUT") lines)"
    echo "  Content: $(head -1 "$STATS_OUT")"
  fi
else
  echo "  INFO: no text output file found (stats may be in stdout log)"
fi

LOG_FILE="${LOG_DIR}/${TOOL}.log"
if [[ -f "$LOG_FILE" ]]; then
  if grep -qiE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" 2>/dev/null; then
    echo "  WARN: potential errors in log:"
    grep -iE 'error|exception|segfault|core dump|fatal' "$LOG_FILE" | head -5
  else
    echo "  Log: no errors detected"
  fi
fi
