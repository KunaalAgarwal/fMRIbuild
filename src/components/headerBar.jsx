import '../styles/headerBar.css';

function HeaderBar() {
    return (
        <div className="header-bar">
            <h1>niBuild</h1>
            <a
                className="header-span header-link"
                href="https://kunaalagarwal.github.io/niBuild-auxiliary/"
                target="_blank"
                rel="noopener noreferrer"
            >
                [docs]
            </a>
            <a
                className="header-span header-link"
                href="https://github.com/KunaalAgarwal/niBuild"
                target="_blank"
                rel="noopener noreferrer"
            >
                [github]
            </a>
            <a
                className="header-span header-link"
                href="https://github.com/KunaalAgarwal/niBuild/issues"
                target="_blank"
                rel="noopener noreferrer"
            >
                [issues]
            </a>
        </div>
    );
}

export default HeaderBar;
