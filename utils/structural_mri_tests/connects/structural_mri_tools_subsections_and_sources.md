# Structural MRI Tools, Subsections, and Sources

## Scope
- Modality: structural_mri
- Generated at: 2026-02-18T02:36:49Z

## Sources of truth
1. `src/data/toolData.js` - authoritative mapping in `toolsByModality["Structural MRI"]` and `MODALITY_ASSIGNMENTS["Structural MRI"]`.
2. `utils/structural_mri_tests/README.md` - structural MRI test coverage and tool execution context.
3. `utils/structural_mri_tests/test_*.sh` - practical tool invocation coverage used for cross-checking.

## Tool Inventory
| Library | Subsection | Tool |
|---|---|---|
| AFNI | Bias Correction | 3dUnifize |
| AFNI | Brain Extraction | @SSwarper |
| AFNI | Brain Extraction | 3dSkullStrip |
| AFNI | Registration | @auto_tlrc |
| AFNI | Registration | 3dAllineate |
| AFNI | Registration | 3dQwarp |
| ANTs | Brain Extraction | antsBrainExtraction.sh |
| ANTs | Cortical Thickness | antsCorticalThickness.sh |
| ANTs | Cortical Thickness | KellyKapowski |
| ANTs | Registration | antsRegistration |
| ANTs | Registration | antsRegistrationSyN.sh |
| ANTs | Registration | antsRegistrationSyNQuick.sh |
| ANTs | Segmentation | antsAtroposN4.sh |
| ANTs | Segmentation | Atropos |
| Connectome Workbench | Surface Registration | wb_command_surface_sphere_project_unproject |
| FreeSurfer | Morphometry | aparcstats2table |
| FreeSurfer | Morphometry | asegstats2table |
| FreeSurfer | Morphometry | mri_segstats |
| FreeSurfer | Morphometry | mris_anatomical_stats |
| FreeSurfer | Parcellation | mri_annotation2label |
| FreeSurfer | Parcellation | mri_aparc2aseg |
| FreeSurfer | Parcellation | mri_label2vol |
| FreeSurfer | Parcellation | mris_ca_label |
| FreeSurfer | Surface Reconstruction | mri_convert |
| FreeSurfer | Surface Reconstruction | mri_normalize |
| FreeSurfer | Surface Reconstruction | mri_segment |
| FreeSurfer | Surface Reconstruction | mri_watershed |
| FreeSurfer | Surface Reconstruction | mris_inflate |
| FreeSurfer | Surface Reconstruction | mris_sphere |
| FreeSurfer | Surface Reconstruction | recon-all |
| FSL | Brain Extraction | bet |
| FSL | Lesion Segmentation | bianca |
| FSL | Pipelines | fsl_anat |
| FSL | Pipelines | siena |
| FSL | Pipelines | sienax |
| FSL | Registration | flirt |
| FSL | Registration | fnirt |
| FSL | Tissue Segmentation | fast |
| FSL | Tissue Segmentation | run_first_all |

## Notes / Assumptions
- Mapping follows `toolData.js` exactly for Structural MRI, including AFNI and Connectome Workbench structural tools.
