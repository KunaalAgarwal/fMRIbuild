#!/usr/bin/env python3
"""Build a directed tool-to-tool adjacency matrix for Utilities tools.

Inputs:
- Mermaid subsection graph (.mmd) with node labels and directed edges
- Tool mapping JSON containing byTool -> subsectionKey

Outputs:
- JSON adjacency artifact
- CSV adjacency matrix
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Set, Tuple


NODE_RE = re.compile(r'^\s*([A-Za-z0-9_]+)\s*\["([^"]+)"\]\s*$')
EDGE_RE = re.compile(r"^\s*([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)\s*$")


def _collapse_ws(text: str) -> str:
    return " ".join(text.strip().split())


def _normalize_component(text: str, normalize_separators: bool) -> str:
    value = text.lower()
    value = value.replace("&", " and ")
    if normalize_separators:
        value = re.sub(r"[-/]+", " ", value)
    else:
        value = re.sub(r"-+", " ", value)
    return _collapse_ws(value)


def canonicalize_subsection_label(label: str) -> str:
    """Canonicalize subsection labels from graph and mapping JSON.

    Normalization rules:
    - lowercase
    - trim/collapse whitespace
    - normalize '&' to 'and'
    - treat '-' and '/' equivalently in subsection portion
    """
    raw = _collapse_ws(label.replace("&", " and "))
    parts = re.split(r"\s*/\s*", raw, maxsplit=1)
    if len(parts) == 2:
        library, subsection = parts
        library_norm = _normalize_component(library, normalize_separators=False)
        subsection_norm = _normalize_component(subsection, normalize_separators=True)
        return f"{library_norm} / {subsection_norm}"
    return _normalize_component(raw, normalize_separators=True)


def parse_mermaid_graph(
    graph_path: Path,
) -> Tuple[Dict[str, str], Set[Tuple[str, str]], Set[Tuple[str, str]]]:
    if not graph_path.exists():
        raise FileNotFoundError(f"Graph file not found: {graph_path}")

    node_id_to_label: Dict[str, str] = {}
    directed_edges_by_id: Set[Tuple[str, str]] = set()

    for lineno, line in enumerate(graph_path.read_text(encoding="utf-8").splitlines(), start=1):
        node_match = NODE_RE.match(line)
        if node_match:
            node_id, label = node_match.groups()
            existing = node_id_to_label.get(node_id)
            if existing is not None and existing != label:
                raise ValueError(
                    f"Conflicting node label for ID '{node_id}' in {graph_path}:{lineno}: "
                    f"'{existing}' vs '{label}'"
                )
            node_id_to_label[node_id] = label
            continue

        edge_match = EDGE_RE.match(line)
        if edge_match:
            src_id, dst_id = edge_match.groups()
            directed_edges_by_id.add((src_id, dst_id))

    if not node_id_to_label:
        raise ValueError(f"No Mermaid nodes found in graph file: {graph_path}")
    if not directed_edges_by_id:
        raise ValueError(f"No Mermaid directed edges found in graph file: {graph_path}")

    missing_node_refs = [
        (src, dst)
        for src, dst in directed_edges_by_id
        if src not in node_id_to_label or dst not in node_id_to_label
    ]
    if missing_node_refs:
        raise ValueError(
            "Graph contains edges referencing undefined node IDs: "
            + ", ".join([f"{src}->{dst}" for src, dst in sorted(missing_node_refs)])
        )

    # Keep original label edges for reporting, plus canonicalized edges for matrix logic.
    label_edges_original: Set[Tuple[str, str]] = set()
    label_edges_canonical: Set[Tuple[str, str]] = set()
    for src_id, dst_id in directed_edges_by_id:
        src_label = node_id_to_label[src_id]
        dst_label = node_id_to_label[dst_id]
        label_edges_original.add((src_label, dst_label))
        label_edges_canonical.add(
            (canonicalize_subsection_label(src_label), canonicalize_subsection_label(dst_label))
        )

    return node_id_to_label, label_edges_original, label_edges_canonical


def load_tool_mapping(mapping_path: Path) -> Tuple[Dict[str, str], Dict[str, str]]:
    if not mapping_path.exists():
        raise FileNotFoundError(f"Mapping file not found: {mapping_path}")

    try:
        payload = json.loads(mapping_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in mapping file {mapping_path}: {exc}") from exc

    by_tool = payload.get("byTool")
    if not isinstance(by_tool, dict):
        raise ValueError(
            f"Mapping file {mapping_path} must contain object field 'byTool' with tool mappings."
        )
    if not by_tool:
        raise ValueError(f"Mapping file {mapping_path} has empty 'byTool' mapping.")

    tool_to_subsection_original: Dict[str, str] = {}
    tool_to_subsection_canonical: Dict[str, str] = {}
    for tool_name, tool_meta in by_tool.items():
        if not isinstance(tool_meta, dict):
            raise ValueError(f"Tool mapping for '{tool_name}' must be an object.")
        subsection = tool_meta.get("subsectionKey")
        if not isinstance(subsection, str) or not subsection.strip():
            raise ValueError(
                f"Tool mapping for '{tool_name}' must include non-empty string 'subsectionKey'."
            )
        tool_to_subsection_original[tool_name] = subsection
        tool_to_subsection_canonical[tool_name] = canonicalize_subsection_label(subsection)

    return tool_to_subsection_original, tool_to_subsection_canonical


def build_matrix(
    tool_order: List[str],
    tool_to_subsection_canonical: Dict[str, str],
    subsection_edges_canonical: Set[Tuple[str, str]],
) -> List[List[int]]:
    matrix: List[List[int]] = []
    for src_tool in tool_order:
        src_subsection = tool_to_subsection_canonical[src_tool]
        row: List[int] = []
        for dst_tool in tool_order:
            dst_subsection = tool_to_subsection_canonical[dst_tool]
            row.append(1 if (src_subsection, dst_subsection) in subsection_edges_canonical else 0)
        matrix.append(row)
    return matrix


def write_csv_matrix(csv_path: Path, tool_order: List[str], matrix: List[List[int]]) -> None:
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["tool", *tool_order])
        for tool_name, row in zip(tool_order, matrix):
            writer.writerow([tool_name, *row])


def _warn_unmapped_graph_subsections(
    graph_labels_by_id: Dict[str, str], tool_subsections_canonical: Set[str]
) -> None:
    graph_subsections_canonical = {canonicalize_subsection_label(label) for label in graph_labels_by_id.values()}
    graph_only = sorted(graph_subsections_canonical - tool_subsections_canonical)
    if graph_only:
        print(
            "WARN: graph contains subsection nodes with no mapped tools: "
            + ", ".join(graph_only),
            file=sys.stderr,
        )


def _validate_mapping_subsections_covered(
    graph_labels_by_id: Dict[str, str], tool_to_subsection_canonical: Dict[str, str]
) -> None:
    graph_subsections_canonical = {canonicalize_subsection_label(label) for label in graph_labels_by_id.values()}
    mapping_subsections_canonical = sorted(set(tool_to_subsection_canonical.values()))
    missing = [sub for sub in mapping_subsections_canonical if sub not in graph_subsections_canonical]
    if missing:
        raise ValueError(
            "Mapped subsection labels not found in graph after normalization: "
            + ", ".join(missing)
        )


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    script_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description=(
            "Build directed Utilities tool adjacency matrix from subsection graph and tool mapping JSON."
        )
    )
    parser.add_argument(
        "--graph",
        type=Path,
        default=script_dir / "utils_subsection_graph.mmd",
        help="Path to Mermaid subsection graph (.mmd).",
    )
    parser.add_argument(
        "--mapping",
        type=Path,
        default=script_dir / "utils_tool_to_subsection_map.json",
        help="Path to tool mapping JSON (must include byTool).",
    )
    parser.add_argument(
        "--out-json",
        type=Path,
        default=script_dir / "utils_tool_adjacency_matrix.json",
        help="Output path for JSON matrix artifact.",
    )
    parser.add_argument(
        "--out-csv",
        type=Path,
        default=script_dir / "utils_tool_adjacency_matrix.csv",
        help="Output path for CSV matrix artifact.",
    )
    return parser.parse_args(list(argv))


def main(argv: Iterable[str]) -> int:
    args = parse_args(argv)
    graph_path = args.graph.resolve()
    mapping_path = args.mapping.resolve()
    out_json_path = args.out_json.resolve()
    out_csv_path = args.out_csv.resolve()

    node_id_to_label, subsection_edges_original, subsection_edges_canonical = parse_mermaid_graph(graph_path)
    tool_to_subsection_original, tool_to_subsection_canonical = load_tool_mapping(mapping_path)

    _validate_mapping_subsections_covered(node_id_to_label, tool_to_subsection_canonical)
    _warn_unmapped_graph_subsections(node_id_to_label, set(tool_to_subsection_canonical.values()))

    tool_order = sorted(tool_to_subsection_canonical.keys())
    if not tool_order:
        raise ValueError("No tools found in mapping file after parsing.")

    tool_to_index = {tool_name: idx for idx, tool_name in enumerate(tool_order)}
    matrix = build_matrix(tool_order, tool_to_subsection_canonical, subsection_edges_canonical)
    edge_count = sum(sum(row) for row in matrix)

    # Sorted for deterministic artifact diffs.
    subsection_edges_for_output = [
        {"source": src, "target": dst}
        for src, dst in sorted(
            (canonicalize_subsection_label(s), canonicalize_subsection_label(d))
            for s, d in subsection_edges_original
        )
    ]

    payload = {
        "generatedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "sources": {
            "graph": str(graph_path),
            "mapping": str(mapping_path),
        },
        "toolOrder": tool_order,
        "toolToIndex": tool_to_index,
        "subsectionByTool": {
            tool_name: tool_to_subsection_canonical[tool_name] for tool_name in tool_order
        },
        "subsectionByToolOriginal": {
            tool_name: tool_to_subsection_original[tool_name] for tool_name in tool_order
        },
        "subsectionEdges": subsection_edges_for_output,
        "matrix": matrix,
        "edgeCount": edge_count,
        "toolCount": len(tool_order),
        "normalization": {
            "canonicalLabelFormat": "library / subsection",
            "rules": [
                "lowercase",
                "trim and collapse whitespace",
                "normalize '&' to 'and'",
                "treat '-' and '/' equivalently in subsection text",
            ],
        },
    }

    out_json_path.parent.mkdir(parents=True, exist_ok=True)
    out_json_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    write_csv_matrix(out_csv_path, tool_order, matrix)

    print("Built directed tool adjacency matrix.")
    print(f"  tools: {len(tool_order)}")
    print(f"  subsection nodes: {len(node_id_to_label)}")
    print(f"  subsection directed edges: {len(subsection_edges_canonical)}")
    print(f"  tool directed edges (matrix 1s): {edge_count}")
    print(f"  json: {out_json_path}")
    print(f"  csv:  {out_csv_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except Exception as exc:  # noqa: BLE001 - CLI error reporting
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
