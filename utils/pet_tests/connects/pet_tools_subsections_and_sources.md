# Positron Emission Tomography Tools, Subsections, and Sources

## Scope
- Modality: PET
- Generated at: 2026-02-18T02:56:35Z

## Sources of truth
1. `src/data/toolData.js` - authoritative mapping in `toolsByModality["PET"]` and `MODALITY_ASSIGNMENTS["PET"]`.
2. `utils/pet_tests/README.md` - PET test scope and covered tool context.
3. `utils/pet_tests/test_mri_gtmpvc.sh` - practical execution and expected inputs/outputs for PET test coverage.

## Tool Inventory
| Library | Subsection | Tool |
|---|---|---|
| FreeSurfer | PET Processing | mri_gtmpvc |

## Notes / Assumptions
- Source-of-truth currently defines one PET subsection and one PET tool.
- Single-subsection topology is represented with a directed self-loop to preserve directed subsection-to-tool expansion semantics.
