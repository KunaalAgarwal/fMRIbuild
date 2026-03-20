/**
 * Shared utilities for node sub-components.
 */

/** Compute a font size that scales down for longer node labels. */
export function labelFontSize(text) {
    const len = (text || '').length;
    if (len <= 6) return undefined; // use CSS default (0.95rem)
    if (len <= 10) return '0.82rem';
    if (len <= 16) return '0.72rem';
    return '0.62rem';
}
