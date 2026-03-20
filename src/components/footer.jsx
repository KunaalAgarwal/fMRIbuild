import React from 'react';
import '../styles/footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-content">
                <img
                    src={`${import.meta.env.BASE_URL}images/SDS Monogram Logo Color-Screen.png`}
                    alt="SDS Logo"
                    className="footer-logo"
                />
                <span className="footer-span">
                    [Authors = Agarwal K.
                    <a
                        href="https://www.linkedin.com/in/kunaal-agarwal/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-links footer-span"
                    >
                        {' '}
                        [Info]
                    </a>
                    , Dawood A.
                    <a
                        href="https://www.linkedin.com/in/adamadawood/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-links footer-span"
                    >
                        {' '}
                        [Info]
                    </a>
                    , Rasero J.
                    <a
                        href="https://datascience.virginia.edu/people/javier-rasero"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-links footer-span"
                    >
                        {' '}
                        [Info]
                    </a>
                    ]
                </span>
            </div>
        </footer>
    );
};

export default Footer;
