#!/usr/bin/env python3
"""
resolve_bids.py - BIDS dataset resolver for CWL workflows.

Reads bids_query.json and walks a BIDS directory to produce concrete
file paths for a CWL job input file.

Usage:
    python3 resolve_bids.py --bids-dir /path/to/bids --query bids_query.json --job job.yml --output job.yml

When --job is provided, the existing job file is read first and BIDS-resolved
keys are merged on top, preserving all pre-configured scalar parameters.

Dependencies: Python 3.6+ standard library only.
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

# BIDS entity keys in specification order
ENTITY_KEYS = [
    'sub', 'ses', 'task', 'acq', 'ce', 'rec', 'dir', 'run',
    'mod', 'echo', 'flip', 'inv', 'mt', 'part', 'proc',
    'space', 'split', 'recording', 'chunk',
]

ENTITY_PATTERN = re.compile(
    r'(?:^|_)(' + '|'.join(ENTITY_KEYS) + r')-([a-zA-Z0-9]+)'
)

NIFTI_PATTERN = re.compile(r'\.(nii\.gz|nii)$')
DATATYPE_NAMES = {'anat', 'func', 'dwi', 'fmap', 'perf'}


def parse_bids_filename(filename):
    """Extract BIDS entities and suffix from a filename.

    Returns dict with 'entities', 'suffix', 'extension' or None if not parseable.
    """
    m = NIFTI_PATTERN.search(filename)
    if not m:
        return None

    extension = '.' + m.group(1)
    stem = filename[:m.start()]

    entities = {}
    last_end = 0
    for match in ENTITY_PATTERN.finditer(stem):
        entities[match.group(1)] = match.group(2)
        last_end = match.end()

    remaining = stem[last_end:]
    suffix_match = re.search(r'(?:^|_)([a-zA-Z0-9]+)$', remaining)
    suffix = suffix_match.group(1) if suffix_match else None

    if not suffix:
        return None
    return {'entities': entities, 'suffix': suffix, 'extension': extension}


def find_sidecar(nifti_path):
    """Find the JSON sidecar for a NIfTI file."""
    json_path = NIFTI_PATTERN.sub('.json', str(nifti_path))
    if os.path.isfile(json_path):
        return json_path
    return None


def extract_sidecar_params(sidecar_path, param_names):
    """Read specified parameters from a BIDS sidecar JSON file."""
    if not sidecar_path or not os.path.isfile(sidecar_path):
        return {}
    try:
        with open(sidecar_path) as f:
            data = json.load(f)
        return {k: data[k] for k in param_names if k in data}
    except (json.JSONDecodeError, IOError):
        return {}


def matches_selection(parsed, selection):
    """Check if a parsed BIDS filename matches a selection query."""
    if 'suffix' in selection and parsed['suffix'] != selection['suffix']:
        return False

    entities = parsed['entities']

    # Check task filter
    if 'task' in selection and selection['task'] != 'all':
        if entities.get('task') != selection['task']:
            return False

    # Check run filter
    if 'run' in selection and selection['run'] != 'all':
        run_val = selection['run']
        if isinstance(run_val, list):
            if entities.get('run') not in run_val:
                return False
        elif entities.get('run') != run_val:
            return False

    # Check acquisition filter
    if 'acq' in selection and selection['acq'] != 'all':
        if entities.get('acq') != selection['acq']:
            return False

    return True


def find_matching_files(bids_dir, selection):
    """Walk bids_dir and return files matching a single selection query.

    Returns list of dicts with 'path', 'entities', 'suffix', 'sidecar_path'.
    """
    bids_dir = Path(bids_dir)
    datatype = selection.get('datatype')
    if not datatype:
        return [], ['Selection missing required "datatype" field.']

    # Determine which subjects to scan
    subjects_spec = selection.get('subjects', 'all')
    if subjects_spec == 'all':
        subject_dirs = sorted([
            d for d in bids_dir.iterdir()
            if d.is_dir() and d.name.startswith('sub-')
        ])
    else:
        subject_dirs = []
        for sub_id in subjects_spec:
            sub_dir = bids_dir / sub_id
            if sub_dir.is_dir():
                subject_dirs.append(sub_dir)
            else:
                return [], [f'Subject directory not found: {sub_id}']

    # Determine sessions
    sessions_spec = selection.get('sessions', 'all')

    matched = []
    errors = []

    for sub_dir in subject_dirs:
        # Find session directories or use root
        if sessions_spec == 'all':
            ses_dirs = sorted([
                d for d in sub_dir.iterdir()
                if d.is_dir() and d.name.startswith('ses-')
            ])
            if not ses_dirs:
                ses_dirs = [sub_dir]  # No sessions — datatype is directly under subject
        else:
            ses_dirs = []
            for ses_id in sessions_spec:
                ses_dir = sub_dir / ses_id
                if ses_dir.is_dir():
                    ses_dirs.append(ses_dir)

        for ses_dir in ses_dirs:
            dt_dir = ses_dir / datatype if ses_dir != sub_dir else sub_dir / datatype
            if ses_dir != sub_dir:
                dt_dir = ses_dir / datatype
            if not dt_dir.is_dir():
                continue

            for fpath in sorted(dt_dir.iterdir()):
                if not fpath.is_file():
                    continue
                parsed = parse_bids_filename(fpath.name)
                if not parsed:
                    continue
                if not matches_selection(parsed, selection):
                    continue

                entry = {
                    'path': str(fpath),
                    'entities': parsed['entities'],
                    'suffix': parsed['suffix'],
                }

                sidecar = find_sidecar(fpath)
                if sidecar:
                    entry['sidecar_path'] = sidecar

                matched.append(entry)

    return matched, errors


def make_relative_path(filepath, relative_to):
    """Convert an absolute path to be relative to a base directory.

    Falls back to the original path if relative computation fails
    (e.g. cross-drive paths on Windows).
    """
    try:
        rel = os.path.relpath(filepath, relative_to)
        return rel.replace('\\', '/')  # Normalize to forward slashes for CWL
    except ValueError:
        return filepath


def find_events_file(nifti_path):
    """Find the events TSV paired with a BOLD NIfTI file."""
    events_path = re.sub(r'_bold\.(nii\.gz|nii)$', '_events.tsv', str(nifti_path))
    if os.path.isfile(events_path):
        return events_path
    return None


def resolve_queries(bids_dir, query, relative_to=None):
    """Resolve all selection queries against a BIDS directory.

    When relative_to is provided, file paths are made relative to that directory.
    Returns (resolved_dict, errors, warnings).
    """
    selections = query.get('selections', {})
    resolved = {}
    all_errors = []
    all_warnings = []

    for key, selection in selections.items():
        matched, errors = find_matching_files(bids_dir, selection)
        all_errors.extend(errors)

        if not matched and not errors:
            all_errors.append(
                f'Query "{key}" matched 0 files in {bids_dir}. '
                f'Check that datatype={selection.get("datatype")} and '
                f'suffix={selection.get("suffix")} exist in the dataset.'
            )
            continue

        # Build file list
        file_entries = []
        for m in matched:
            path = make_relative_path(m['path'], relative_to) if relative_to else m['path']
            file_entries.append({'class': 'File', 'path': path})

        resolved[key] = file_entries

        # Handle events file pairing
        if selection.get('include_events'):
            events_entries = []
            for m in matched:
                events_path = find_events_file(m['path'])
                if events_path:
                    evt_path = make_relative_path(events_path, relative_to) if relative_to else events_path
                    events_entries.append({'class': 'File', 'path': evt_path})
                else:
                    all_warnings.append(
                        f'No events TSV found for {os.path.basename(m["path"])}'
                    )
            if events_entries:
                resolved[f'{key}_events'] = events_entries

        # Handle sidecar parameter extraction
        extract_params = selection.get('extract_sidecar_params', [])
        if extract_params and matched:
            # Use the first file's sidecar as representative
            first_sidecar = matched[0].get('sidecar_path')
            params = extract_sidecar_params(first_sidecar, extract_params)
            for param_name, param_value in params.items():
                # Convert camelCase to snake_case for CWL
                snake_name = re.sub(r'(?<!^)(?=[A-Z])', '_', param_name).lower()
                resolved[snake_name] = param_value

    return resolved, all_errors, all_warnings


def parse_existing_job(job_path):
    """Parse an existing CWL job YAML file into an OrderedDict.

    Handles the simple YAML subset that niBuild generates:
    - Top-level scalar keys (string, int, float, bool)
    - Top-level lists of scalars or {class: File, path: ...} entries
    - Top-level dict values (e.g., class: File / path: ...)
    - Comments (# tool default) are stripped

    Returns an OrderedDict preserving key order.
    """
    from collections import OrderedDict

    if not os.path.isfile(job_path):
        return OrderedDict()

    with open(job_path) as f:
        raw_lines = f.readlines()

    result = OrderedDict()
    current_key = None
    current_list = None    # accumulates list items (- value)
    current_dict = None    # accumulates dict key-value pairs

    for line in raw_lines:
        stripped = line.rstrip()

        # Strip inline comments (but not inside quoted strings)
        comment_idx = stripped.find('  #')
        if comment_idx >= 0:
            stripped = stripped[:comment_idx].rstrip()

        # Skip blank lines and full-line comments
        if not stripped or stripped.lstrip().startswith('#'):
            continue

        indent = len(line) - len(line.lstrip())

        # Top-level key (no indentation)
        if indent == 0 and ':' in stripped:
            # Flush previous accumulator
            if current_key is not None:
                if current_dict is not None:
                    result[current_key] = current_dict
                elif current_list is not None:
                    result[current_key] = current_list

            colon_idx = stripped.index(':')
            key = stripped[:colon_idx].strip()
            value_part = stripped[colon_idx + 1:].strip()

            if value_part == '' or value_part == '[]':
                # Start of a block value (list or dict — determined by first indented line)
                current_key = key
                current_list = [] if value_part == '[]' else None
                current_dict = None
            else:
                current_key = None
                current_list = None
                current_dict = None
                result[key] = _parse_yaml_scalar(value_part)

        # Indented line — part of a list or nested map
        elif indent > 0 and current_key is not None:
            content = stripped.lstrip()
            if content.startswith('- '):
                # List item — switch to list mode if not already
                if current_list is None:
                    current_list = []
                    current_dict = None
                item_val = content[2:].strip()
                if item_val.startswith('class:'):
                    # Start of a {class: File, path: ...} entry
                    entry = {'class': item_val.split(':', 1)[1].strip()}
                    current_list.append(entry)
                else:
                    current_list.append(_parse_yaml_scalar(item_val))
            elif ':' in content and current_list and isinstance(current_list[-1], dict):
                # Continuation of a dict entry in a list (e.g., "path: /some/path")
                k, v = content.split(':', 1)
                current_list[-1][k.strip()] = v.strip()
            elif ':' in content and current_list is None:
                # Dict value (e.g., "class: File" under a top-level key)
                if current_dict is None:
                    current_dict = {}
                k, v = content.split(':', 1)
                current_dict[k.strip()] = v.strip()

    # Flush last key
    if current_key is not None:
        if current_dict is not None:
            result[current_key] = current_dict
        elif current_list is not None:
            result[current_key] = current_list

    return result


def _parse_yaml_scalar(s):
    """Parse a YAML scalar string into a Python value."""
    if s in ('true', 'True'):
        return True
    if s in ('false', 'False'):
        return False
    if s in ('null', 'Null', '~', ''):
        return None
    # Remove surrounding quotes
    if (s.startswith('"') and s.endswith('"')) or \
       (s.startswith("'") and s.endswith("'")):
        return s[1:-1]
    # Try int
    try:
        return int(s)
    except ValueError:
        pass
    # Try float
    try:
        return float(s)
    except ValueError:
        pass
    return s


def write_job_yml(resolved, output_path):
    """Write resolved file paths as CWL job YAML using only stdlib.

    Produces simple YAML without requiring PyYAML.
    """
    lines = []
    for key, value in resolved.items():
        if isinstance(value, list):
            lines.append(f'{key}:')
            for item in value:
                if isinstance(item, dict) and item.get('class') == 'File':
                    lines.append(f'  - class: File')
                    lines.append(f'    path: {item["path"]}')
                else:
                    lines.append(f'  - {_yaml_scalar(item)}')
        elif isinstance(value, dict):
            lines.append(f'{key}:')
            for k, v in value.items():
                lines.append(f'  {k}: {_yaml_scalar(v)}')
        else:
            lines.append(f'{key}: {_yaml_scalar(value)}')

    with open(output_path, 'w') as f:
        f.write('\n'.join(lines) + '\n')


def _yaml_scalar(value):
    """Format a scalar value for YAML output."""
    if value is None:
        return 'null'
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list):
        return '[' + ', '.join(_yaml_scalar(v) for v in value) + ']'
    # String — quote if it contains special characters
    s = str(value)
    if any(c in s for c in ':{}[],"\'|>&*!%#`@'):
        return f'"{s}"'
    return s


def main():
    parser = argparse.ArgumentParser(
        description='Resolve BIDS queries to CWL job inputs'
    )
    parser.add_argument(
        '--bids-dir', required=True,
        help='Path to BIDS dataset root directory'
    )
    parser.add_argument(
        '--query', required=True,
        help='Path to bids_query.json file'
    )
    parser.add_argument(
        '--job', default=None,
        help='Path to existing job.yml to merge into (preserves scalar parameters)'
    )
    parser.add_argument(
        '--output', default=None,
        help='Output job.yml path (defaults to --job path if provided)'
    )
    parser.add_argument(
        '--relative-to', default=None, dest='relative_to',
        help='Make file paths relative to this directory (typically the output file directory). '
             'If not provided, absolute paths are used.'
    )
    args = parser.parse_args()

    # Determine output path
    output_path = args.output or args.job
    if not output_path:
        print('Error: --output or --job is required', file=sys.stderr)
        sys.exit(1)

    # Validate BIDS directory
    if not os.path.isdir(args.bids_dir):
        print(f'Error: BIDS directory not found: {args.bids_dir}', file=sys.stderr)
        sys.exit(1)

    # Validate dataset_description.json
    desc_path = os.path.join(args.bids_dir, 'dataset_description.json')
    if not os.path.isfile(desc_path):
        print(
            f'Warning: No dataset_description.json found at {args.bids_dir}. '
            f'This may not be a valid BIDS dataset.',
            file=sys.stderr
        )

    # Read query
    try:
        with open(args.query) as f:
            query = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f'Error reading query file: {e}', file=sys.stderr)
        sys.exit(1)

    # Resolve (relative_to makes paths relative to a base directory for portability)
    relative_to = os.path.abspath(args.relative_to) if args.relative_to else None
    resolved, errors, warnings = resolve_queries(args.bids_dir, query, relative_to)

    for w in warnings:
        print(f'Warning: {w}', file=sys.stderr)

    if errors:
        for e in errors:
            print(f'Error: {e}', file=sys.stderr)
        sys.exit(1)

    # Merge with existing job file if provided
    if args.job:
        existing = parse_existing_job(args.job)
        existing.update(resolved)
        resolved = existing

    # Write output
    write_job_yml(resolved, output_path)

    total_files = sum(
        len(v) for v in resolved.values() if isinstance(v, list)
    )
    print(f'Resolved {total_files} files to {output_path}')


if __name__ == '__main__':
    main()
