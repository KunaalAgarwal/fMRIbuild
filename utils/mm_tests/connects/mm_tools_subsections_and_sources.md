# Multimodal Tools, Subsections, and Sources

## Scope
- Modality: mm
- Generated at: 2026-02-18T02:33:50Z

## Sources of truth
1. `src/data/toolData.js` - authoritative assignment in `toolsByModality["Multimodal"]` and `MODALITY_ASSIGNMENTS["Multimodal"]`.
2. `utils/mm_tests/README.md` - confirms multimodal test scope and ANTs tool coverage.
3. `utils/mm_tests/test_*.sh` - validates practical execution patterns for the multimodal ANTs registration tool.

## Tool Inventory
| Library | Subsection | Tool |
|---|---|---|
| ANTs | Intermodal Registration | antsIntermodalityIntrasubject.sh |

## Notes / Assumptions
- Primary source (`toolData.js`) currently exposes one multimodal subsection (`ANTs / Intermodal Registration`) with one tool.
- Test scripts use `antsIntermodalityIntrasubject` while source-of-truth tool key is `antsIntermodalityIntrasubject.sh`; mapping remains faithful to `toolData.js`.
- With single-subsection topology, the subsection graph uses a directed self-loop to preserve directed subsection-to-tool expansion semantics.
