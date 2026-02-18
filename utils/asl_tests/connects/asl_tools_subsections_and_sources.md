# Arterial Spin Labeling Tools, Subsections, and Sources

## Scope
- Modality: asl
- Generated at: 2026-02-18T01:45:07Z

## Sources of truth
1. `src/data/toolData.js` - authoritative modality assignment in `toolsByModality["Arterial Spin Labeling"]` and `MODALITY_ASSIGNMENTS["Arterial Spin Labeling"]`.
2. `utils/asl_tests/README.md` - confirms the ASL test scope and expected tool list (`oxford_asl`, `basil`, `asl_calib`).
3. `utils/asl_tests/test_oxford_asl.sh`, `utils/asl_tests/test_basil.sh`, `utils/asl_tests/test_asl_calib.sh` - validates tool usage and practical pipeline dependency context.

## Tool Inventory
| Library | Subsection | Tool |
|---|---|---|
| FSL | ASL Processing | asl_calib |
| FSL | ASL Processing | basil |
| FSL | ASL Processing | oxford_asl |

## Notes / Assumptions
- `src/data/toolData.js` currently exposes a single ASL subsection (`FSL / ASL Processing`) for all three ASL tools.
- Because subsection granularity is one-node for ASL, the subsection graph uses a directed self-loop to enable subsection-to-tool edge expansion in the adjacency matrix.
