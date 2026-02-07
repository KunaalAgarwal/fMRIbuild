#!/usr/bin/env bash
# Shared infrastructure for fMRI CWL test scripts.
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
AFNI_IMAGE="${AFNI_DOCKER_IMAGE:-brainlife/afni:latest}"
AFNI_TEST_IMAGE="${AFNI_TEST_IMAGE:-nibuild/afni-test:latest}"
ANTS_IMAGE="${ANTS_DOCKER_IMAGE:-fnndsc/ants:latest}"
FS_IMAGE="${FREESURFER_DOCKER_IMAGE:-freesurfer/freesurfer:7.4.1}"

DOCKER_PLATFORM="${DOCKER_PLATFORM:-}"

# AFNI tuning
RES_MM="${AFNI_TEST_RES_MM:-6}"
AFNI_OUTPUT_TYPE="${AFNI_OUTPUT_TYPE:-BRIK}"
AFNI_BOLD_CLIP_LEN="${AFNI_BOLD_CLIP_LEN:-20}"
AUTO_TLRC_RES_MM="${AFNI_AUTO_TLRC_RES_MM:-20}"
export AFNI_OUTPUT_TYPE

# ANTs tuning
ANTS_NUM_THREADS="${ANTS_NUM_THREADS:-1}"
ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS="${ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS:-1}"
export ANTS_NUM_THREADS ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS

# FreeSurfer license
LICENSE_FILE="${FS_LICENSE:-}"

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

docker_fsl()  { _docker_run "$FSL_IMAGE"  "$@"; }
docker_afni() { _docker_run "$AFNI_IMAGE" "$@"; }
docker_ants() {
  _docker_run "$ANTS_IMAGE" \
    env ANTS_NUM_THREADS="$ANTS_NUM_THREADS" \
    ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS="$ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS" \
    "$@"
}
docker_fs()   { _docker_run "$FS_IMAGE"   "$@"; }

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

copy_from_afni_image() {
  local src_rel="$1" dest="$2" image="${3:-$AFNI_IMAGE}"
  _docker_run "$image" /bin/sh -c "
    for d in \"\${AFNI_HOME:-}\" /opt/afni /usr/local/afni /usr/share/afni /usr/share/afni/atlases /usr/lib/afni; do
      if [ -n \"\$d\" ] && [ -f \"\$d/${src_rel}\" ]; then
        cp \"\$d/${src_rel}\" \"${dest}\"
        exit 0
      fi
    done
    exit 1
  "
}

copy_from_fs_image() {
  local src_rel="$1" dest="$2"
  docker_fs /bin/sh -c "
    for d in \"\${FREESURFER_HOME:-}\" /opt/freesurfer /usr/local/freesurfer /usr/share/freesurfer; do
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

# ── Design matrix helpers ──────────────────────────────────────────

make_design_mat() {
  local out_file="$1" num_points="$2" num_waves="$3"
  python3 - "$out_file" "$num_points" "$num_waves" <<'PY'
import sys
out_file, num_points, num_waves = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
with open(out_file, "w") as f:
    f.write(f"/NumWaves\t{num_waves}\n/NumPoints\t{num_points}\n")
    f.write("/PPheights\t" + "\t".join(["1"] * num_waves) + "\n\n/Matrix\n")
    for _ in range(num_points):
        f.write("\t".join(["1"] * num_waves) + "\n")
PY
}

make_contrast() {
  local out_file="$1" num_waves="$2"
  python3 - "$out_file" "$num_waves" <<'PY'
import sys
out_file, num_waves = sys.argv[1], int(sys.argv[2])
with open(out_file, "w") as f:
    f.write(f"/ContrastName1\tmean\n/NumWaves\t{num_waves}\n/NumContrasts\t1\n\n/Matrix\n")
    f.write("\t".join(["1"] * num_waves) + "\n")
PY
}

make_group_file() {
  local out_file="$1" num_points="$2"
  python3 - "$out_file" "$num_points" <<'PY'
import sys
out_file, num_points = sys.argv[1], int(sys.argv[2])
with open(out_file, "w") as f:
    f.write(f"/NumWaves\t1\n/NumPoints\t{num_points}\n\n/Matrix\n")
    for _ in range(num_points):
        f.write("1\n")
PY
}

make_stim_1d() {
  local out_file="$1" length="$2"
  python3 - "$out_file" "$length" <<'PY'
import sys
out, length = sys.argv[1], int(sys.argv[2])
with open(out, "w") as f:
    for i in range(length):
        f.write(f"{i % 2}\n")
PY
}

make_const_volume() {
  local ref="$1" out="$2" val="$3"
  docker_afni 3dcalc -overwrite -a "$ref" -expr "a*0+${val}" -prefix "$out"
}

# ── Data preparation ───────────────────────────────────────────────

prepare_fmri_data() {
  # Download ds002979 if needed
  local openneuro_dir="${DATA_DIR}/openneuro/ds002979"
  if [[ ! -d "$openneuro_dir" ]]; then
    require_cmd aws
    mkdir -p "${DATA_DIR}/openneuro"
    local sub="sub-016"
    aws s3 sync --no-sign-request "s3://openneuro.org/ds002979/" "$openneuro_dir" \
      --exclude "*" \
      --include "${sub}/anat/*T1w*.nii*" \
      --include "${sub}/anat/*T1w*.json" \
      --include "${sub}/func/*bold*.nii*" \
      --include "${sub}/func/*bold*.json" \
      --include "${sub}/fmap/*"
  fi

  T1W="$(find_one "$openneuro_dir" "*T1w*.nii*")"
  BOLD="$(find_one "$openneuro_dir" "*bold*.nii*")"
  BOLD_JSON="$(find_one "$openneuro_dir" "*bold*.json" || true)"
  FMAP_AP="$(find_one "$openneuro_dir" "*dir-AP*epi.nii*" || true)"
  FMAP_PA="$(find_one "$openneuro_dir" "*dir-PA*epi.nii*" || true)"
  FMAP_AP_JSON="$(find_one "$openneuro_dir" "*dir-AP*epi.json" || true)"
  FMAP_PA_JSON="$(find_one "$openneuro_dir" "*dir-PA*epi.json" || true)"

  [[ -n "$T1W" ]]  || die "No T1w found in ${openneuro_dir}"
  [[ -n "$BOLD" ]] || die "No BOLD found in ${openneuro_dir}"

  # Extract TR from JSON
  BOLD_TR=""
  if [[ -n "$BOLD_JSON" && -f "$BOLD_JSON" ]]; then
    BOLD_TR="$(python3 -c "
import json
with open('${BOLD_JSON}') as f: d = json.load(f)
tr = d.get('RepetitionTime')
if tr: print(tr)
" 2>/dev/null || true)"
  fi

  # MNI templates from FSL container
  STANDARD_REF="${DERIVED_DIR}/MNI152_T1_2mm.nii.gz"
  STANDARD_MASK="${DERIVED_DIR}/MNI152_T1_2mm_brain_mask_dil.nii.gz"
  TOPUP_CONFIG="${DERIVED_DIR}/b02b0.cnf"

  [[ -f "$STANDARD_REF" ]]  || copy_from_fsl_image "data/standard/MNI152_T1_2mm.nii.gz" "$STANDARD_REF" || true
  [[ -f "$STANDARD_MASK" ]] || copy_from_fsl_image "data/standard/MNI152_T1_2mm_brain_mask_dil.nii.gz" "$STANDARD_MASK" || true
  [[ -f "$TOPUP_CONFIG" ]]  || copy_from_fsl_image "etc/flirtsch/b02b0.cnf" "$TOPUP_CONFIG" || true

  # BOLD mean and mask
  BOLD_MEAN="${DERIVED_DIR}/bold_mean.nii.gz"
  BOLD_MASK="${DERIVED_DIR}/bold_mask.nii.gz"
  if [[ ! -f "$BOLD_MEAN" ]]; then
    docker_fsl fslmaths "$BOLD" -Tmean "$BOLD_MEAN" >/dev/null 2>&1 || true
  fi
  if [[ -f "$BOLD_MEAN" && ! -f "$BOLD_MASK" ]]; then
    docker_fsl bet "$BOLD_MEAN" "${DERIVED_DIR}/bold_mean_brain" -m >/dev/null 2>&1 || true
    [[ -f "${DERIVED_DIR}/bold_mean_brain_mask.nii.gz" ]] && \
      mv "${DERIVED_DIR}/bold_mean_brain_mask.nii.gz" "$BOLD_MASK" || true
  fi
}

prepare_afni_fmri_data() {
  prepare_fmri_data

  # AFNI-specific derived data
  BOLD_CLIP="${DERIVED_DIR}/bold_${AFNI_BOLD_CLIP_LEN}.nii.gz"
  BOLD_CLIP_RES="${DERIVED_DIR}/bold_${AFNI_BOLD_CLIP_LEN}_${RES_MM}mm.nii.gz"
  AFNI_BOLD_MEAN="${DERIVED_DIR}/bold_${AFNI_BOLD_CLIP_LEN}_mean.nii.gz"
  AFNI_BOLD_MASK="${DERIVED_DIR}/bold_${AFNI_BOLD_CLIP_LEN}_mask.nii.gz"
  T1_RES="${DERIVED_DIR}/t1_${RES_MM}mm.nii.gz"
  ROI_MASK="${DERIVED_DIR}/roi_mask.nii.gz"
  LME_MASK="${DERIVED_DIR}/lme_mask.nii.gz"
  STIM_1D="${DERIVED_DIR}/stim.1D"
  COORDS_1D="${DERIVED_DIR}/coords.1D"

  [[ -f "$T1_RES" ]] || docker_afni 3dresample -dxyz "$RES_MM" "$RES_MM" "$RES_MM" -prefix "$T1_RES" -input "$T1W"
  [[ -f "$BOLD_CLIP" ]] || docker_afni 3dTcat -prefix "$BOLD_CLIP" "${BOLD}[0..$((AFNI_BOLD_CLIP_LEN-1))]"
  [[ -f "$BOLD_CLIP_RES" ]] || docker_afni 3dresample -dxyz "$RES_MM" "$RES_MM" "$RES_MM" -prefix "$BOLD_CLIP_RES" -input "$BOLD_CLIP"
  [[ -f "$AFNI_BOLD_MEAN" ]] || docker_afni 3dTstat -mean -prefix "$AFNI_BOLD_MEAN" "$BOLD_CLIP_RES"
  [[ -f "$AFNI_BOLD_MASK" ]] || docker_afni 3dAutomask -prefix "$AFNI_BOLD_MASK" "$AFNI_BOLD_MEAN"

  # ROI mask (2 regions)
  [[ -f "$ROI_MASK" ]] || docker_afni 3dcalc -overwrite -a "$AFNI_BOLD_MASK" -expr 'step(a)*(1+ispositive(i-2))' -prefix "$ROI_MASK" || true

  # Small LME mask
  if [[ ! -f "$LME_MASK" ]]; then
    docker_afni 3dmaskdump -nozero "$AFNI_BOLD_MASK" 2>/dev/null | head -n 10 >"${DERIVED_DIR}/lme_coord.1D" || true
    if [[ -s "${DERIVED_DIR}/lme_coord.1D" ]]; then
      docker_afni 3dUndump -overwrite -ijk -master "$AFNI_BOLD_MASK" -prefix "$LME_MASK" "${DERIVED_DIR}/lme_coord.1D" || true
    fi
  fi

  # Stimulus file
  if [[ ! -f "$STIM_1D" ]]; then
    make_stim_1d "$STIM_1D" "$AFNI_BOLD_CLIP_LEN"
  fi

  # Coordinates file
  if [[ ! -f "$COORDS_1D" ]]; then
    printf "0 0 0\n1 1 1\n2 2 2\n" > "$COORDS_1D"
  fi

  # ANOVA constant volumes
  ANOVA_VOLS=()
  for i in $(seq 1 16); do
    local vol="${DERIVED_DIR}/anova_${i}.nii.gz"
    ANOVA_VOLS+=("$vol")
    [[ -f "$vol" ]] || make_const_volume "$AFNI_BOLD_MEAN" "$vol" "$i" || true
  done

  # Subject-level shorthand
  SUBJ1_A="${DERIVED_DIR}/anova_1.nii.gz"
  SUBJ1_B="${DERIVED_DIR}/anova_2.nii.gz"
  SUBJ2_A="${DERIVED_DIR}/anova_3.nii.gz"
  SUBJ2_B="${DERIVED_DIR}/anova_4.nii.gz"

  # MEMA beta/tstat volumes
  BETA1="${DERIVED_DIR}/mema_beta1.nii.gz"
  BETA2="${DERIVED_DIR}/mema_beta2.nii.gz"
  TSTAT1="${DERIVED_DIR}/mema_t1.nii.gz"
  TSTAT2="${DERIVED_DIR}/mema_t2.nii.gz"
  [[ -f "$BETA1" ]]  || make_const_volume "$AFNI_BOLD_MEAN" "$BETA1" 0.5 || true
  [[ -f "$BETA2" ]]  || make_const_volume "$AFNI_BOLD_MEAN" "$BETA2" 0.8 || true
  [[ -f "$TSTAT1" ]] || make_const_volume "$AFNI_BOLD_MEAN" "$TSTAT1" 2 || true
  [[ -f "$TSTAT2" ]] || make_const_volume "$AFNI_BOLD_MEAN" "$TSTAT2" 3 || true
}

prepare_afni_templates() {
  prepare_afni_fmri_data

  SSW_TEMPLATE="${DERIVED_DIR}/MNI152_2009_template_SSW.nii.gz"
  SSW_TEMPLATE_RES="${DERIVED_DIR}/MNI152_2009_template_SSW_${RES_MM}mm.nii.gz"
  SSW_TEMPLATE_MULTI="${DERIVED_DIR}/MNI152_2009_template_SSW_${RES_MM}mm_5vol.nii.gz"
  AUTO_TLRC_BASE_HEAD="${DERIVED_DIR}/TT_N27+tlrc.HEAD"
  AUTO_TLRC_BASE_RES="${DERIVED_DIR}/TT_N27_${AUTO_TLRC_RES_MM}mm+tlrc.HEAD"
  AUTO_TLRC_INPUT="${DERIVED_DIR}/t1_${AUTO_TLRC_RES_MM}mm.nii.gz"

  if [[ ! -f "$SSW_TEMPLATE" ]]; then
    copy_from_afni_image "MNI152_2009_template_SSW.nii.gz" "$SSW_TEMPLATE" "$AFNI_IMAGE" || \
    copy_from_afni_image "MNI152_2009_template_SSW.nii.gz" "$SSW_TEMPLATE" "$AFNI_TEST_IMAGE" || \
    copy_from_afni_image "MNI152_2009_template.nii.gz" "$SSW_TEMPLATE" "$AFNI_IMAGE" || \
    copy_from_afni_image "MNI152_2009_template.nii.gz" "$SSW_TEMPLATE" "$AFNI_TEST_IMAGE" || \
    cp "$T1_RES" "$SSW_TEMPLATE" || true
  fi
  [[ -f "$SSW_TEMPLATE_RES" ]] || docker_afni 3dresample -dxyz "$RES_MM" "$RES_MM" "$RES_MM" -prefix "$SSW_TEMPLATE_RES" -input "$SSW_TEMPLATE" || true
  [[ -f "$SSW_TEMPLATE_MULTI" ]] || docker_afni 3dTcat -prefix "$SSW_TEMPLATE_MULTI" \
    "$SSW_TEMPLATE_RES" "$SSW_TEMPLATE_RES" "$SSW_TEMPLATE_RES" "$SSW_TEMPLATE_RES" "$SSW_TEMPLATE_RES" || true

  if [[ ! -f "$AUTO_TLRC_BASE_HEAD" ]]; then
    copy_from_afni_image "TT_N27+tlrc.HEAD" "$AUTO_TLRC_BASE_HEAD" "$AFNI_IMAGE" || \
    copy_from_afni_image "TT_N27+tlrc.HEAD" "$AUTO_TLRC_BASE_HEAD" "$AFNI_TEST_IMAGE" || true
  fi
  if [[ ! -f "${DERIVED_DIR}/TT_N27+tlrc.BRIK" && ! -f "${DERIVED_DIR}/TT_N27+tlrc.BRIK.gz" ]]; then
    copy_from_afni_image "TT_N27+tlrc.BRIK.gz" "${DERIVED_DIR}/TT_N27+tlrc.BRIK.gz" "$AFNI_IMAGE" || \
    copy_from_afni_image "TT_N27+tlrc.BRIK.gz" "${DERIVED_DIR}/TT_N27+tlrc.BRIK.gz" "$AFNI_TEST_IMAGE" || \
    copy_from_afni_image "TT_N27+tlrc.BRIK" "${DERIVED_DIR}/TT_N27+tlrc.BRIK" "$AFNI_IMAGE" || \
    copy_from_afni_image "TT_N27+tlrc.BRIK" "${DERIVED_DIR}/TT_N27+tlrc.BRIK" "$AFNI_TEST_IMAGE" || true
  fi
  [[ -f "$AUTO_TLRC_BASE_RES" ]] || docker_afni 3dresample -dxyz "$AUTO_TLRC_RES_MM" "$AUTO_TLRC_RES_MM" "$AUTO_TLRC_RES_MM" \
    -prefix "$AUTO_TLRC_BASE_RES" -input "$AUTO_TLRC_BASE_HEAD" || true
  [[ -f "$AUTO_TLRC_INPUT" ]] || docker_afni 3dresample -dxyz "$AUTO_TLRC_RES_MM" "$AUTO_TLRC_RES_MM" "$AUTO_TLRC_RES_MM" \
    -prefix "$AUTO_TLRC_INPUT" -input "$T1W" || true
}

prepare_ants_fmri_data() {
  prepare_fmri_data

  T1_RES="${DERIVED_DIR}/t1_${RES_MM}mm.nii.gz"
  ANTS_MASK="${DERIVED_DIR}/ants_t1_mask.nii.gz"

  if [[ ! -f "$T1_RES" ]]; then
    docker_ants ResampleImage 3 "$T1W" "$T1_RES" "${RES_MM}x${RES_MM}x${RES_MM}" 0 0
  fi
  if [[ ! -f "$ANTS_MASK" ]]; then
    docker_ants ThresholdImage 3 "$T1_RES" "$ANTS_MASK" 0.01 100000 1 0
  fi
}

prepare_freesurfer_data() {
  prepare_fmri_data

  local fs_data_dir="${ROOT_DIR}/tests/data/freesurfer"
  local fs_subjects="${DATA_DIR}/subjects"

  if [[ -z "$LICENSE_FILE" && -f "${fs_data_dir}/license.txt" ]]; then
    LICENSE_FILE="${fs_data_dir}/license.txt"
  fi
  if [[ -z "$LICENSE_FILE" || ! -f "$LICENSE_FILE" ]]; then
    die "FreeSurfer license not found. Set FS_LICENSE or place license.txt at ${fs_data_dir}/license.txt"
  fi

  local src_bert="${fs_data_dir}/subjects/bert"
  if [[ ! -d "$src_bert" ]]; then
    "${ROOT_DIR}/utils/download_freesurfer_test_data.sh" || true
  fi
  [[ -d "$src_bert" ]] || die "bert subject not found at ${src_bert}"

  mkdir -p "$fs_subjects"
  if [[ ! -d "${fs_subjects}/bert" ]]; then
    cp -a "$src_bert" "${fs_subjects}/"
  fi

  FS_SUBJECTS_DIR="$fs_subjects"
  FS_SUBJECT="bert"
  FS_SUBJECT_DIR="${fs_subjects}/bert"
  FS_LICENSE="$LICENSE_FILE"
}

# ── Initialization ─────────────────────────────────────────────────

if ! command -v "$CWLTOOL_BIN" >/dev/null 2>&1; then
  if [[ -x "${HOME}/miniconda3/bin/cwltool" ]]; then
    CWLTOOL_BIN="${HOME}/miniconda3/bin/cwltool"
  fi
fi

require_cmd "$CWLTOOL_BIN"
require_cmd docker
require_cmd python3

setup_dirs
