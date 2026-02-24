#!/usr/bin/env bash
# Test: FSL feat (FMRI Expert Analysis Tool)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_common.sh"

TOOL="feat"
LIB="fsl"
CWL="${CWL_DIR}/${LIB}/${TOOL}.cwl"

# ── Step 1: Validate CWL ────────────────────────────────────────
echo "Validating CWL: ${CWL}"
"$CWLTOOL_BIN" --validate "$CWL" || die "CWL validation failed for ${TOOL}"

# ── Step 2: Prepare data ────────────────────────────────────────
prepare_fmri_data

# ── Step 3: Get BOLD metadata ───────────────────────────────────
N_VOLS="$(docker_fsl fslnvols "${BOLD}" 2>/dev/null | tr -d '[:space:]' || true)"
if [[ -z "$N_VOLS" ]]; then
  die "Could not determine BOLD volume count"
fi
USE_TR="${BOLD_TR:-2.0}"

echo "  BOLD: ${BOLD}"
echo "  Volumes: ${N_VOLS}, TR: ${USE_TR}s"

# ── Step 4: Generate .fsf design file ───────────────────────────
# Uses a square-wave design (shape=0) to avoid needing external
# timing files. Paths in the .fsf are placeholders — the CWL
# rewrites them at runtime to match staged file locations.
FSF_FILE="${DERIVED_DIR}/feat_test.fsf"

python3 - "$FSF_FILE" "$BOLD" "$N_VOLS" "$USE_TR" <<'PY'
import sys
fsf_file = sys.argv[1]
bold_path = sys.argv[2]
n_vols = int(sys.argv[3])
tr = float(sys.argv[4])

# Complete FSL 5.0 .fsf file with ALL required parameters
# Parameter list derived from feat5:write in featlib.tcl
with open(fsf_file, "w") as f:
    f.write(f"""
# FEAT version number
set fmri(version) 6.00
set fmri(inmelodic) 0
set fmri(level) 1
set fmri(analysis) 7
set fmri(relative_yn) 0
set fmri(help_yn) 1
set fmri(featwatcher_yn) 0
set fmri(sscleanup_yn) 0
set fmri(outputdir) "feat_output"
set fmri(tr) {tr}
set fmri(npts) {n_vols}
set fmri(ndelete) 0
set fmri(tagfirst) 1
set fmri(multiple) 1
set fmri(inputtype) 2
set fmri(filtering_yn) 1
set fmri(brain_thresh) 10
set fmri(critical_z) 5.3
set fmri(noise) 0.66
set fmri(noisear) 0.34
set fmri(mc) 1
set fmri(sh_yn) 0
set fmri(regunwarp_yn) 0
set fmri(dwell) 0.7
set fmri(te) 35
set fmri(signallossthresh) 10
set fmri(unwarp_dir) y
set fmri(st) 0
set fmri(st_file) ""
set fmri(bet_yn) 1
set fmri(smooth) 5
set fmri(norm_yn) 0
set fmri(perfsub_yn) 0
set fmri(temphp_yn) 1
set fmri(templp_yn) 0
set fmri(melodic_yn) 0
set fmri(stats_yn) 1
set fmri(prewhiten_yn) 1
set fmri(motionevs) 0
set fmri(motionevsbeta) ""
set fmri(scriptevsbeta) ""
set fmri(robust_yn) 0
set fmri(mixed_yn) 2
set fmri(evs_orig) 1
set fmri(evs_real) 2
set fmri(evs_vox) 0
set fmri(ncon_orig) 1
set fmri(ncon_real) 1
set fmri(nftests_orig) 0
set fmri(nftests_real) 0
set fmri(constcol) 0
set fmri(poststats_yn) 0
set fmri(threshmask) ""
set fmri(thresh) 3
set fmri(prob_thresh) 0.05
set fmri(z_thresh) 3.1
set fmri(zdisplay) 0
set fmri(zmin) 2
set fmri(zmax) 8
set fmri(rendertype) 1
set fmri(bgimage) 1
set fmri(tsplot_yn) 0
set fmri(reginitial_highres_yn) 0
set fmri(reginitial_highres_search) 90
set fmri(reginitial_highres_dof) 3
set fmri(reghighres_yn) 0
set fmri(reghighres_search) 90
set fmri(reghighres_dof) BBR
set fmri(regstandard_yn) 0
set fmri(alternateReference_yn) 0
set fmri(regstandard) ""
set fmri(regstandard_search) 90
set fmri(regstandard_dof) 12
set fmri(regstandard_nonlinear_yn) 0
set fmri(regstandard_nonlinear_warpres) 10
set fmri(paradigm_hp) 100
set fmri(totalVoxels) 0
set fmri(ncopeinputs) 0

# Input 4D data (placeholder — rewritten by CWL at runtime)
set feat_files(1) "{bold_path}"

# Confound EVs
set fmri(confoundevs) 0

# EV 1 — square wave (shape 0, no external timing file needed)
set fmri(evtitle1) "stimulus"
set fmri(shape1) 0
set fmri(skip1) 0
set fmri(off1) 20
set fmri(on1) 20
set fmri(phase1) 0
set fmri(stop1) -1
set fmri(convolve1) 3
set fmri(convolve_phase1) 0
set fmri(tempfilt_yn1) 1
set fmri(deriv_yn1) 1
set fmri(gammasigma1) 3
set fmri(gammadelay1) 6
set fmri(ortho1.0) 0
set fmri(ortho1.1) 0

# Contrast vectors
set fmri(con_mode_old) orig
set fmri(con_mode) orig
set fmri(conpic_orig.1) 1
set fmri(conname_orig.1) "stimulus>baseline"
set fmri(con_orig1.1) 1
set fmri(conpic_real.1) 1
set fmri(conname_real.1) "stimulus>baseline"
set fmri(con_real1.1) 1
set fmri(con_real1.2) 0

# Contrast masking
set fmri(conmask_zerothresh_yn) 0
set fmri(conmask1_1) 0
""")
PY

# ── Step 5: Generate template ───────────────────────────────────
make_template "$CWL" "$TOOL"

# ── Step 6: Create job YAML ─────────────────────────────────────
cat > "${JOB_DIR}/${TOOL}.yml" <<EOF
design_file:
  class: File
  path: "${FSF_FILE}"
input_data:
  class: File
  path: "${BOLD}"
EOF

# ── Step 7: Execute ─────────────────────────────────────────────
run_tool "$TOOL" "${JOB_DIR}/${TOOL}.yml" "$CWL"

# ── Step 8: Verify .feat directory contents ─────────────────────
echo "── Verifying FEAT outputs ──"

# Find the .feat directory
FEAT_DIR="$(first_match "${OUT_DIR}/${TOOL}"/*.feat 2>/dev/null || true)"
if [[ -z "$FEAT_DIR" || ! -d "$FEAT_DIR" ]]; then
  echo "  FAIL: no .feat directory found"
else
  echo "  .feat directory: ${FEAT_DIR}"

  # Check key output files
  for expected in \
    "filtered_func_data.nii.gz" \
    "mc/prefiltered_func_data_mcf.par" \
    "stats/cope1.nii.gz" \
    "stats/varcope1.nii.gz" \
    "stats/tstat1.nii.gz" \
    "stats/zstat1.nii.gz" \
    "stats/pe1.nii.gz" \
    "stats/sigmasquareds.nii.gz" \
    "design.mat" \
    "design.con"; do
    full_path="${FEAT_DIR}/${expected}"
    if [[ ! -f "$full_path" ]]; then
      echo "  MISSING: ${expected}"
    else
      echo "  FOUND: ${expected}"
    fi
  done

  # Verify NIfTI images are non-null with correct dimensions
  BOLD_DIMS="$(docker_fsl fslhd "$BOLD" 2>/dev/null | grep -E '^dim[1-3]\b' || true)"
  echo "  Reference BOLD spatial dims: ${BOLD_DIMS}"

  for nii in \
    "${FEAT_DIR}/filtered_func_data.nii.gz" \
    "${FEAT_DIR}/stats/cope1.nii.gz" \
    "${FEAT_DIR}/stats/zstat1.nii.gz" \
    "${FEAT_DIR}/stats/pe1.nii.gz"; do
    [[ -f "$nii" ]] || continue
    basename_nii="$(basename "$nii")"
    if [[ ! -s "$nii" ]]; then
      echo "  FAIL: zero-byte: ${basename_nii}"
      continue
    fi
    dims="$(docker_fsl fslhd "$nii" 2>&1 | grep -E '^dim[1-4]' || true)"
    range="$(docker_fsl fslstats "$nii" -R 2>/dev/null || true)"
    echo "  Header (${basename_nii}): ${dims}"
    echo "  Range  (${basename_nii}): ${range}"
    if [[ "$range" == "0.000000 0.000000" ]]; then
      echo "  WARN: image appears to be all zeros: ${basename_nii}"
    fi
  done
fi
