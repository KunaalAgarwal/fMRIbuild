import React from 'react';
import '../styles/toggleWorkflowBar.css';

function ToggleWorkflowBar({ workspaces, current, onChange }) {
    const maxVisiblePages = 5;

    const getPagesToDisplay = () => {
        const total = workspaces.length;
        if (total <= maxVisiblePages) return [...Array(total).keys()];

        if (current < maxVisiblePages - 2) return [...Array(maxVisiblePages).keys()];
        if (current >= total - (maxVisiblePages - 2)) {
            return [...Array(maxVisiblePages).keys()].map((i) => total - maxVisiblePages + i);
        }
        return [0, '...', current, '...', total - 1];
    };

    return (
        <div className="toggle-workflow-bar">
            <button className="btn-secondary" disabled={current === 0} onClick={() => onChange(current - 1)}>
                &#9664; Previous
            </button>

            <div className="page-numbers">
                {getPagesToDisplay().map((page, index) =>
                    page === '...' ? (
                        <span key={index}>...</span>
                    ) : (
                        <span key={index} className={page === current ? 'active' : ''} onClick={() => onChange(page)}>
                            {page + 1}
                        </span>
                    ),
                )}
            </div>

            <button
                className="btn-secondary"
                disabled={current === workspaces.length - 1}
                onClick={() => onChange(current + 1)}
            >
                Next &#9654;
            </button>
        </div>
    );
}

export default ToggleWorkflowBar;
