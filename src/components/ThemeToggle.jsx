import { useState, useCallback } from 'react';

// Read the theme that the no-flash inline script (index.html) already applied
// to <html>. Falls back to 'dark' if the attribute is missing.
function getInitialTheme() {
    if (typeof document !== 'undefined') {
        const cur = document.documentElement.getAttribute('data-theme');
        if (cur === 'light' || cur === 'dark') return cur;
    }
    return 'dark';
}

/**
 * Light/dark theme toggle. Self-contained: it flips the `data-theme` attribute
 * on <html> (which swaps the CSS custom properties in tokens.css) and persists
 * the choice to localStorage. No context needed — nothing else consumes the
 * theme, and the initial value is established before paint in index.html.
 */
function ThemeToggle() {
    const [theme, setTheme] = useState(getInitialTheme);

    const toggle = useCallback(() => {
        setTheme((prev) => {
            const next = prev === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            try {
                localStorage.setItem('theme', next);
            } catch {
                /* localStorage unavailable — the runtime toggle still applies */
            }
            return next;
        });
    }, []);

    const isDark = theme === 'dark';
    const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

    return (
        <button
            type="button"
            className="top-bar-btn top-bar-theme-toggle"
            onClick={toggle}
            title={label}
            aria-label={label}
        >
            {isDark ? (
                // Sun — clicking switches to light.
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
            ) : (
                // Moon — clicking switches to dark.
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
            )}
        </button>
    );
}

export default ThemeToggle;
