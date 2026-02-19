#!/usr/bin/env python3
"""Build a modality-separated consensus Mermaid subsection graph.

The script discovers all modality subsection graph files and combines them into
one Mermaid flowchart with one subgraph per modality.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple


DEFAULT_PATTERN = "*_tests/connects/*_subsection_graph.mmd"

NODE_RE = re.compile(r'^\s*([A-Za-z0-9_]+)\s*\["([^"]+)"\]\s*$')
EDGE_RE = re.compile(r"^\s*([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)\s*$")
COMMENT_MODALITY_RE = re.compile(
    r"^\s*%%\s*([A-Za-z0-9 _/&()+.-]+?)\s+subsection nodes\b", re.IGNORECASE
)


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    script_dir = Path(__file__).resolve().parent
    default_search_root = script_dir.parent
    parser = argparse.ArgumentParser(
        description=(
            "Combine all modality *_subsection_graph.mmd files into one Mermaid "
            "figure with modality-separated subgraphs."
        )
    )
    parser.add_argument(
        "--search-root",
        type=Path,
        default=default_search_root,
        help="Root directory to search for modality subsection graph files.",
    )
    parser.add_argument(
        "--pattern",
        default=DEFAULT_PATTERN,
        help="Glob pattern (relative to --search-root) for input .mmd files.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=script_dir / "consensus_subsection_graph.mmd",
        help="Output path for the combined Mermaid graph.",
    )
    return parser.parse_args(list(argv))


def derive_modality_key(path: Path) -> str:
    stem = path.stem
    suffix = "_subsection_graph"
    if stem.endswith(suffix):
        return stem[: -len(suffix)]

    for part in path.parts:
        if part.endswith("_tests"):
            return part[: -len("_tests")]
    raise ValueError(f"Could not derive modality key from path: {path}")


def modality_label_fallback(modality_key: str) -> str:
    words = modality_key.replace("_", " ").strip()
    if not words:
        return modality_key
    if len(words) <= 4:
        return words.upper()
    return words.title()


def safe_id(text: str) -> str:
    return re.sub(r"[^A-Za-z0-9_]", "_", text)


def discover_graph_files(search_root: Path, pattern: str) -> List[Path]:
    files = sorted(path.resolve() for path in search_root.glob(pattern) if path.is_file())
    if not files:
        raise FileNotFoundError(
            f"No subsection graph files found under {search_root} with pattern '{pattern}'."
        )
    return files


def parse_modality_graph(path: Path) -> Dict[str, object]:
    lines = path.read_text(encoding="utf-8").splitlines()

    node_labels_by_id: Dict[str, str] = {}
    node_order: List[str] = []
    edges: List[Tuple[str, str]] = []
    modality_label_from_comment = None

    for line_num, line in enumerate(lines, start=1):
        if modality_label_from_comment is None:
            comment_match = COMMENT_MODALITY_RE.match(line)
            if comment_match:
                modality_label_from_comment = comment_match.group(1).strip()

        node_match = NODE_RE.match(line)
        if node_match:
            node_id, node_label = node_match.groups()
            prior = node_labels_by_id.get(node_id)
            if prior is not None and prior != node_label:
                raise ValueError(
                    f"Conflicting label for node '{node_id}' in {path}:{line_num}: "
                    f"'{prior}' vs '{node_label}'."
                )
            if prior is None:
                node_order.append(node_id)
            node_labels_by_id[node_id] = node_label
            continue

        edge_match = EDGE_RE.match(line)
        if edge_match:
            edges.append((edge_match.group(1), edge_match.group(2)))

    if not node_order:
        raise ValueError(f"No subsection nodes parsed from {path}")

    missing_refs = sorted(
        (src, dst)
        for src, dst in edges
        if src not in node_labels_by_id or dst not in node_labels_by_id
    )
    if missing_refs:
        joined = ", ".join(f"{src}->{dst}" for src, dst in missing_refs)
        raise ValueError(f"Edge references undefined node ID(s) in {path}: {joined}")

    modality_key = derive_modality_key(path)

    mapping_path = path.with_name(f"{modality_key}_tool_to_subsection_map.json")
    modality_label_from_mapping = None
    if mapping_path.exists():
        try:
            payload = json.loads(mapping_path.read_text(encoding="utf-8"))
            if isinstance(payload, dict):
                value = payload.get("modality")
                if isinstance(value, str) and value.strip():
                    modality_label_from_mapping = value.strip()
        except Exception:
            # Non-fatal: fall back to comment-derived or key-derived label.
            modality_label_from_mapping = None

    modality_label = (
        modality_label_from_mapping
        or modality_label_from_comment
        or modality_label_fallback(modality_key)
    )

    return {
        "path": path,
        "modality_key": modality_key,
        "modality_label": modality_label,
        "node_order": node_order,
        "node_labels_by_id": node_labels_by_id,
        "edges": edges,
    }


def chunked(items: Sequence[str], size: int) -> List[List[str]]:
    return [list(items[i : i + size]) for i in range(0, len(items), size)]


def build_mermaid(modality_graphs: List[Dict[str, object]]) -> str:
    timestamp = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    header = (
        "%%{init: {'theme':'base', 'flowchart': {'curve': 'linear', 'nodeSpacing': 20, "
        "'rankSpacing': 36, 'diagramPadding': 12}, 'themeVariables': {'fontFamily': "
        "'Helvetica, Arial, sans-serif', 'fontSize': '13px', 'lineColor': '#334155', "
        "'primaryTextColor': '#0f172a', 'primaryBorderColor': '#475569', "
        "'clusterBorder': '#334155', 'clusterBkg': '#f8fafc'}}}%%"
    )

    palette = [
        ("#eff6ff", "#1d4ed8"),
        ("#f0fdf4", "#15803d"),
        ("#fefce8", "#a16207"),
        ("#fdf2f8", "#be185d"),
        ("#f5f3ff", "#6d28d9"),
        ("#ecfeff", "#0e7490"),
        ("#fff7ed", "#c2410c"),
        ("#f8fafc", "#334155"),
        ("#fef2f2", "#b91c1c"),
    ]

    lines: List[str] = []
    lines.append(f"%% Auto-generated by build_consensus_subsection_graph.py at {timestamp}")
    lines.append("%% Combined modality subsection graphs (kept separate by modality).")
    lines.append(header)
    lines.append("flowchart TB")
    lines.append("")
    lines.append("  %% Default styling for nodes and edges")
    lines.append("  classDef subsectionNode fill:#ffffff,stroke:#334155,stroke-width:1.2px,color:#0f172a;")
    lines.append("  linkStyle default stroke:#475569,stroke-width:1.4px,opacity:0.85;")
    lines.append("")

    all_prefixed_nodes: List[str] = []

    for idx, graph in enumerate(modality_graphs):
        modality_key = str(graph["modality_key"])
        modality_label = str(graph["modality_label"])
        node_order = list(graph["node_order"])  # type: ignore[arg-type]
        node_labels_by_id = dict(graph["node_labels_by_id"])  # type: ignore[arg-type]
        edges = list(graph["edges"])  # type: ignore[arg-type]

        group_id = f"MOD_{safe_id(modality_key).upper()}"
        node_prefix = safe_id(modality_key).upper()
        fill, stroke = palette[idx % len(palette)]

        lines.append(f'  subgraph {group_id}["{modality_label}"]')
        lines.append("    direction TB")

        prefixed_nodes: List[str] = []
        for node_id in node_order:
            prefixed = f"{node_prefix}__{node_id}"
            label = node_labels_by_id[node_id]
            lines.append(f'    {prefixed}["{label}"]')
            prefixed_nodes.append(prefixed)
            all_prefixed_nodes.append(prefixed)

        if edges:
            lines.append("")
            for src, dst in edges:
                lines.append(f"    {node_prefix}__{src} --> {node_prefix}__{dst}")

        lines.append("  end")
        lines.append(f"  style {group_id} fill:{fill},stroke:{stroke},stroke-width:2.2px,color:#0f172a;")
        lines.append("")

    if all_prefixed_nodes:
        lines.append("")
        lines.append("  %% Apply node class to all subsection nodes")
        for chunk in chunked(all_prefixed_nodes, 20):
            lines.append(f"  class {','.join(chunk)} subsectionNode;")

    return "\n".join(lines) + "\n"


def main(argv: Iterable[str]) -> int:
    args = parse_args(argv)
    search_root = args.search_root.resolve()
    out_path = args.out.resolve()

    graph_paths = discover_graph_files(search_root, args.pattern)
    parsed_graphs = [parse_modality_graph(path) for path in graph_paths]
    parsed_graphs.sort(key=lambda item: str(item["modality_key"]))

    mermaid = build_mermaid(parsed_graphs)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(mermaid, encoding="utf-8")

    total_nodes = sum(len(graph["node_order"]) for graph in parsed_graphs)  # type: ignore[arg-type]
    total_edges = sum(len(graph["edges"]) for graph in parsed_graphs)  # type: ignore[arg-type]

    print("Built consensus Mermaid subsection graph.")
    print(f"  source files: {len(parsed_graphs)}")
    print(f"  modalities: {len(parsed_graphs)}")
    print(f"  total subsection nodes: {total_nodes}")
    print(f"  total directed edges: {total_edges}")
    print(f"  output: {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
