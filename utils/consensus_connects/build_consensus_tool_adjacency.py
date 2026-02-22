#!/usr/bin/env python3
"""Build a consensus directed tool adjacency matrix from modality CSV matrices.

Consensus rule:
- consensus[src][dst] = 1 if any input matrix has src->dst = 1
- otherwise 0

Cross-modality edges (optional):
- Reads a JSON file defining subsection-level edges between modalities.
- Expands each edge to tool-level using per-modality tool_to_subsection_map.json files.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple


DEFAULT_PATTERN = "*_tests/connects/*_tool_adjacency_matrix.csv"
DEFAULT_MAP_PATTERN = "*_tests/connects/*_tool_to_subsection_map.json"


def _normalize_subsection(label: str) -> str:
    """Normalize subsection labels for matching (lowercase, collapse whitespace,
    normalize '&' to 'and', treat '-' and '/' equivalently in subsection text)."""
    raw = " ".join(label.strip().split()).replace("&", " and ")
    parts = re.split(r"\s*/\s*", raw, maxsplit=1)
    if len(parts) == 2:
        library = re.sub(r"-+", " ", parts[0].lower()).strip()
        subsection = re.sub(r"[-/]+", " ", parts[1].lower()).strip()
        return f"{' '.join(library.split())} / {' '.join(subsection.split())}"
    return " ".join(re.sub(r"[-/]+", " ", raw.lower()).split())


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    script_dir = Path(__file__).resolve().parent
    default_search_root = script_dir.parent
    parser = argparse.ArgumentParser(
        description=(
            "Generate a consensus directed tool adjacency matrix by OR-ing all "
            "modality adjacency CSVs under utils/*_tests/connects."
        )
    )
    parser.add_argument(
        "--search-root",
        type=Path,
        default=default_search_root,
        help="Root folder to search for adjacency CSV files.",
    )
    parser.add_argument(
        "--pattern",
        default=DEFAULT_PATTERN,
        help="Glob pattern (relative to --search-root) for input adjacency CSVs.",
    )
    parser.add_argument(
        "--cross-modality",
        type=Path,
        default=None,
        help="Path to cross-modality subsection edges JSON file.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=script_dir / "consensus_tool_adjacency_matrix.csv",
        help="Output CSV path for the consensus adjacency matrix.",
    )
    return parser.parse_args(list(argv))


def _parse_binary_cell(value: str, csv_path: Path, row: int, col: int) -> int:
    raw = value.strip()
    if raw == "":
        return 0
    if raw in {"0", "1"}:
        return int(raw)
    raise ValueError(
        f"Expected 0/1 cell in {csv_path}:{row}:{col}, got '{value}'."
    )


def load_edges_from_csv(csv_path: Path) -> Tuple[Set[str], Set[Tuple[str, str]]]:
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        rows = list(csv.reader(handle))

    if len(rows) < 2:
        raise ValueError(f"CSV has no matrix rows: {csv_path}")

    header = rows[0]
    if len(header) < 2:
        raise ValueError(f"CSV header must include at least one tool: {csv_path}")

    col_tools = [item.strip() for item in header[1:]]
    if any(not tool for tool in col_tools):
        raise ValueError(f"CSV header contains empty tool name: {csv_path}")
    if len(set(col_tools)) != len(col_tools):
        raise ValueError(f"CSV header contains duplicate tool names: {csv_path}")

    row_tools: List[str] = []
    edges: Set[Tuple[str, str]] = set()

    expected_width = len(col_tools) + 1
    for row_num, row in enumerate(rows[1:], start=2):
        if not row or all(cell.strip() == "" for cell in row):
            continue

        if len(row) != expected_width:
            raise ValueError(
                f"Row width mismatch in {csv_path}:{row_num}. "
                f"Expected {expected_width}, got {len(row)}."
            )

        src_tool = row[0].strip()
        if not src_tool:
            raise ValueError(f"Missing row tool name in {csv_path}:{row_num}")
        row_tools.append(src_tool)

        for col_idx, cell in enumerate(row[1:], start=2):
            if _parse_binary_cell(cell, csv_path, row_num, col_idx) == 1:
                dst_tool = col_tools[col_idx - 2]
                edges.add((src_tool, dst_tool))

    row_tool_set = set(row_tools)
    col_tool_set = set(col_tools)
    if row_tool_set != col_tool_set:
        missing_rows = sorted(col_tool_set - row_tool_set)
        missing_cols = sorted(row_tool_set - col_tool_set)
        raise ValueError(
            f"CSV is not a square tool-by-tool matrix: {csv_path} "
            f"(missing rows: {missing_rows}; missing cols: {missing_cols})"
        )

    return col_tool_set, edges


def discover_input_csvs(search_root: Path, pattern: str) -> List[Path]:
    files = sorted(path.resolve() for path in search_root.glob(pattern) if path.is_file())
    if not files:
        raise FileNotFoundError(
            f"No input adjacency CSVs found under {search_root} with pattern '{pattern}'."
        )
    return files


def discover_subsection_maps(search_root: Path, pattern: str = DEFAULT_MAP_PATTERN) -> List[Path]:
    return sorted(path.resolve() for path in search_root.glob(pattern) if path.is_file())


def load_subsection_maps(
    search_root: Path,
) -> Dict[str, Dict[str, List[str]]]:
    """Load all per-modality tool_to_subsection_map.json files.

    Returns: { modality_name: { normalized_subsection_key: [tool1, tool2, ...] } }
    """
    map_files = discover_subsection_maps(search_root)
    modality_maps: Dict[str, Dict[str, List[str]]] = {}

    for map_path in map_files:
        try:
            data = json.loads(map_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            print(f"WARN: Could not read {map_path}: {exc}", file=sys.stderr)
            continue

        modality = data.get("modality", "")
        by_tool = data.get("byTool", {})
        if not modality or not by_tool:
            continue

        subsection_to_tools: Dict[str, List[str]] = {}
        for tool_name, tool_info in by_tool.items():
            subsection_key = tool_info.get("subsectionKey", "")
            if not subsection_key:
                continue
            normalized = _normalize_subsection(subsection_key)
            subsection_to_tools.setdefault(normalized, []).append(tool_name)

        modality_maps[modality] = subsection_to_tools

    return modality_maps


def expand_cross_modality_edges(
    cross_modality_path: Path,
    modality_maps: Dict[str, Dict[str, List[str]]],
) -> Tuple[Set[Tuple[str, str]], int, int]:
    """Read cross-modality JSON and expand subsection edges to tool-level edges.

    Returns: (tool_edges, num_subsection_edges_processed, num_subsection_edges_skipped)
    """
    data = json.loads(cross_modality_path.read_text(encoding="utf-8"))
    edges_def = data.get("edges", [])

    tool_edges: Set[Tuple[str, str]] = set()
    processed = 0
    skipped = 0

    for edge in edges_def:
        src_mod = edge.get("sourceModality", "")
        src_sub = _normalize_subsection(edge.get("sourceSubsection", ""))
        dst_mod = edge.get("targetModality", "")
        dst_sub = _normalize_subsection(edge.get("targetSubsection", ""))

        src_map = modality_maps.get(src_mod, {})
        dst_map = modality_maps.get(dst_mod, {})

        src_tools = src_map.get(src_sub, [])
        dst_tools = dst_map.get(dst_sub, [])

        if not src_tools or not dst_tools:
            skipped += 1
            rationale = edge.get("rationale", "")
            print(
                f"WARN: Cross-modality edge skipped (no tools found): "
                f"{src_mod}/{src_sub} -> {dst_mod}/{dst_sub} ({rationale})",
                file=sys.stderr,
            )
            continue

        processed += 1
        for src_tool in src_tools:
            for dst_tool in dst_tools:
                tool_edges.add((src_tool, dst_tool))

    return tool_edges, processed, skipped


def write_matrix_csv(out_path: Path, tool_order: List[str], edges: Set[Tuple[str, str]]) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["tool", *tool_order])
        for src in tool_order:
            row = [1 if (src, dst) in edges else 0 for dst in tool_order]
            writer.writerow([src, *row])


def main(argv: Iterable[str]) -> int:
    args = parse_args(argv)
    search_root = args.search_root.resolve()
    out_path = args.out.resolve()
    cross_modality_path: Optional[Path] = (
        args.cross_modality.resolve() if args.cross_modality else None
    )

    input_csvs = discover_input_csvs(search_root, args.pattern)

    all_tools: Set[str] = set()
    consensus_edges: Set[Tuple[str, str]] = set()

    for csv_path in input_csvs:
        tools, edges = load_edges_from_csv(csv_path)
        all_tools.update(tools)
        consensus_edges.update(edges)

    if not all_tools:
        raise ValueError("No tools found across input CSV files.")

    # Cross-modality edge expansion
    cross_modality_edge_count = 0
    if cross_modality_path is not None:
        if not cross_modality_path.exists():
            raise FileNotFoundError(
                f"Cross-modality edges file not found: {cross_modality_path}"
            )

        modality_maps = load_subsection_maps(search_root)
        xmod_edges, processed, skipped = expand_cross_modality_edges(
            cross_modality_path, modality_maps
        )
        cross_modality_edge_count = len(xmod_edges)
        consensus_edges.update(xmod_edges)
        # Include tools from cross-modality edges that may not be in any CSV
        for src, dst in xmod_edges:
            all_tools.add(src)
            all_tools.add(dst)

        print(f"  cross-modality: {processed} subsection edges -> {cross_modality_edge_count} tool edges ({skipped} skipped)")

    tool_order = sorted(all_tools)
    write_matrix_csv(out_path, tool_order, consensus_edges)

    print("Built consensus directed tool adjacency matrix.")
    print(f"  input CSVs: {len(input_csvs)}")
    print(f"  tools: {len(tool_order)}")
    print(f"  directed edges (1s): {len(consensus_edges)}")
    print(f"  output: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
