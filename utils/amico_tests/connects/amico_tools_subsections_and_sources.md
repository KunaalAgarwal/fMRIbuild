# Accelerated Microstructure Imaging via Convex Optimization Tools, Subsections, and Sources

## Scope
- Modality: amico
- Generated at: 2026-02-18T02:06:07Z

## Sources of truth
1. `src/data/toolData.js` - authoritative modality/library assignment in `toolsByModality` and `MODALITY_ASSIGNMENTS` (AMICO tools currently appear under `Diffusion MRI -> AMICO`).
2. `utils/amico_tests/README.md` - confirms test scope for AMICO NODDI.
3. `utils/amico_tests/test_amico_noddi.sh` - validates the concrete tool invocation and expected outputs for `amico_noddi`.

## Tool Inventory
| Library | Subsection | Tool |
|---|---|---|
| AMICO | Microstructure Modeling | amico_noddi |

## Notes / Assumptions
- Requested modality key is `amico`; in `src/data/toolData.js` this maps to the `AMICO` library within the `Diffusion MRI` modality group.
- Current source-of-truth includes one AMICO subsection (`AMICO / Microstructure Modeling`) and one tool (`amico_noddi`).
- Because subsection granularity is one-node, the subsection graph uses a directed self-loop to preserve directed subsection-to-tool expansion semantics.
