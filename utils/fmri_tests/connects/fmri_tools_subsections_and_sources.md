# fMRI Tools by Subsection

## Scope
This list is restricted to the **Functional MRI** modality as defined in the UI mapping.

## Tools
| Library | Subsection | Tool |
|---|---|---|
| AFNI | Connectivity | 3dNetCorr |
| AFNI | Connectivity | 3dRSFC |
| AFNI | Connectivity | 3dTcorr1D |
| AFNI | Connectivity | 3dTcorrMap |
| AFNI | Denoising | 3dBandpass |
| AFNI | Denoising | 3dDespike |
| AFNI | Masking | 3dAutomask |
| AFNI | Motion Correction | 3dvolreg |
| AFNI | Multiple Comparisons | 3dClustSim |
| AFNI | Multiple Comparisons | 3dFWHMx |
| AFNI | Registration | align_epi_anat |
| AFNI | ROI Analysis | 3dmaskave |
| AFNI | ROI Analysis | 3dROIstats |
| AFNI | Slice Timing | 3dTshift |
| AFNI | Smoothing | 3dBlurToFWHM |
| AFNI | Smoothing | 3dmerge |
| AFNI | Statistical Analysis | 3dANOVA |
| AFNI | Statistical Analysis | 3dANOVA2 |
| AFNI | Statistical Analysis | 3dANOVA3 |
| AFNI | Statistical Analysis | 3dDeconvolve |
| AFNI | Statistical Analysis | 3dLME |
| AFNI | Statistical Analysis | 3dLMEr |
| AFNI | Statistical Analysis | 3dMEMA |
| AFNI | Statistical Analysis | 3dMVM |
| AFNI | Statistical Analysis | 3dREMLfit |
| AFNI | Statistical Analysis | 3dttest++ |
| ANTs | Motion Correction | antsMotionCorr |
| Connectome Workbench | CIFTI Operations | wb_command_cifti_create_dense_timeseries |
| Connectome Workbench | CIFTI Operations | wb_command_cifti_separate |
| Connectome Workbench | Surface Smoothing | wb_command_cifti_smoothing |
| Connectome Workbench | Surface Smoothing | wb_command_metric_smoothing |
| fMRIPrep | Pipeline | fmriprep |
| FreeSurfer | Functional Analysis | bbregister |
| FreeSurfer | Functional Analysis | mri_glmfit |
| FreeSurfer | Functional Analysis | mri_surf2vol |
| FreeSurfer | Functional Analysis | mri_vol2surf |
| FreeSurfer | Functional Analysis | mris_preproc |
| FSL | Distortion Correction | applytopup |
| FSL | Distortion Correction | fsl_prepare_fieldmap |
| FSL | Distortion Correction | fugue |
| FSL | Distortion Correction | prelude |
| FSL | Distortion Correction | topup |
| FSL | ICA/Denoising | dual_regression |
| FSL | ICA/Denoising | melodic |
| FSL | Motion Correction | mcflirt |
| FSL | Slice Timing | slicetimer |
| FSL | Smoothing | susan |
| FSL | Statistical Analysis | film_gls |
| FSL | Statistical Analysis | flameo |
| FSL | Statistical Analysis | randomise |
| MRIQC | Pipeline | mriqc |

## Source of Truth Used
1. `src/data/toolData.js`
Source used for the **authoritative UI mapping** of Functional MRI tools to subsections (`toolsByModality["Functional MRI"]` / `MODALITY_ASSIGNMENTS`).
2. `utils/fmri_tests/run_all.sh` and `utils/wb_tests/run_all.sh`
Used for **in-repo empirical ordering/dependency evidence** between stages (especially AFNI/FSL execution phases and Workbench CIFTI order).
3. FSL FEAT user guide
Used for expert-informed ordering among motion correction, slice timing, B0 unwarping, and pre-stats/statistical progression: https://fsl.fmrib.ox.ac.uk/fsl/docs/task_fmri/feat/user_guide.html
4. AFNI `afni_proc.py` documentation
Used for expert-informed AFNI block ordering (`despike tshift align tlrc volreg blur mask scale regress`): https://afni.nimh.nih.gov/pub/dist/doc/program_help/afni_proc.py.html
5. fMRIPrep workflow and outputs documentation
Used for expert-informed interpretation of the pipeline node and downstream analysis handoff/confounds context: https://www.fmriprep.org/en/0.6.1/workflows.html and https://fmriprep.org/en/23.1.2/outputs.html
6. MRIQC documentation
Used for expert-informed placement of MRIQC as an automated QC stage for functional MRI: https://mriqc.readthedocs.io/en/24.0.1/
7. Connectome Workbench command docs
Used for expert-informed interpretation of CIFTI operations and smoothing stages:
- https://www.humanconnectome.org/software/workbench-command/-cifti-create-dense-timeseries
- https://www.humanconnectome.org/software/workbench-command/-cifti-separate
- https://www.humanconnectome.org/software/workbench-command/-cifti-smoothing
- https://www.humanconnectome.org/software/workbench-command/-metric-smoothing

## Notes on Judgment
- The graph edges represent **reasonable follow-on relationships**, not strict mandatory orderings.
- Where methods differ across labs (e.g., exact order of some pre-stats operations), the graph encodes conservative, commonly accepted transitions from the sources above.
