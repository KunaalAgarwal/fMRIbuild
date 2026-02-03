import { useEffect, useRef } from 'react';

/**
 * Debounces localStorage writes to prevent main thread blocking.
 * Writes are batched and delayed to reduce synchronous I/O overhead.
 *
 * @param {string} key - localStorage key
 * @param {any} value - Value to persist (will be JSON.stringify'd)
 * @param {number} delay - Debounce delay in milliseconds (default: 300)
 */
export function useDebouncedStorage(key, value, delay = 300) {
    const timeoutRef = useRef(null);
    const valueRef = useRef(value);

    // Keep valueRef updated
    valueRef.current = value;

    useEffect(() => {
        // Clear any pending write
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Schedule a new write
        timeoutRef.current = setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify(valueRef.current));
            } catch (err) {
                console.error(`Failed to save to localStorage key "${key}":`, err);
            }
        }, delay);

        // Cleanup on unmount or key change
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [key, value, delay]);
}
