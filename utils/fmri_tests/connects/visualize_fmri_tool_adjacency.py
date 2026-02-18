#!/usr/bin/env python3
"""Create a dependency-free HTML visualization for the fMRI adjacency matrix CSV."""

from __future__ import annotations

import argparse
import csv
import html
from pathlib import Path
from typing import Iterable, List, Tuple


def parse_args(argv: Iterable[str]) -> argparse.Namespace:
    script_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description="Render fmri_tool_adjacency_matrix.csv as an HTML heatmap table."
    )
    parser.add_argument(
        "--matrix-csv",
        type=Path,
        default=script_dir / "fmri_tool_adjacency_matrix.csv",
        help="Path to adjacency matrix CSV.",
    )
    parser.add_argument(
        "--out-html",
        type=Path,
        default=script_dir / "fmri_tool_adjacency_matrix.html",
        help="Path for generated HTML output.",
    )
    return parser.parse_args(list(argv))


def load_csv_matrix(csv_path: Path) -> Tuple[List[str], List[List[int]]]:
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV matrix not found: {csv_path}")

    with csv_path.open("r", encoding="utf-8", newline="") as fh:
        reader = list(csv.reader(fh))

    if len(reader) < 2:
        raise ValueError(f"CSV matrix must contain header and at least one data row: {csv_path}")

    header = reader[0]
    if len(header) < 2 or header[0].strip().lower() != "tool":
        raise ValueError("CSV header must start with 'tool' followed by tool names.")

    tools = [name.strip() for name in header[1:]]
    tool_count = len(tools)
    if tool_count == 0:
        raise ValueError("CSV matrix has no tool columns.")

    matrix: List[List[int]] = []
    for idx, row in enumerate(reader[1:], start=1):
        if len(row) != tool_count + 1:
            raise ValueError(
                f"Row {idx + 1} has {len(row)} columns but expected {tool_count + 1}."
            )
        row_tool = row[0].strip()
        if row_tool != tools[idx - 1]:
            raise ValueError(
                f"Row {idx + 1} tool '{row_tool}' does not match header order '{tools[idx - 1]}'."
            )
        try:
            matrix_row = [int(val) for val in row[1:]]
        except ValueError as exc:
            raise ValueError(f"Row {idx + 1} contains non-integer cell values.") from exc

        invalid_values = [val for val in matrix_row if val not in (0, 1)]
        if invalid_values:
            raise ValueError(f"Row {idx + 1} contains values other than 0/1: {invalid_values}")
        matrix.append(matrix_row)

    if len(matrix) != tool_count:
        raise ValueError(
            f"Matrix must be square: found {len(matrix)} rows for {tool_count} columns."
        )

    return tools, matrix


def render_html(tools: List[str], matrix: List[List[int]], source_csv: Path) -> str:
    tool_headers = "".join(
        f"<th class='col-header' title='{html.escape(tool)}'>{html.escape(tool)}</th>" for tool in tools
    )

    body_rows: List[str] = []
    for src_tool, row in zip(tools, matrix):
        cells: List[str] = []
        for dst_tool, value in zip(tools, row):
            css = "one" if value == 1 else "zero"
            cells.append(
                "<td class='cell {css}' data-src='{src}' data-dst='{dst}'>{value}</td>".format(
                    css=css,
                    src=html.escape(src_tool),
                    dst=html.escape(dst_tool),
                    value=value,
                )
            )
        row_html = (
            f"<tr><th class='row-header' title='{html.escape(src_tool)}'>{html.escape(src_tool)}</th>"
            + "".join(cells)
            + "</tr>"
        )
        body_rows.append(row_html)

    edge_count = sum(sum(row) for row in matrix)
    tool_count = len(tools)
    density = edge_count / (tool_count * tool_count) if tool_count else 0

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>fMRI Tool Adjacency Matrix</title>
  <style>
    :root {{
      --bg: #f8fafc;
      --line: #d0d7de;
      --text: #1f2937;
      --zero: #ffffff;
      --one: #1f9d55;
      --one-text: #ffffff;
      --header: #eef2f7;
      --hover: #ffe9a8;
    }}

    body {{
      margin: 0;
      padding: 16px;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    }}

    h1 {{
      margin: 0 0 6px;
      font-size: 20px;
    }}

    .meta {{
      margin: 0 0 14px;
      font-size: 13px;
      color: #4b5563;
    }}

    .controls {{
      display: flex;
      gap: 12px;
      align-items: center;
      margin: 0 0 10px;
      font-size: 13px;
    }}

    .matrix-wrap {{
      border: 1px solid var(--line);
      background: #fff;
      overflow: auto;
      max-height: calc(100vh - 160px);
    }}

    table {{
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 10px;
      width: max-content;
      min-width: 100%;
    }}

    th,
    td {{
      border: 1px solid var(--line);
      text-align: center;
      width: 26px;
      height: 22px;
      min-width: 26px;
      box-sizing: border-box;
      padding: 0;
      white-space: nowrap;
    }}

    .corner {{
      position: sticky;
      top: 0;
      left: 0;
      z-index: 4;
      width: 220px;
      min-width: 220px;
      background: var(--header);
      font-size: 12px;
    }}

    .col-header {{
      position: sticky;
      top: 0;
      z-index: 3;
      background: var(--header);
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      height: 160px;
      padding: 2px;
      font-size: 10px;
      min-width: 24px;
    }}

    .row-header {{
      position: sticky;
      left: 0;
      z-index: 2;
      text-align: left;
      padding: 0 6px;
      width: 220px;
      min-width: 220px;
      background: var(--header);
      font-size: 11px;
    }}

    .zero {{
      background: var(--zero);
      color: #9ca3af;
    }}

    .one {{
      background: var(--one);
      color: var(--one-text);
      font-weight: 700;
    }}

    .hide-zeros .zero {{
      color: transparent;
      background: #f1f5f9;
    }}

    .cell.hover {{
      outline: 2px solid var(--hover);
      outline-offset: -2px;
    }}

    .row-header.hover,
    .col-header.hover {{
      background: var(--hover);
    }}

    .legend {{
      font-size: 12px;
      color: #4b5563;
      margin-top: 8px;
    }}
  </style>
</head>
<body>
  <h1>fMRI Tool Adjacency Matrix</h1>
  <p class="meta">
    Source: <code>{html.escape(str(source_csv))}</code><br>
    Tools: <strong>{tool_count}</strong> |
    Directed edges: <strong>{edge_count}</strong> |
    Density: <strong>{density:.2%}</strong>
  </p>

  <div class="controls">
    <label><input id="toggle-zeros" type="checkbox"> Hide zeros</label>
    <span>Hover a cell to highlight source and target tools.</span>
  </div>

  <div class="matrix-wrap">
    <table id="matrix">
      <thead>
        <tr>
          <th class="corner">source \\ target</th>
          {tool_headers}
        </tr>
      </thead>
      <tbody>
        {"".join(body_rows)}
      </tbody>
    </table>
  </div>

  <div class="legend">
    <strong>Legend:</strong> green = edge exists (1), white/gray = no edge (0)
  </div>

  <script>
    const body = document.body;
    const matrix = document.getElementById("matrix");
    const toggle = document.getElementById("toggle-zeros");
    const rows = Array.from(matrix.querySelectorAll("tbody tr"));
    const colHeaders = Array.from(matrix.querySelectorAll("thead .col-header"));

    toggle.addEventListener("change", () => {{
      body.classList.toggle("hide-zeros", toggle.checked);
    }});

    function clearHover() {{
      matrix.querySelectorAll(".hover").forEach((el) => el.classList.remove("hover"));
    }}

    rows.forEach((row, rowIndex) => {{
      const rowHeader = row.querySelector(".row-header");
      const cells = Array.from(row.querySelectorAll(".cell"));
      cells.forEach((cell, colIndex) => {{
        cell.addEventListener("mouseenter", () => {{
          clearHover();
          cell.classList.add("hover");
          rowHeader.classList.add("hover");
          colHeaders[colIndex].classList.add("hover");
        }});
      }});
    }});

    matrix.addEventListener("mouseleave", clearHover);
  </script>
</body>
</html>
"""


def main(argv: Iterable[str]) -> int:
    args = parse_args(argv)
    tools, matrix = load_csv_matrix(args.matrix_csv)
    html_text = render_html(tools, matrix, args.matrix_csv)
    args.out_html.parent.mkdir(parents=True, exist_ok=True)
    args.out_html.write_text(html_text, encoding="utf-8")

    print(f"Wrote HTML visualization to: {args.out_html}")
    print(f"Tools: {len(tools)}")
    print(f"Directed tool edges: {sum(sum(row) for row in matrix)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(__import__("sys").argv[1:]))
