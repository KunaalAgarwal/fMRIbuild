/**
 * Disambiguate duplicate labels by appending " (n)" suffixes.
 *
 * Given an ordered list of `{ id, label }`, returns a `Map<id, displayLabel>`.
 * A label that appears once is passed through untouched. When a label appears
 * more than once, EVERY occurrence is numbered with a 1-based ordinal in input
 * order — `flirt (1)`, `flirt (2)`, `flirt (3)`. Order in is order out, so the
 * numbering is stable as long as the input order is.
 *
 * Single source of truth for the duplicate-numbering used by both canvas node
 * display labels and the top-bar workspace/aux tab labels.
 *
 * @param {Array<{id: string, label: string}>} items
 * @returns {Map<string, string>}
 */
export function dedupeLabels(items) {
    const counts = new Map();
    for (const { label } of items) {
        counts.set(label, (counts.get(label) || 0) + 1);
    }

    const seq = new Map();
    const out = new Map();
    for (const { id, label } of items) {
        if ((counts.get(label) || 0) > 1) {
            const n = (seq.get(label) || 0) + 1;
            seq.set(label, n);
            out.set(id, `${label} (${n})`);
        } else {
            out.set(id, label);
        }
    }
    return out;
}
