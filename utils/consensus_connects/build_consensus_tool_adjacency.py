#!/usr/bin/env python3
"""Build a consensus directed tool adjacency matrix from modality CSV matrices.

Consensus rule:
- consensus[src][dst] = 1 if any input matrix has src->dst = 1
- otherwise 0
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path
from typing import Iterable, List, Set, Tuple


DEFAULT_PATTERN = "*_tests/connects/*_tool_adjacency_matrix.csv"


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

    input_csvs = discover_input_csvs(search_root, args.pattern)

    all_tools: Set[str] = set()
    consensus_edges: Set[Tuple[str, str]] = set()

    for csv_path in input_csvs:
        tools, edges = load_edges_from_csv(csv_path)
        all_tools.update(tools)
        consensus_edges.update(edges)

    if not all_tools:
        raise ValueError("No tools found across input CSV files.")

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
