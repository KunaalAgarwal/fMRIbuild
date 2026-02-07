#!/usr/bin/env bash
# Shared infrastructure for ASL CWL test scripts.
# Source this file at the top of every test_*.sh script.

set -uo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[1]:-${BASH_SOURCE[0]}}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

CWL_DIR="${ROOT_DIR}/public/cwl"
JOB_DIR="${SCRIPT_DIR}/jobs"
OUT_DIR="${SCRIPT_DIR}/out"
LOG_DIR="${SCRIPT_DIR}/logs"
DATA_DIR="${SCRIPT_DIR}/data"
DERIVED_DIR="${SCRIPT_DIR}/derived"
SUMMARY_FILE="${SCRIPT_DIR}/summary.tsv"

# Docker images
FSL_IMAGE="${FSL_DOCKER_IMAGE:-brainlife/fsl:latest}"

DOCKER_PLATFORM="${DOCKER_PLATFORM:-}"

CWLTOOL_BIN="${CWLTOOL_BIN:-cwltool}"
CWLTOOL_ARGS=()
RERUN_PASSED=0

for arg in "$@"; do
  case "$arg" in
    --rerun-passed|--rerun-all) RERUN_PASSED=1 ;;
  esac
done

# ── Utility functions ──────────────────────────────────────────────

die() { echo "ERROR: $1" >&2; exit 1; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    die "Missing required command: $1"
  fi
}

first_match() {
  local pattern
  for pattern in "$@"; do
    for f in $pattern; do
      echo "$f"
      return 0
    done
  done
  return 1
}

find_one() {
  local root="$1" pattern="$2"
  if [[ "$pattern" == */* ]]; then
    find "$root" -type f -path "*$pattern" | head -n1
  else
    find "$root" -type f -name "$pattern" | head -n1
  fi
}

setup_dirs() {
  mkdir -p "$JOB_DIR" "$OUT_DIR" "$LOG_DIR" "$DATA_DIR" "$DERIVED_DIR"
}

# ── Docker helpers ─────────────────────────────────────────────────

_docker_run() {
  local image="$1"; shift
  if [[ -n "$DOCKER_PLATFORM" ]]; then
    docker run --rm --platform "$DOCKER_PLATFORM" \
      -v "$ROOT_DIR":"$ROOT_DIR" -v "$SCRIPT_DIR":"$SCRIPT_DIR" \
      -w "$ROOT_DIR" "$image" "$@"
  else
    docker run --rm \
      -v "$ROOT_DIR":"$ROOT_DIR" -v "$SCRIPT_DIR":"$SCRIPT_DIR" \
      -w "$ROOT_DIR" "$image" "$@"
  fi
}

docker_fsl() { _docker_run "$FSL_IMAGE" "$@"; }

copy_from_fsl_image() {
  local src_rel="$1" dest="$2"
  docker_fsl /bin/sh -c "
    for d in \"\${FSLDIR:-}\" /usr/local/fsl /usr/share/fsl /opt/fsl; do
      if [ -n \"\$d\" ] && [ -f \"\$d/${src_rel}\" ]; then
        cp \"\$d/${src_rel}\" \"${dest}\"
        exit 0
      fi
    done
    exit 1
  "
}

# ── CWL template generation ───────────────────────────────────────

make_template() {
  local cwl_file="$1" tool_name="$2"
  local tmpl="${JOB_DIR}/${tool_name}_template.yml"
  "$CWLTOOL_BIN" --make-template "$cwl_file" > "$tmpl" 2>/dev/null || true
}

# ── Verification & run ─────────────────────────────────────────────

verify_outputs() {
  local outputs_json="$1"
  python3 - "$outputs_json" <<'PY'
import json, os, sys
from urllib.parse import urlparse

with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)

paths = []
def add_path(p):
    if not p: return
    if p.startswith("file://"): p = urlparse(p).path
    paths.append(p)

def walk(obj):
    if obj is None: return
    if isinstance(obj, dict):
        if obj.get("class") in ("File", "Directory"):
            add_path(obj.get("path") or obj.get("location"))
        else:
            for v in obj.values(): walk(v)
    elif isinstance(obj, list):
        for v in obj: walk(v)

walk(data)
paths = [p for p in paths if p]
if not paths:
    print("no outputs found"); sys.exit(2)
missing = [p for p in paths if not os.path.exists(p)]
if missing:
    print("missing outputs:", ", ".join(missing)); sys.exit(3)
print("ok")
PY
}

verify_files_nonempty() {
  local out_dir="$1"
  shift
  local patterns=("$@")
  python3 - "$out_dir" "${patterns[@]}" <<'PY'
import sys, os, glob

out_dir = sys.argv[1]
patterns = sys.argv[2:]
ok = True
for pattern in patterns:
    full_pattern = os.path.join(out_dir, pattern)
    matches = glob.glob(full_pattern, recursive=True)
    if not matches:
        print(f"FAIL: no files match {pattern}")
        ok = False
        continue
    for path in matches:
        size = os.path.getsize(path)
        if size == 0:
            print(f"FAIL: {os.path.basename(path)} is empty (0 bytes)")
            ok = False
        else:
            print(f"OK: {os.path.basename(path)} ({size} bytes)")

sys.exit(0 if ok else 1)
PY
}

verify_nifti_headers() {
  local out_dir="$1"
  shift
  local patterns=("$@")
  python3 - "$out_dir" "${patterns[@]}" <<'PY'
import sys, os, glob

out_dir = sys.argv[1]
patterns = sys.argv[2:]

try:
    import nibabel as nib
except ImportError:
    print("WARNING: nibabel not installed, skipping header check")
    sys.exit(0)

ok = True
for pattern in patterns:
    full_pattern = os.path.join(out_dir, pattern)
    matches = glob.glob(full_pattern, recursive=True)
    if not matches:
        print(f"WARN: no files match {pattern}")
        continue
    for path in matches:
        try:
            img = nib.load(path)
            hdr = img.header
            dims = img.shape
            print(f"OK: {os.path.basename(path)} shape={dims} dtype={hdr.get_data_dtype()}")
        except Exception as e:
            print(f"FAIL: {os.path.basename(path)}: {e}")
            ok = False

sys.exit(0 if ok else 1)
PY
}

RUN_TOOL_STATUS=0

run_tool() {
  local name="$1" job_file="$2" cwl_file="$3"
  local tool_out_dir="${OUT_DIR}/${name}"
  local log_file="${LOG_DIR}/${name}.log"
  local out_json="${tool_out_dir}/outputs.json"
  local status="FAIL"

  mkdir -p "$tool_out_dir"

  echo "── ${name} ──────────────────────────────────"
  echo "  CWL:  ${cwl_file}"
  echo "  Job:  ${job_file}"

  # Validate
  if ! "$CWLTOOL_BIN" --validate "$cwl_file" >>"$log_file" 2>&1; then
    echo "  Result: FAIL (CWL validation failed)"
    RUN_TOOL_STATUS=1
    echo -e "${name}\tFAIL" >>"$SUMMARY_FILE"
    return 0
  fi

  # Execute
  if "$CWLTOOL_BIN" "${CWLTOOL_ARGS[@]}" --outdir "$tool_out_dir" "$cwl_file" "$job_file" \
      >"$out_json" 2>"$log_file"; then
    if verify_outputs "$out_json" >>"$log_file" 2>&1; then
      status="PASS"
    fi
  fi

  if [[ "$status" == "PASS" ]]; then
    RUN_TOOL_STATUS=0
    echo "  Result: PASS"
  else
    RUN_TOOL_STATUS=1
    echo "  Result: FAIL (see ${log_file})"
  fi
  echo -e "${name}\t${status}" >>"$SUMMARY_FILE"
  return 0
}

# ── ASL data preparation ──────────────────────────────────────────

prepare_asl_data() {
  local t1="${DATA_DIR}/MNI152_T1_2mm.nii.gz"
  local t1_brain="${DATA_DIR}/MNI152_T1_2mm_brain.nii.gz"

  # Copy MNI152 2mm from FSL container
  if [[ ! -f "$t1" ]]; then
    echo "Copying MNI152_T1_2mm from FSL container..."
    copy_from_fsl_image "data/standard/MNI152_T1_2mm.nii.gz" "$t1" || true
  fi
  if [[ ! -f "$t1_brain" ]]; then
    copy_from_fsl_image "data/standard/MNI152_T1_2mm_brain.nii.gz" "$t1_brain" || true
  fi

  # Synthetic ASL data paths
  local control_vol="${DERIVED_DIR}/asl_control.nii.gz"
  local tag_vol="${DERIVED_DIR}/asl_tag.nii.gz"
  local asl_4d="${DATA_DIR}/asl_synthetic.nii.gz"
  local m0_calib="${DATA_DIR}/m0_calib.nii.gz"
  local asl_diff="${DERIVED_DIR}/asl_diff.nii.gz"
  local brain_mask="${DERIVED_DIR}/brain_mask.nii.gz"

  # Create control volume (scaled brain)
  if [[ ! -f "$control_vol" ]]; then
    echo "Creating synthetic control volume..."
    docker_fsl fslmaths "$t1_brain" -mul 1.0 "$control_vol" >/dev/null 2>&1 || true
  fi

  # Create tag volume (slightly reduced signal, simulating ASL labeling)
  if [[ ! -f "$tag_vol" ]]; then
    echo "Creating synthetic tag volume..."
    docker_fsl fslmaths "$t1_brain" -mul 0.95 "$tag_vol" >/dev/null 2>&1 || true
  fi

  # Merge into 4D: tag, control, tag, control (minimum 4 volumes)
  if [[ ! -f "$asl_4d" ]]; then
    echo "Creating synthetic 4D ASL volume..."
    docker_fsl fslmerge -t "$asl_4d" "$tag_vol" "$control_vol" "$tag_vol" "$control_vol" >/dev/null 2>&1 || true
  fi

  # M0 calibration = the brain volume itself
  if [[ ! -f "$m0_calib" ]]; then
    echo "Creating M0 calibration image..."
    cp "$t1_brain" "$m0_calib"
  fi

  # Difference image for BASIL (control - tag)
  if [[ ! -f "$asl_diff" ]]; then
    echo "Creating ASL difference image..."
    docker_fsl fslmaths "$control_vol" -sub "$tag_vol" "$asl_diff" >/dev/null 2>&1 || true
  fi

  # Brain mask
  if [[ ! -f "$brain_mask" ]]; then
    echo "Creating brain mask..."
    docker_fsl fslmaths "$t1_brain" -bin "$brain_mask" >/dev/null 2>&1 || true
  fi

  # Export paths for scripts
  ASL_4D="$asl_4d"
  M0_CALIB="$m0_calib"
  ASL_DIFF="$asl_diff"
  T1W_STRUCTURAL="$t1"
  T1W_BRAIN="$t1_brain"
  BRAIN_MASK="$brain_mask"
}

# ── Initialization ─────────────────────────────────────────────────

# Resolve cwltool
if ! command -v "$CWLTOOL_BIN" >/dev/null 2>&1; then
  if [[ -x "${HOME}/miniconda3/bin/cwltool" ]]; then
    CWLTOOL_BIN="${HOME}/miniconda3/bin/cwltool"
  fi
fi

require_cmd "$CWLTOOL_BIN"
require_cmd docker
require_cmd python3

setup_dirs
