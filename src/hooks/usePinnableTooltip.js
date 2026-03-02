import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Manages a hover-to-show / click-to-pin / click-outside-to-dismiss tooltip.
 *
 * @returns {{
 *   show: boolean,
 *   pinned: boolean,
 *   pos: { top: number, left: number },
 *   iconRef: React.RefObject,
 *   tooltipRef: React.RefObject,
 *   onMouseEnter: () => void,
 *   onMouseLeave: () => void,
 *   onClick: (e: React.MouseEvent) => void,
 * }}
 */
export function usePinnableTooltip() {
    const [show, setShow] = useState(false);
    const [pinned, setPinned] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const iconRef = useRef(null);
    const tooltipRef = useRef(null);

    const updatePosition = useCallback(() => {
        if (iconRef.current) {
            const rect = iconRef.current.getBoundingClientRect();
            setPos({ top: rect.top + rect.height / 2, left: rect.right + 10 });
        }
    }, []);

    const onMouseEnter = useCallback(() => {
        updatePosition();
        setShow(true);
    }, [updatePosition]);

    const onMouseLeave = useCallback(() => {
        setPinned(prev => {
            if (!prev) setShow(false);
            return prev;
        });
    }, []);

    const onClick = useCallback((e) => {
        e.stopPropagation();
        setPinned(prev => {
            if (prev) {
                setShow(false);
                return false;
            }
            updatePosition();
            setShow(true);
            return true;
        });
    }, [updatePosition]);

    // Close pinned tooltip when clicking outside
    useEffect(() => {
        if (!pinned) return;
        const handleClickOutside = (e) => {
            if (
                iconRef.current?.contains(e.target) ||
                tooltipRef.current?.contains(e.target)
            ) return;
            setPinned(false);
            setShow(false);
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [pinned]);

    return { show, pinned, pos, iconRef, tooltipRef, onMouseEnter, onMouseLeave, onClick };
}
