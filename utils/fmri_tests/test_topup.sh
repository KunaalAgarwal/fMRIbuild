#!/usr/bin/env bash
# Test: FSL topup (Susceptibility-induced Distortion Correction)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="topup"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

prepare_fmri_data

if [[ -z "${FMAP_AP:-}" || -z "${FMAP_PA:-}" ]]; then
  echo "ERROR: missing fieldmap AP/PA data"
  exit 1
fi
if [[ -z "${FMAP_AP_JSON:-}" || -z "${FMAP_PA_JSON:-}" ]]; then
  echo "ERROR: missing fieldmap AP/PA JSON metadata"
  exit 1
fi

# Extract first volume from each fieldmap and merge
TOPUP_IN="${DERIVED_DIR}/topup_input.nii.gz"
AP_B0="${DERIVED_DIR}/fmap_ap_0.nii.gz"
PA_B0="${DERIVED_DIR}/fmap_pa_0.nii.gz"

docker_fsl fslroi "${FMAP_AP}" "${AP_B0}" 0 1 >/dev/null 2>&1 || true
docker_fsl fslroi "${FMAP_PA}" "${PA_B0}" 0 1 >/dev/null 2>&1 || true

if [[ -f "$AP_B0" && -f "$PA_B0" ]]; then
  docker_fsl fslmerge -t "${TOPUP_IN}" "${AP_B0}" "${PA_B0}" >/dev/null 2>&1 || true
  AP_VOLS=1
  PA_VOLS=1
else
  docker_fsl fslmerge -t "${TOPUP_IN}" "${FMAP_AP}" "${FMAP_PA}" >/dev/null 2>&1 || true
  AP_VOLS="$(docker_fsl fslnvols "${FMAP_AP}" 2>/dev/null | tr -d '[:space:]' || true)"
  PA_VOLS="$(docker_fsl fslnvols "${FMAP_PA}" 2>/dev/null | tr -d '[:space:]' || true)"
fi

if [[ -z "${AP_VOLS:-}" || "$AP_VOLS" -lt 1 ]]; then AP_VOLS=1; fi
if [[ -z "${PA_VOLS:-}" || "$PA_VOLS" -lt 1 ]]; then PA_VOLS=1; fi

if [[ ! -f "$TOPUP_IN" ]]; then
  echo "ERROR: failed to build topup input"
  exit 1
fi

# Generate acquisition parameters from JSON metadata
ACQPARAMS="${DERIVED_DIR}/acqparams.txt"
python3 - "$FMAP_AP_JSON" "$FMAP_PA_JSON" "$ACQPARAMS" "$AP_VOLS" "$PA_VOLS" <<'PY'
import json
import sys

def parse_params(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    ped = data.get("PhaseEncodingDirection")
    trt = data.get("TotalReadoutTime")
    if trt is None:
        trt = data.get("TotalReadoutTime".lower())
    if trt is None:
        trt = 0.05
    return ped, float(trt)

def ped_to_vec(ped):
    mapping = {
        "i": (1, 0, 0),
        "i-": (-1, 0, 0),
        "j": (0, 1, 0),
        "j-": (0, -1, 0),
        "k": (0, 0, 1),
        "k-": (0, 0, -1),
    }
    return mapping.get(ped, (0, 1, 0))

ap_ped, ap_trt = parse_params(sys.argv[1])
pa_ped, pa_trt = parse_params(sys.argv[2])
ap_n = int(sys.argv[4])
pa_n = int(sys.argv[5])

with open(sys.argv[3], "w", encoding="utf-8") as f:
    ap_vec = ped_to_vec(ap_ped)
    pa_vec = ped_to_vec(pa_ped)
    for _ in range(ap_n):
        f.write(f"{ap_vec[0]} {ap_vec[1]} {ap_vec[2]} {ap_trt}\n")
    for _ in range(pa_n):
        f.write(f"{pa_vec[0]} {pa_vec[1]} {pa_vec[2]} {pa_trt}\n")
PY

# Generate template for reference
make_template "$CWL" "$TOOL"

# Create job YAML
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
input:
  class: File
  path: "${TOPUP_IN}"
encoding_file:
  class: File
  path: "${ACQPARAMS}"
output: "topup_out"
EOF

if [[ -f "${TOPUP_CONFIG:-}" ]]; then
  cat >> "${JOB_DIR}/${TOOL}.yml" <<EOF
config:
  class: File
  path: "${TOPUP_CONFIG}"
EOF
fi

cat >> "${JOB_DIR}/${TOOL}.yml" <<EOF
miter: "1"
subsamp: "1"
fwhm: "4"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"
