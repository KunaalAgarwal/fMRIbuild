#!/usr/bin/env bash
# Test: FSL BIANCA (Brain Intensity AbNormality Classification Algorithm)
# Uses synthetic training data (thresholded MNI152 as pseudo-lesion mask)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="bianca"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

setup_dirs
prepare_fsl_data

# ── Data prep: create training data directory with all needed files ──
BIANCA_DATA="${DERIVED_DIR}/bianca_training"
MASTERFILE="${DERIVED_DIR}/bianca_masterfile.txt"

if [[ ! -d "$BIANCA_DATA" ]]; then
  echo "Creating synthetic training data directory..."
  mkdir -p "$BIANCA_DATA"

  # Create 2 subjects (BIANCA needs at least 2: one for training, one for query)
  for subj in sub01 sub02; do
    mkdir -p "$BIANCA_DATA/$subj"
    cp "$T1W_2MM" "$BIANCA_DATA/$subj/t1.nii.gz"
    cp "$T1W_2MM_BRAIN" "$BIANCA_DATA/$subj/brain.nii.gz"
    # Synthetic lesion mask: threshold brain at 7000 to get sparse pseudo-lesions
    docker_fsl fslmaths "$BIANCA_DATA/$subj/brain.nii.gz" -thr 7000 -bin "$BIANCA_DATA/$subj/lesion.nii.gz"
    # Identity transformation matrix
    printf "1 0 0 0\n0 1 0 0\n0 0 1 0\n0 0 0 1\n" > "$BIANCA_DATA/$subj/identity.mat"
  done
fi

# Create master file with paths relative to the training_data directory name
# InitialWorkDirRequirement stages the directory as its basename in the working dir
DATADIR_NAME="$(basename "$BIANCA_DATA")"
cat > "$MASTERFILE" <<EOF
${DATADIR_NAME}/sub01/t1.nii.gz ${DATADIR_NAME}/sub01/brain.nii.gz ${DATADIR_NAME}/sub01/lesion.nii.gz ${DATADIR_NAME}/sub01/identity.mat
${DATADIR_NAME}/sub02/t1.nii.gz ${DATADIR_NAME}/sub02/brain.nii.gz ${DATADIR_NAME}/sub02/lesion.nii.gz ${DATADIR_NAME}/sub02/identity.mat
EOF

# ── Run BIANCA CWL ───────────────────────────────────────────
make_template "$CWL" "$TOOL"

cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
singlefile:
  class: File
  path: ${MASTERFILE}
training_data:
  class: Directory
  path: ${BIANCA_DATA}
querysubjectnum: 1
brainmaskfeaturenum: 2
labelfeaturenum: 3
trainingnums: all
output_name: bianca_output
matfeaturenum: 4
featuresubset: "1,2"
EOF

run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Verify outputs ─────────────────────────────────────────────
dir="${OUT_DIR}/${TOOL}"
found=0
for f in "$dir"/bianca_output*; do
  [[ -f "$f" ]] || continue
  [[ "$(basename "$f")" == *.log ]] && continue
  found=1
  if [[ ! -s "$f" ]]; then
    echo "  FAIL: zero-byte output: $f"; exit 1
  fi
  echo "  Header: $(docker_fsl fslhd "$f" 2>&1 | grep -E '^dim[1-4]' || true)"
done

if [[ "$found" -eq 0 ]]; then
  echo "  WARN: no output WMH map files found"
fi
