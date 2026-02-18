# Diffusion Magnetic Resonance Imaging Tools, Subsections, and Sources

## Scope
- Modality: dMRI
- Generated at: 2026-02-18T02:21:44Z

## Sources of truth
1. `src/data/toolData.js` - authoritative mapping from `toolsByModality["Diffusion MRI"]` and `MODALITY_ASSIGNMENTS["Diffusion MRI"]`.
2. `utils/dmri_tests/README.md` - confirms diffusion test coverage and expected pipeline context for FSL/MRtrix3/FreeSurfer tools.
3. `utils/dmri_tests/test_*.sh` and `utils/amico_tests/test_amico_noddi.sh` - cross-check practical tool usage and modality-specific execution context.

## Tool Inventory
| Library | Subsection | Tool |
|---|---|---|
| AMICO | Microstructure Modeling | amico_noddi |
| FreeSurfer | Diffusion | dmri_postreg |
| FSL | Preprocessing | eddy |
| FSL | Preprocessing | topup |
| FSL | TBSS | tbss_1_preproc |
| FSL | TBSS | tbss_2_reg |
| FSL | TBSS | tbss_3_postreg |
| FSL | TBSS | tbss_4_prestats |
| FSL | TBSS | tbss_non_FA |
| FSL | Tensor Fitting | dtifit |
| FSL | Tractography | bedpostx |
| FSL | Tractography | probtrackx2 |
| MRtrix3 | Preprocessing | dwidenoise |
| MRtrix3 | Preprocessing | mrdegibbs |
| MRtrix3 | Tensor/FOD | dwi2fod |
| MRtrix3 | Tensor/FOD | dwi2tensor |
| MRtrix3 | Tensor/FOD | tensor2metric |
| MRtrix3 | Tractography | tck2connectome |
| MRtrix3 | Tractography | tckgen |
| MRtrix3 | Tractography | tcksift |

## Notes / Assumptions
- Primary source (`toolData.js`) defines 20 Diffusion MRI tools, including `amico_noddi` under `AMICO / Microstructure Modeling`.
- `utils/dmri_tests` currently covers FSL, MRtrix3, and FreeSurfer test scripts; AMICO diffusion tool coverage is sourced from `utils/amico_tests`.
