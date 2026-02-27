#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

PASS=0
FAIL=0

echo -e "fixture\tstatus" > "$SUMMARY_FILE"

# Phase 1: Generate CWL workflows from fixtures
echo "── Phase 1: Generating CWL workflows from fixtures ──"

# Bundle with esbuild first (src/*.js use ESM syntax but package has no "type": "module")
BUNDLED="${SCRIPT_DIR}/_bundled.mjs"
echo "  Bundling generate_workflows.mjs with esbuild..."
if ! npx esbuild "${SCRIPT_DIR}/generate_workflows.mjs" \
    --bundle --platform=node --format=esm \
    --outfile="$BUNDLED" \
    --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);" \
    --log-level=warning 2>&1; then
  die "esbuild bundling failed"
fi

if ! node "$BUNDLED"; then
  die "Fixture generation failed"
fi
echo ""

# Phase 2: Validate each generated CWL
echo "── Phase 2: Validating generated CWL workflows ──"
for cwl_file in "${GENERATED_DIR}"/*.cwl; do
  [[ -f "$cwl_file" ]] || continue
  name="$(basename "$cwl_file" .cwl)"
  if validate_workflow "$cwl_file" "$name"; then
    echo -e "${name}\tPASS" >> "$SUMMARY_FILE"
    PASS=$((PASS + 1))
  else
    echo -e "${name}\tFAIL" >> "$SUMMARY_FILE"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "── Summary ──"
echo "  PASS: ${PASS}"
echo "  FAIL: ${FAIL}"

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo "=== SOME TESTS FAILED ==="
  exit 1
else
  echo ""
  echo "=== ALL TESTS PASSED ==="
fi
