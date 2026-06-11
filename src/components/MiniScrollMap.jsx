import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * VS Code–style minimap for the CWL/YML preview. A narrow gutter showing a
 * scaled, non-interactive clone of the highlighted code as a texture, plus a
 * draggable viewport indicator. Lightweight on purpose — no editor library; it
 * just reads/writes the host scroll container's `scrollTop`.
 *
 * The code clone is decorative; navigation correctness comes entirely from the
 * thumb, whose position/size derive from the scroller's scroll metrics. The
 * clone is uniformly scaled so the whole document maps to the gutter height.
 *
 * @param {string} html - The same highlighted HTML rendered in the code pane.
 * @param {{current: HTMLElement|null}} scrollRef - Ref to the scroll container.
 */
function MiniScrollMap({ html, scrollRef }) {
    const mapRef = useRef(null);
    const codeRef = useRef(null);
    const draggingRef = useRef(false);
    const [thumb, setThumb] = useState({ top: 0, height: 0, show: false });
    const [scale, setScale] = useState(1);

    const measure = useCallback(() => {
        const sc = scrollRef.current;
        const map = mapRef.current;
        const code = codeRef.current;
        if (!sc || !map) return;
        const { scrollTop, scrollHeight, clientHeight } = sc;
        const mapH = map.clientHeight;
        // Fit the whole document into the gutter height (uniform, capped at 1:1).
        if (code) {
            const natural = code.scrollHeight || 1;
            setScale(Math.min(1, mapH / natural));
        }
        if (scrollHeight <= clientHeight + 1) {
            // Nothing to scroll — hide the thumb.
            setThumb((t) => (t.show ? { ...t, show: false } : t));
            return;
        }
        const height = Math.max(18, (clientHeight / scrollHeight) * mapH);
        const top = (scrollTop / (scrollHeight - clientHeight)) * (mapH - height);
        setThumb({ top, height, show: true });
    }, [scrollRef]);

    useEffect(() => {
        const sc = scrollRef.current;
        if (!sc) return;
        measure();
        sc.addEventListener('scroll', measure, { passive: true });
        const ro = new ResizeObserver(measure);
        ro.observe(sc);
        return () => {
            sc.removeEventListener('scroll', measure);
            ro.disconnect();
        };
    }, [scrollRef, measure, html]);

    // Center the viewport on the clicked/dragged position in the gutter.
    const scrollToClientY = useCallback(
        (clientY) => {
            const sc = scrollRef.current;
            const map = mapRef.current;
            if (!sc || !map) return;
            const rect = map.getBoundingClientRect();
            const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
            const target = ratio * sc.scrollHeight - sc.clientHeight / 2;
            sc.scrollTop = Math.min(sc.scrollHeight - sc.clientHeight, Math.max(0, target));
        },
        [scrollRef],
    );

    const onMouseDown = useCallback(
        (e) => {
            draggingRef.current = true;
            scrollToClientY(e.clientY);
            e.preventDefault();
        },
        [scrollToClientY],
    );

    useEffect(() => {
        const move = (e) => {
            if (draggingRef.current) scrollToClientY(e.clientY);
        };
        const up = () => {
            draggingRef.current = false;
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
    }, [scrollToClientY]);

    return (
        <div className="cwl-minimap" ref={mapRef} onMouseDown={onMouseDown} aria-hidden="true">
            <div
                className="cwl-minimap-code"
                ref={codeRef}
                style={{ transform: `scale(${scale})` }}
                dangerouslySetInnerHTML={{ __html: html }}
            />
            {thumb.show && <div className="cwl-minimap-thumb" style={{ top: thumb.top, height: thumb.height }} />}
        </div>
    );
}

export default MiniScrollMap;
