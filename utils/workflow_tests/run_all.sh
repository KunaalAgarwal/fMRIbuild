#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Workflow Generation Tests ==="
echo "Date: $(date)"
echo ""

bash "${SCRIPT_DIR}/test_workflow_generation.sh" "$@"
