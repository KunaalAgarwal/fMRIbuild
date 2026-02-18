#!/usr/bin/env python3
"""Generate interactive network visualizations and clustering for fMRI tool adjacency."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
from collections import Counter, defaultdict, deque
from pathlib import Path
from typing import Dict, Iterable, List, Set, Tuple
from xml.sax.saxutils import escape as xml_escape


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    script_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description=(
            "Create interactive network visualizations for the fMRI tool adjacency matrix, "
            "including clustering outputs."
        )
    )
    parser.add_argument(
        "--adjacency-json",
        type=Path,
        default=script_dir / "fmri_tool_adjacency_matrix.json",
        help="Path to adjacency matrix JSON produced by build_fmri_tool_adjacency.py.",
    )
    parser.add_argument(
        "--mapping-json",
        type=Path,
        default=script_dir / "fmri_tool_to_subsection_map.json",
        help="Path to tool mapping JSON (expects byTool).",
    )
    parser.add_argument(
        "--out-html",
        type=Path,
        default=script_dir / "fmri_tool_network.html",
        help="Output path for interactive network HTML.",
    )
    parser.add_argument(
        "--out-clusters-json",
        type=Path,
        default=script_dir / "fmri_tool_network_clusters.json",
        help="Output path for cluster summary JSON.",
    )
    parser.add_argument(
        "--out-graphml",
        type=Path,
        default=script_dir / "fmri_tool_network.graphml",
        help="Output path for GraphML network export (for Gephi/Cytoscape/yEd).",
    )
    return parser.parse_args(list(argv))


def _require_path(path: Path, label: str) -> None:
    if not path.exists():
        raise FileNotFoundError(f"{label} not found: {path}")


def load_adjacency_json(path: Path) -> Tuple[List[str], List[List[int]], Dict[str, object]]:
    _require_path(path, "Adjacency JSON")
    payload = json.loads(path.read_text(encoding="utf-8"))

    tool_order = payload.get("toolOrder")
    matrix = payload.get("matrix")
    if not isinstance(tool_order, list) or not tool_order:
        raise ValueError(f"{path} must include non-empty list 'toolOrder'.")
    if not isinstance(matrix, list) or len(matrix) != len(tool_order):
        raise ValueError(f"{path} must include square 'matrix' matching toolOrder length.")

    tool_count = len(tool_order)
    for row_idx, row in enumerate(matrix, start=1):
        if not isinstance(row, list) or len(row) != tool_count:
            raise ValueError(
                f"Matrix row {row_idx} invalid: expected length {tool_count}, got {len(row)}."
            )
        bad = [cell for cell in row if cell not in (0, 1)]
        if bad:
            raise ValueError(f"Matrix row {row_idx} contains non-binary values: {bad}.")

    return tool_order, matrix, payload


def load_mapping_json(path: Path) -> Dict[str, Dict[str, str]]:
    _require_path(path, "Mapping JSON")
    payload = json.loads(path.read_text(encoding="utf-8"))
    by_tool = payload.get("byTool")
    if not isinstance(by_tool, dict):
        raise ValueError(f"{path} must include object field 'byTool'.")
    return by_tool


def _split_subsection_key(subsection_key: str) -> Tuple[str, str]:
    parts = [part.strip() for part in subsection_key.split("/", 1)]
    if len(parts) == 2:
        return parts[0] or "Unknown", parts[1] or "Unknown"
    return "Unknown", subsection_key.strip() or "Unknown"


def build_tool_metadata(
    tool_order: List[str], mapping_by_tool: Dict[str, Dict[str, str]], adjacency_payload: Dict[str, object]
) -> Dict[str, Dict[str, str]]:
    subsection_by_tool_original = adjacency_payload.get("subsectionByToolOriginal")
    if not isinstance(subsection_by_tool_original, dict):
        subsection_by_tool_original = {}

    metadata: Dict[str, Dict[str, str]] = {}
    missing: List[str] = []

    for tool in tool_order:
        entry = mapping_by_tool.get(tool)
        if isinstance(entry, dict):
            subsection_key = str(entry.get("subsectionKey", "")).strip()
            library = str(entry.get("library", "")).strip()
            subsection = str(entry.get("subsection", "")).strip()
            if not subsection_key and tool in subsection_by_tool_original:
                subsection_key = str(subsection_by_tool_original[tool]).strip()
            if not subsection_key:
                missing.append(tool)
                continue
            if not library or not subsection:
                lib_guess, sub_guess = _split_subsection_key(subsection_key)
                library = library or lib_guess
                subsection = subsection or sub_guess
            metadata[tool] = {
                "library": library,
                "subsection": subsection,
                "subsectionKey": subsection_key,
            }
            continue

        if tool in subsection_by_tool_original:
            subsection_key = str(subsection_by_tool_original[tool]).strip()
            library, subsection = _split_subsection_key(subsection_key)
            metadata[tool] = {
                "library": library,
                "subsection": subsection,
                "subsectionKey": subsection_key,
            }
            continue

        missing.append(tool)

    if missing:
        raise ValueError(
            "Missing mapping metadata for tools: " + ", ".join(sorted(missing))
        )
    return metadata


def build_edges(matrix: List[List[int]]) -> List[Tuple[int, int]]:
    edges: List[Tuple[int, int]] = []
    for src_idx, row in enumerate(matrix):
        for dst_idx, cell in enumerate(row):
            if cell == 1:
                edges.append((src_idx, dst_idx))
    return edges


def build_undirected_neighbors(tool_count: int, edges: List[Tuple[int, int]]) -> List[Set[int]]:
    neighbors = [set() for _ in range(tool_count)]
    for src, dst in edges:
        if src == dst:
            neighbors[src].add(dst)
            continue
        neighbors[src].add(dst)
        neighbors[dst].add(src)
    return neighbors


def compute_weak_components(neighbors: List[Set[int]]) -> List[List[int]]:
    visited = [False] * len(neighbors)
    components: List[List[int]] = []

    for start in range(len(neighbors)):
        if visited[start]:
            continue
        queue: deque[int] = deque([start])
        visited[start] = True
        component: List[int] = []
        while queue:
            node = queue.popleft()
            component.append(node)
            for nxt in sorted(neighbors[node]):
                if not visited[nxt]:
                    visited[nxt] = True
                    queue.append(nxt)
        components.append(sorted(component))

    components.sort(key=lambda comp: (-len(comp), comp[0] if comp else math.inf))
    return components


def compute_label_propagation_communities(
    neighbors: List[Set[int]], max_iters: int = 100
) -> List[int]:
    labels = list(range(len(neighbors)))
    order = sorted(range(len(neighbors)), key=lambda idx: (-len(neighbors[idx]), idx))

    for _ in range(max_iters):
        changed = False
        for node_idx in order:
            if not neighbors[node_idx]:
                continue
            counts: Counter[int] = Counter(labels[nbr] for nbr in neighbors[node_idx])
            # Bias toward current label to improve stability across updates.
            counts[labels[node_idx]] += 1
            max_count = max(counts.values())
            best_label = min(label for label, count in counts.items() if count == max_count)
            if best_label != labels[node_idx]:
                labels[node_idx] = best_label
                changed = True
        if not changed:
            break
    return labels


def build_named_grouping(
    tool_order: List[str], group_by_tool: Dict[str, str], sort_groups_by_size: bool
) -> Tuple[Dict[str, str], List[Dict[str, object]]]:
    grouped: Dict[str, List[str]] = defaultdict(list)
    for tool in tool_order:
        grouped[group_by_tool[tool]].append(tool)

    sortable = []
    for name, tools in grouped.items():
        sortable.append((name, sorted(tools)))

    if sort_groups_by_size:
        sortable.sort(key=lambda item: (-len(item[1]), item[0].lower(), item[0]))
    else:
        sortable.sort(key=lambda item: (item[0].lower(), item[0]))

    groups: List[Dict[str, object]] = []
    for name, tools in sortable:
        groups.append(
            {
                "name": name,
                "size": len(tools),
                "tools": tools,
            }
        )

    return group_by_tool, groups


def build_component_grouping(tool_order: List[str], components: List[List[int]]) -> Tuple[Dict[str, str], List[Dict[str, object]]]:
    by_tool: Dict[str, str] = {}
    groups: List[Dict[str, object]] = []

    for idx, component in enumerate(components, start=1):
        group_name = f"component_{idx:02d}"
        tools = [tool_order[i] for i in component]
        for tool in tools:
            by_tool[tool] = group_name
        groups.append(
            {
                "name": group_name,
                "size": len(tools),
                "tools": sorted(tools),
            }
        )
    return by_tool, groups


def build_community_grouping(
    tool_order: List[str], labels: List[int]
) -> Tuple[Dict[str, str], List[Dict[str, object]]]:
    communities_by_label: Dict[int, List[int]] = defaultdict(list)
    for idx, label in enumerate(labels):
        communities_by_label[label].append(idx)

    community_items = sorted(
        communities_by_label.items(),
        key=lambda item: (-len(item[1]), min(item[1])),
    )

    by_tool: Dict[str, str] = {}
    groups: List[Dict[str, object]] = []
    for community_idx, (_, node_indices) in enumerate(community_items, start=1):
        group_name = f"community_{community_idx:02d}"
        tools = sorted(tool_order[i] for i in node_indices)
        for tool in tools:
            by_tool[tool] = group_name
        groups.append(
            {
                "name": group_name,
                "size": len(tools),
                "tools": tools,
            }
        )
    return by_tool, groups


def build_cluster_payload(
    tool_order: List[str],
    matrix: List[List[int]],
    edges: List[Tuple[int, int]],
    metadata_by_tool: Dict[str, Dict[str, str]],
    adjacency_source: Path,
    mapping_source: Path,
) -> Tuple[Dict[str, object], Dict[str, object]]:
    indegree = [0] * len(tool_order)
    outdegree = [0] * len(tool_order)
    for src, dst in edges:
        outdegree[src] += 1
        indegree[dst] += 1

    subsection_by_tool = {
        tool: metadata_by_tool[tool]["subsectionKey"] for tool in tool_order
    }
    library_by_tool = {tool: metadata_by_tool[tool]["library"] for tool in tool_order}

    subsection_map, subsection_groups = build_named_grouping(
        tool_order, subsection_by_tool, sort_groups_by_size=True
    )
    library_map, library_groups = build_named_grouping(
        tool_order, library_by_tool, sort_groups_by_size=True
    )

    undirected_neighbors = build_undirected_neighbors(len(tool_order), edges)
    components = compute_weak_components(undirected_neighbors)
    weak_component_map, weak_component_groups = build_component_grouping(tool_order, components)

    lp_labels = compute_label_propagation_communities(undirected_neighbors)
    community_map, community_groups = build_community_grouping(tool_order, lp_labels)

    nodes: List[Dict[str, object]] = []
    for idx, tool in enumerate(tool_order):
        nodes.append(
            {
                "id": tool,
                "index": idx,
                "library": metadata_by_tool[tool]["library"],
                "subsection": metadata_by_tool[tool]["subsection"],
                "subsectionKey": metadata_by_tool[tool]["subsectionKey"],
                "inDegree": indegree[idx],
                "outDegree": outdegree[idx],
                "degree": indegree[idx] + outdegree[idx],
                "cluster": {
                    "subsection": subsection_map[tool],
                    "library": library_map[tool],
                    "weak_component": weak_component_map[tool],
                    "community": community_map[tool],
                },
            }
        )

    graph_payload = {
        "generatedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "sources": {
            "adjacencyJson": str(adjacency_source),
            "mappingJson": str(mapping_source),
        },
        "toolCount": len(tool_order),
        "edgeCount": len(edges),
        "nodes": nodes,
        "edges": [{"source": src, "target": dst} for src, dst in edges],
        "clusterings": {
            "subsection": {
                "label": "Subsection",
                "groupCount": len(subsection_groups),
                "groups": subsection_groups,
            },
            "library": {
                "label": "Library",
                "groupCount": len(library_groups),
                "groups": library_groups,
            },
            "weak_component": {
                "label": "Weakly Connected Component",
                "groupCount": len(weak_component_groups),
                "groups": weak_component_groups,
            },
            "community": {
                "label": "Connectivity Community (Label Propagation)",
                "groupCount": len(community_groups),
                "groups": community_groups,
            },
        },
    }

    cluster_summary_payload = {
        "generatedAt": graph_payload["generatedAt"],
        "sources": graph_payload["sources"],
        "toolCount": graph_payload["toolCount"],
        "edgeCount": graph_payload["edgeCount"],
        "clusterings": graph_payload["clusterings"],
        "byTool": {
            node["id"]: {
                "library": node["library"],
                "subsection": node["subsectionKey"],
                "clusters": node["cluster"],
                "inDegree": node["inDegree"],
                "outDegree": node["outDegree"],
            }
            for node in nodes
        },
        "matrixDimensions": {
            "rows": len(matrix),
            "cols": len(matrix[0]) if matrix else 0,
        },
    }

    return graph_payload, cluster_summary_payload


def render_network_html(graph_payload: Dict[str, object]) -> str:
    payload_json = json.dumps(graph_payload, ensure_ascii=False)
    return (
        """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>fMRI Tool Network</title>
  <style>
    :root {
      --bg: #f7fafc;
      --panel: #ffffff;
      --line: #d0d7de;
      --text: #1f2937;
      --muted: #4b5563;
      --edge: #9ca3af;
      --edge-active: #374151;
      --cluster-fill: rgba(148, 163, 184, 0.08);
      --cluster-stroke: rgba(71, 85, 105, 0.45);
      --focus: #f59e0b;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 14px;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    }

    h1 {
      margin: 0;
      font-size: 20px;
    }

    .meta {
      margin: 4px 0 12px;
      color: var(--muted);
      font-size: 13px;
    }

    .layout {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 12px;
      align-items: start;
    }

    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 16px;
      align-items: center;
      margin-bottom: 10px;
      font-size: 13px;
    }

    .controls label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .controls input[type="search"],
    .controls select {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 4px 8px;
      min-height: 30px;
      font-size: 13px;
      background: #fff;
      color: var(--text);
    }

    .controls button {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 5px 10px;
      background: #fff;
      color: var(--text);
      cursor: pointer;
      font-size: 13px;
    }

    .controls button:hover {
      background: #f3f4f6;
    }

    #network-wrap {
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
      height: calc(100vh - 180px);
      min-height: 680px;
    }

    svg {
      width: 100%;
      height: 100%;
      display: block;
      user-select: none;
    }

    .cluster-ring {
      fill: var(--cluster-fill);
      stroke: var(--cluster-stroke);
      stroke-dasharray: 5 4;
      stroke-width: 1.2;
    }

    .cluster-label {
      font-size: 11px;
      fill: #334155;
      pointer-events: none;
      text-anchor: middle;
    }

    .edge {
      stroke: var(--edge);
      stroke-width: 1.1;
      stroke-opacity: 0.62;
    }

    .edge.active {
      stroke: var(--edge-active);
      stroke-width: 2;
      stroke-opacity: 0.95;
    }

    .node {
      stroke: #0f172a;
      stroke-width: 0.6;
      cursor: pointer;
      opacity: 0.95;
    }

    .node.dimmed {
      opacity: 0.2;
    }

    .node.focused {
      stroke: var(--focus);
      stroke-width: 2;
    }

    .label {
      font-size: 10px;
      fill: #0f172a;
      paint-order: stroke;
      stroke: #ffffff;
      stroke-width: 2.5;
      stroke-linejoin: round;
      pointer-events: none;
    }

    .label.hidden {
      display: none;
    }

    .legend-title {
      font-weight: 700;
      margin: 0 0 8px;
      font-size: 13px;
    }

    #legend {
      max-height: 44vh;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 6px;
      background: #fff;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      margin: 4px 0;
      line-height: 1.3;
    }

    .swatch {
      width: 11px;
      height: 11px;
      border-radius: 3px;
      border: 1px solid rgba(0, 0, 0, 0.2);
      flex: 0 0 auto;
    }

    #details {
      margin-top: 10px;
      padding: 8px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      min-height: 110px;
      font-size: 12px;
      white-space: pre-line;
      color: #111827;
    }
  </style>
</head>
<body>
  <h1>fMRI Tool Network</h1>
  <p class="meta">
    Interactive directed network view with cluster modes.
    Hover nodes for details and neighborhood highlighting.
  </p>

  <div class="layout">
    <div class="panel">
      <div class="controls">
        <label>
          Cluster mode
          <select id="cluster-mode">
            <option value="subsection">Subsection</option>
            <option value="library">Library</option>
            <option value="community">Connectivity community</option>
            <option value="weak_component">Weak component</option>
          </select>
        </label>
        <label><input id="show-labels" type="checkbox" checked> Show labels</label>
        <label><input id="show-edges" type="checkbox" checked> Show edges</label>
        <label>Search <input id="search" type="search" placeholder="tool name"></label>
        <button id="reset">Reset layout</button>
      </div>

      <div id="network-wrap">
        <svg id="network" viewBox="0 0 1600 980" aria-label="fMRI tool network graph">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b98a8"></path>
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155"></path>
            </marker>
          </defs>
          <g id="cluster-layer"></g>
          <g id="edge-layer"></g>
          <g id="node-layer"></g>
          <g id="label-layer"></g>
        </svg>
      </div>
    </div>

    <aside class="panel">
      <p class="legend-title">Cluster Legend</p>
      <div id="legend"></div>
      <p class="legend-title" style="margin-top: 10px;">Tool Details</p>
      <div id="details">Hover a node to inspect tool metadata and neighbors.</div>
    </aside>
  </div>

  <script>
    const DATA = """
        + payload_json
        + """;

    const width = 1600;
    const height = 980;
    const basePadding = 70;
    const nodes = DATA.nodes.map((node) => ({
      ...node,
      x: width / 2,
      y: height / 2,
      vx: 0,
      vy: 0
    }));
    const edges = DATA.edges;

    const indexById = new Map(nodes.map((node, idx) => [node.id, idx]));
    const outNeighbors = Array.from({ length: nodes.length }, () => new Set());
    const inNeighbors = Array.from({ length: nodes.length }, () => new Set());
    edges.forEach((edge) => {
      outNeighbors[edge.source].add(edge.target);
      inNeighbors[edge.target].add(edge.source);
    });

    const state = {
      clusterMode: "subsection",
      showLabels: true,
      showEdges: true,
      search: "",
      hovered: null
    };

    const svg = document.getElementById("network");
    const clusterLayer = document.getElementById("cluster-layer");
    const edgeLayer = document.getElementById("edge-layer");
    const nodeLayer = document.getElementById("node-layer");
    const labelLayer = document.getElementById("label-layer");
    const legendEl = document.getElementById("legend");
    const detailsEl = document.getElementById("details");
    const clusterModeEl = document.getElementById("cluster-mode");
    const showLabelsEl = document.getElementById("show-labels");
    const showEdgesEl = document.getElementById("show-edges");
    const searchEl = document.getElementById("search");
    const resetEl = document.getElementById("reset");

    function colorForCluster(clusterIndex, total) {
      const hue = ((clusterIndex * 360) / Math.max(1, total) + 13) % 360;
      return `hsl(${hue} 62% 52%)`;
    }

    function hashString(value) {
      let hash = 2166136261;
      for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return Math.abs(hash >>> 0);
    }

    function jitterForNode(nodeId, axisSalt) {
      const seed = hashString(`${nodeId}:${axisSalt}`);
      return (seed % 1000) / 1000;
    }

    function nodeRadius(node) {
      return 5 + Math.min(8, Math.sqrt(node.degree || 0));
    }

    function getGroups(mode) {
      return DATA.clusterings[mode]?.groups || [];
    }

    function buildClusterColorMap(mode) {
      const groups = getGroups(mode);
      const map = new Map();
      groups.forEach((group, idx) => {
        map.set(group.name, colorForCluster(idx, groups.length));
      });
      return map;
    }

    function buildClusterCenters(mode) {
      const groups = getGroups(mode);
      const count = Math.max(1, groups.length);
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const xStep = (width - basePadding * 2) / Math.max(1, cols - 1);
      const yStep = (height - basePadding * 2) / Math.max(1, rows - 1);

      const centers = new Map();
      groups.forEach((group, idx) => {
        const col = cols === 1 ? 0 : idx % cols;
        const row = cols === 1 ? idx : Math.floor(idx / cols);
        const x = cols === 1 ? width / 2 : basePadding + col * xStep;
        const y = rows === 1 ? height / 2 : basePadding + row * yStep;
        const radius = Math.max(70, 34 + Math.sqrt(group.size || 1) * 24);
        centers.set(group.name, { x, y, radius, name: group.name, size: group.size || 0 });
      });
      return centers;
    }

    function resetNodePositions() {
      const centers = buildClusterCenters(state.clusterMode);
      nodes.forEach((node) => {
        const cluster = node.cluster[state.clusterMode];
        const center = centers.get(cluster) || { x: width / 2, y: height / 2, radius: 120 };
        const angle = jitterForNode(node.id, "angle") * Math.PI * 2;
        const radius = (0.12 + 0.8 * jitterForNode(node.id, "radius")) * center.radius;
        node.x = center.x + Math.cos(angle) * radius;
        node.y = center.y + Math.sin(angle) * radius;
        node.vx = 0;
        node.vy = 0;
      });
    }

    function buildEdgeElements() {
      edgeLayer.innerHTML = "";
      return edges.map((edge) => {
        const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
        el.setAttribute("class", "edge");
        el.setAttribute("marker-end", "url(#arrow)");
        edgeLayer.appendChild(el);
        return el;
      });
    }

    function buildNodeElements() {
      nodeLayer.innerHTML = "";
      labelLayer.innerHTML = "";

      const nodeEls = [];
      const labelEls = [];
      nodes.forEach((node, idx) => {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("class", "node");
        circle.setAttribute("r", String(nodeRadius(node)));
        circle.dataset.index = String(idx);
        circle.addEventListener("mouseenter", () => {
          state.hovered = idx;
          updateDetailsPanel(idx);
        });
        circle.addEventListener("mouseleave", () => {
          state.hovered = null;
          updateDetailsPanel(null);
        });
        nodeLayer.appendChild(circle);
        nodeEls.push(circle);

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("class", "label");
        label.textContent = node.id;
        labelLayer.appendChild(label);
        labelEls.push(label);
      });

      return { nodeEls, labelEls };
    }

    function drawClusterLayer(mode, clusterColors) {
      const centers = buildClusterCenters(mode);
      clusterLayer.innerHTML = "";
      centers.forEach((center, name) => {
        const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ring.setAttribute("class", "cluster-ring");
        ring.setAttribute("cx", String(center.x));
        ring.setAttribute("cy", String(center.y));
        ring.setAttribute("r", String(center.radius));
        const color = clusterColors.get(name) || "#64748b";
        ring.setAttribute("stroke", color);
        clusterLayer.appendChild(ring);

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("class", "cluster-label");
        label.setAttribute("x", String(center.x));
        label.setAttribute("y", String(center.y - center.radius - 10));
        label.textContent = `${name} (${center.size})`;
        clusterLayer.appendChild(label);
      });
    }

    function updateLegend(mode, clusterColors) {
      const groups = getGroups(mode);
      const label = DATA.clusterings[mode]?.label || mode;
      const items = groups.map((group) => {
        const color = clusterColors.get(group.name) || "#64748b";
        const safeName = group.name
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        return `<div class="legend-item"><span class="swatch" style="background:${color}"></span><span>${safeName} (${group.size})</span></div>`;
      }).join("");
      legendEl.innerHTML = `<div style="font-size:12px;color:#4b5563;margin-bottom:6px;">${label}</div>${items || "<div class='legend-item'>No groups</div>"}`;
    }

    function updateDetailsPanel(nodeIndex) {
      if (nodeIndex === null || nodeIndex === undefined) {
        detailsEl.textContent = "Hover a node to inspect tool metadata and neighbors.";
        return;
      }
      const node = nodes[nodeIndex];
      const outgoing = Array.from(outNeighbors[nodeIndex]).map((idx) => nodes[idx].id).sort();
      const incoming = Array.from(inNeighbors[nodeIndex]).map((idx) => nodes[idx].id).sort();
      detailsEl.textContent = [
        `Tool: ${node.id}`,
        `Library: ${node.library}`,
        `Subsection: ${node.subsectionKey}`,
        `Out-degree: ${node.outDegree}`,
        `In-degree: ${node.inDegree}`,
        `Cluster (${DATA.clusterings[state.clusterMode]?.label || state.clusterMode}): ${node.cluster[state.clusterMode]}`,
        "",
        `Outgoing (${outgoing.length}): ${outgoing.join(", ") || "none"}`,
        "",
        `Incoming (${incoming.length}): ${incoming.join(", ") || "none"}`
      ].join("\\n");
    }

    function applyForces(clusterCenters) {
      const repulsion = 2400;
      const springK = 0.028;
      const desiredEdgeLength = 90;
      const pullToCluster = 0.016;
      const centerPull = 0.0014;

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist2 = dx * dx + dy * dy + 0.01;
          const dist = Math.sqrt(dist2);
          const force = repulsion / dist2;
          const fx = (force * dx) / dist;
          const fy = (force * dy) / dist;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      edges.forEach((edge) => {
        const src = nodes[edge.source];
        const dst = nodes[edge.target];
        const dx = dst.x - src.x;
        const dy = dst.y - src.y;
        const dist = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
        const displacement = dist - desiredEdgeLength;
        const force = springK * displacement;
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;
        src.vx += fx;
        src.vy += fy;
        dst.vx -= fx;
        dst.vy -= fy;
      });

      nodes.forEach((node) => {
        const cluster = node.cluster[state.clusterMode];
        const center = clusterCenters.get(cluster) || { x: width / 2, y: height / 2 };
        node.vx += (center.x - node.x) * pullToCluster;
        node.vy += (center.y - node.y) * pullToCluster;
        node.vx += (width / 2 - node.x) * centerPull;
        node.vy += (height / 2 - node.y) * centerPull;

        node.vx *= 0.84;
        node.vy *= 0.84;

        const maxSpeed = 10;
        node.vx = Math.max(-maxSpeed, Math.min(maxSpeed, node.vx));
        node.vy = Math.max(-maxSpeed, Math.min(maxSpeed, node.vy));

        node.x = Math.max(18, Math.min(width - 18, node.x + node.vx));
        node.y = Math.max(18, Math.min(height - 18, node.y + node.vy));
      });
    }

    function buildSearchSet() {
      const needle = state.search.trim().toLowerCase();
      if (!needle) {
        return new Set();
      }
      return new Set(
        nodes
          .map((node, idx) => ({ node, idx }))
          .filter(({ node }) => node.id.toLowerCase().includes(needle))
          .map(({ idx }) => idx)
      );
    }

    function drawFrame(nodeEls, labelEls, edgeEls, clusterColors, clusterCenters) {
      const searchHits = buildSearchSet();
      const hovered = state.hovered;
      const activeNeighbors = new Set();
      if (hovered !== null && hovered !== undefined) {
        activeNeighbors.add(hovered);
        outNeighbors[hovered].forEach((idx) => activeNeighbors.add(idx));
        inNeighbors[hovered].forEach((idx) => activeNeighbors.add(idx));
      }

      edgeEls.forEach((el, idx) => {
        const edge = edges[idx];
        const src = nodes[edge.source];
        const dst = nodes[edge.target];
        const dx = dst.x - src.x;
        const dy = dst.y - src.y;
        const dist = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
        const srcPad = nodeRadius(src) + 1;
        const dstPad = nodeRadius(dst) + 3;
        const x1 = src.x + (dx / dist) * srcPad;
        const y1 = src.y + (dy / dist) * srcPad;
        const x2 = dst.x - (dx / dist) * dstPad;
        const y2 = dst.y - (dy / dist) * dstPad;

        el.setAttribute("x1", String(x1));
        el.setAttribute("y1", String(y1));
        el.setAttribute("x2", String(x2));
        el.setAttribute("y2", String(y2));

        const isActive = hovered !== null && hovered !== undefined &&
          (edge.source === hovered || edge.target === hovered);
        el.setAttribute("class", isActive ? "edge active" : "edge");
        el.setAttribute("marker-end", isActive ? "url(#arrow-active)" : "url(#arrow)");
        el.style.display = state.showEdges ? "block" : "none";
      });

      nodes.forEach((node, idx) => {
        const nodeEl = nodeEls[idx];
        const labelEl = labelEls[idx];
        const clusterName = node.cluster[state.clusterMode];
        const color = clusterColors.get(clusterName) || "#334155";

        nodeEl.setAttribute("cx", String(node.x));
        nodeEl.setAttribute("cy", String(node.y));
        nodeEl.setAttribute("fill", color);

        labelEl.setAttribute("x", String(node.x + 8));
        labelEl.setAttribute("y", String(node.y - 8));
        labelEl.setAttribute("class", state.showLabels ? "label" : "label hidden");

        const hoveredActive = hovered !== null && hovered !== undefined;
        const shouldDim = hoveredActive && !activeNeighbors.has(idx);
        const isFocused = (hoveredActive && idx === hovered) || searchHits.has(idx);
        nodeEl.classList.toggle("dimmed", shouldDim);
        nodeEl.classList.toggle("focused", isFocused);
      });
    }

    const edgeEls = buildEdgeElements();
    const { nodeEls, labelEls } = buildNodeElements();

    let clusterColors = buildClusterColorMap(state.clusterMode);
    let clusterCenters = buildClusterCenters(state.clusterMode);
    drawClusterLayer(state.clusterMode, clusterColors);
    updateLegend(state.clusterMode, clusterColors);
    resetNodePositions();
    updateDetailsPanel(null);

    function updateClusterMode() {
      clusterColors = buildClusterColorMap(state.clusterMode);
      clusterCenters = buildClusterCenters(state.clusterMode);
      drawClusterLayer(state.clusterMode, clusterColors);
      updateLegend(state.clusterMode, clusterColors);
      resetNodePositions();
      updateDetailsPanel(state.hovered);
    }

    clusterModeEl.addEventListener("change", () => {
      state.clusterMode = clusterModeEl.value;
      updateClusterMode();
    });
    showLabelsEl.addEventListener("change", () => {
      state.showLabels = showLabelsEl.checked;
    });
    showEdgesEl.addEventListener("change", () => {
      state.showEdges = showEdgesEl.checked;
    });
    searchEl.addEventListener("input", () => {
      state.search = searchEl.value || "";
    });
    resetEl.addEventListener("click", () => {
      resetNodePositions();
    });

    function frame() {
      applyForces(clusterCenters);
      drawFrame(nodeEls, labelEls, edgeEls, clusterColors, clusterCenters);
      window.requestAnimationFrame(frame);
    }
    frame();
  </script>
</body>
</html>
"""
    )


def write_graphml(path: Path, graph_payload: Dict[str, object]) -> None:
    nodes = graph_payload["nodes"]
    edges = graph_payload["edges"]

    node_attr_keys = [
        ("d0", "tool", "string"),
        ("d1", "library", "string"),
        ("d2", "subsection", "string"),
        ("d3", "cluster_subsection", "string"),
        ("d4", "cluster_library", "string"),
        ("d5", "cluster_community", "string"),
        ("d6", "cluster_weak_component", "string"),
        ("d7", "in_degree", "int"),
        ("d8", "out_degree", "int"),
        ("d9", "degree", "int"),
    ]

    lines: List[str] = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    lines.append('<graphml xmlns="http://graphml.graphdrawing.org/xmlns">')
    for key_id, key_name, key_type in node_attr_keys:
        lines.append(
            f'  <key id="{key_id}" for="node" attr.name="{key_name}" attr.type="{key_type}"/>'
        )
    lines.append('  <graph id="G" edgedefault="directed">')

    for node in nodes:
        node_id = f'n{node["index"]}'
        lines.append(f'    <node id="{node_id}">')
        lines.append(f'      <data key="d0">{xml_escape(str(node["id"]))}</data>')
        lines.append(f'      <data key="d1">{xml_escape(str(node["library"]))}</data>')
        lines.append(f'      <data key="d2">{xml_escape(str(node["subsectionKey"]))}</data>')
        lines.append(f'      <data key="d3">{xml_escape(str(node["cluster"]["subsection"]))}</data>')
        lines.append(f'      <data key="d4">{xml_escape(str(node["cluster"]["library"]))}</data>')
        lines.append(f'      <data key="d5">{xml_escape(str(node["cluster"]["community"]))}</data>')
        lines.append(f'      <data key="d6">{xml_escape(str(node["cluster"]["weak_component"]))}</data>')
        lines.append(f'      <data key="d7">{int(node["inDegree"])}</data>')
        lines.append(f'      <data key="d8">{int(node["outDegree"])}</data>')
        lines.append(f'      <data key="d9">{int(node["degree"])}</data>')
        lines.append("    </node>")

    for edge_idx, edge in enumerate(edges):
        lines.append(
            f'    <edge id="e{edge_idx}" source="n{edge["source"]}" target="n{edge["target"]}"/>'
        )

    lines.append("  </graph>")
    lines.append("</graphml>")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main(argv: Iterable[str]) -> int:
    args = parse_args(argv)
    adjacency_json_path = args.adjacency_json.resolve()
    mapping_json_path = args.mapping_json.resolve()
    out_html_path = args.out_html.resolve()
    out_clusters_path = args.out_clusters_json.resolve()
    out_graphml_path = args.out_graphml.resolve()

    tool_order, matrix, adjacency_payload = load_adjacency_json(adjacency_json_path)
    mapping_by_tool = load_mapping_json(mapping_json_path)
    metadata_by_tool = build_tool_metadata(tool_order, mapping_by_tool, adjacency_payload)
    edges = build_edges(matrix)

    graph_payload, cluster_summary_payload = build_cluster_payload(
        tool_order=tool_order,
        matrix=matrix,
        edges=edges,
        metadata_by_tool=metadata_by_tool,
        adjacency_source=adjacency_json_path,
        mapping_source=mapping_json_path,
    )

    html_text = render_network_html(graph_payload)

    out_html_path.parent.mkdir(parents=True, exist_ok=True)
    out_clusters_path.parent.mkdir(parents=True, exist_ok=True)
    out_graphml_path.parent.mkdir(parents=True, exist_ok=True)

    out_html_path.write_text(html_text, encoding="utf-8")
    out_clusters_path.write_text(
        json.dumps(cluster_summary_payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    write_graphml(out_graphml_path, graph_payload)

    print(f"Wrote network HTML: {out_html_path}")
    print(f"Wrote cluster JSON: {out_clusters_path}")
    print(f"Wrote network GraphML: {out_graphml_path}")
    print(f"Tools: {len(tool_order)}")
    print(f"Directed tool edges: {len(edges)}")
    print(
        "Cluster groups: "
        + ", ".join(
            [
                f"{name}={meta['groupCount']}"
                for name, meta in graph_payload["clusterings"].items()
            ]
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(__import__("sys").argv[1:]))
