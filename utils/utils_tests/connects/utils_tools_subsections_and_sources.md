# Utilities Tools, Subsections, and Sources

## Scope
- Modality: Utils
- Generated at: 2026-02-18T03:01:05Z

## Sources of truth
1. `src/data/toolData.js` - authoritative mapping in `toolsByModality["Utilities"]` and `MODALITY_ASSIGNMENTS["Utilities"]`.
2. `utils/utils_tests/README.md` - utility test coverage and execution context.
3. `utils/utils_tests/test_*.sh` - practical utility tool invocations for cross-checking.

## Tool Inventory
| Library | Subsection | Tool |
|---|---|---|
| AFNI | Dataset Operations | 3dcopy |
| AFNI | Dataset Operations | 3dinfo |
| AFNI | Dataset Operations | 3dTcat |
| AFNI | Dataset Operations | 3dZeropad |
| AFNI | Image Math | 3dcalc |
| AFNI | Image Math | 3dTstat |
| AFNI | ROI Utilities | 3dfractionize |
| AFNI | ROI Utilities | 3dresample |
| AFNI | ROI Utilities | 3dUndump |
| AFNI | ROI Utilities | whereami |
| AFNI | Warp Utilities | 3dNwarpApply |
| AFNI | Warp Utilities | 3dNwarpCat |
| ANTs | Image Operations | ImageMath |
| ANTs | Image Operations | ThresholdImage |
| ANTs | Label Analysis | antsJointLabelFusion.sh |
| ANTs | Label Analysis | LabelGeometryMeasures |
| ANTs | Preprocessing Utilities | DenoiseImage |
| ANTs | Preprocessing Utilities | N4BiasFieldCorrection |
| ANTs | Transform Utilities | antsApplyTransforms |
| FreeSurfer | Format Conversion | mri_convert |
| FSL | Clustering | cluster |
| FSL | Image Math | fslmaths |
| FSL | Image Math | fslmeants |
| FSL | Image Math | fslroi |
| FSL | Image Math | fslstats |
| FSL | Volume Operations | fslmerge |
| FSL | Volume Operations | fslreorient2std |
| FSL | Volume Operations | fslsplit |
| FSL | Volume Operations | robustfov |
| FSL | Warp Utilities | applywarp |
| FSL | Warp Utilities | convertwarp |
| FSL | Warp Utilities | invwarp |

## Notes / Assumptions
- Subsection graph edges are inferred via generic utility workflow roles: preprocess -> conversion/dataset -> image ops -> warp/transform -> ROI/label -> clustering.
