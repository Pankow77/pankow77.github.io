// ═══════════════════════════════════════════════════════════
// HS-NAV v1.0 — Unified Navigation System
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════
// Self-contained navigation injector. Include in any page.
// Detects current page and highlights it. Fully responsive.

const HSNav = (() => {
    const PAGES = [
        { id: 'home',     label: 'HQ',       href: 'index.html',            color: '#00f0ff' },
        { id: 'eei',      label: 'EEI',       href: 'eei-predictor.html',    color: '#ff0040' },
        { id: 'oracle',   label: 'ORACLE',    href: 'oracle.html',           color: '#00c8ff' },
        { id: 'agora',    label: 'AGORA',     href: 'agora.html',            color: '#39ff14' },
        { id: 'pneuma',   label: 'PNEUMA',    href: 'pneuma.html',           color: '#ff6600' },
        { id: 'chronos',  label: 'CHRONOS',   href: 'urban-chronos.html',    color: '#00d4aa' },
        { id: 'archivio', label: 'ARCHIVIO',  href: 'archivio-silente.html', color: '#00d4ff' },
        { id: 'gedp',     label: 'GEDP',      href: 'gedp.html',             color: '#bf00ff' },
        { id: 'eei-doc',  label: 'EEI DOC',   href: 'eei-analysis.html',     color: '#ff073a' },
    ];

    function detectCurrentPage() {
        const path = window.location.pathname.split('/').pop() || 'index.html';
        return PAGES.find(p => p.href === path) || PAGES[0];
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.id = 'hs-nav-styles';
        style.textContent = `
            .hs-nav {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 36px;
                background: rgba(5, 8, 14, 0.97);
                backdrop-filter: blur(12px);
                border-bottom: 1px solid rgba(0, 240, 255, 0.15);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 16px;
                font-family: 'Orbitron', 'Share Tech Mono', monospace;
                box-shadow: 0 2px 20px rgba(0, 0, 0, 0.6);
            }
            .hs-nav-brand {
                font-size: 0.6rem;
                font-weight: 700;
                color: #00f0ff;
                text-decoration: none;
                letter-spacing: 0.15em;
                text-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .hs-nav-brand:hover {
                text-shadow: 0 0 15px rgba(0, 240, 255, 0.7);
            }
            .hs-nav-dot {
                width: 5px;
                height: 5px;
                background: #39ff14;
                border-radius: 50%;
                box-shadow: 0 0 6px rgba(57, 255, 20, 0.6);
                animation: hs-nav-pulse 2s infinite;
            }
            @keyframes hs-nav-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            .hs-nav-links {
                display: flex;
                gap: 4px;
                align-items: center;
                flex-wrap: nowrap;
                overflow-x: auto;
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            .hs-nav-links::-webkit-scrollbar { display: none; }
            .hs-nav-link {
                font-size: 0.5rem;
                font-weight: 600;
                letter-spacing: 0.1em;
                text-decoration: none;
                padding: 4px 8px;
                border: 1px solid transparent;
                border-radius: 2px;
                transition: all 0.3s ease;
                white-space: nowrap;
            }
            .hs-nav-link:hover {
                border-color: currentColor;
                background: rgba(255, 255, 255, 0.03);
            }
            .hs-nav-link.active {
                border-color: currentColor;
                background: rgba(255, 255, 255, 0.05);
                box-shadow: 0 0 10px currentColor;
            }
            .hs-nav-sep {
                color: #1a2436;
                font-size: 0.5rem;
                user-select: none;
            }
            .hs-nav-toggle {
                display: none;
                background: none;
                border: 1px solid rgba(0, 240, 255, 0.3);
                color: #00f0ff;
                font-size: 0.7rem;
                padding: 2px 6px;
                cursor: pointer;
                border-radius: 2px;
                font-family: 'Orbitron', monospace;
                letter-spacing: 0.1em;
            }
            .hs-nav-toggle:hover {
                border-color: #00f0ff;
                background: rgba(0, 240, 255, 0.05);
            }
            .hs-nav-state {
                font-size: 0.4rem;
                color: #2a3a4e;
                letter-spacing: 0.08em;
                white-space: nowrap;
            }
            @media (max-width: 768px) {
                .hs-nav {
                    padding: 0 10px;
                }
                .hs-nav-links {
                    position: fixed;
                    top: 36px;
                    left: 0;
                    right: 0;
                    background: rgba(5, 8, 14, 0.98);
                    border-bottom: 1px solid rgba(0, 240, 255, 0.15);
                    flex-direction: column;
                    padding: 8px 0;
                    gap: 0;
                    transform: translateY(-100%);
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                    overflow-x: visible;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
                }
                .hs-nav-links.open {
                    transform: translateY(0);
                    opacity: 1;
                    visibility: visible;
                }
                .hs-nav-link {
                    padding: 8px 16px;
                    font-size: 0.6rem;
                    border-radius: 0;
                    border-bottom: 1px solid rgba(0, 240, 255, 0.05);
                }
                .hs-nav-sep {
                    display: none;
                }
                .hs-nav-toggle {
                    display: block;
                }
                .hs-nav-state {
                    display: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function injectNav() {
        const current = detectCurrentPage();
        const nav = document.createElement('div');
        nav.className = 'hs-nav';
        nav.id = 'hs-nav';

        // Brand
        const brand = `<a href="index.html" class="hs-nav-brand">
            <span class="hs-nav-dot"></span>
            HYBRID SYNDICATE
        </a>`;

        // Links
        const links = PAGES.map((page, i) => {
            const isActive = page.id === current.id;
            const link = `<a href="${page.href}" class="hs-nav-link${isActive ? ' active' : ''}" style="color: ${page.color}; ${isActive ? `text-shadow: 0 0 8px ${page.color};` : ''}">${page.label}</a>`;
            const sep = i < PAGES.length - 1 ? '<span class="hs-nav-sep">|</span>' : '';
            return link + sep;
        }).join('');

        // State indicator
        const visitCount = Object.keys(localStorage).filter(k => k.startsWith('hs-visited-')).length;
        const state = `<span class="hs-nav-state">${visitCount}/${PAGES.length} SYSTEMS</span>`;

        // Toggle button
        const toggle = `<button class="hs-nav-toggle" onclick="HSNav.toggleMenu()">NAV</button>`;

        nav.innerHTML = `${brand}<div class="hs-nav-links" id="hs-nav-links">${links}</div>${state}${toggle}`;

        document.body.insertBefore(nav, document.body.firstChild);

        // Track visit
        localStorage.setItem('hs-visited-' + current.id, Date.now().toString());

        // Push body down
        document.body.style.paddingTop = (parseFloat(getComputedStyle(document.body).paddingTop) || 0) + 36 + 'px';
    }

    function toggleMenu() {
        const links = document.getElementById('hs-nav-links');
        if (links) links.classList.toggle('open');
    }

    // Close menu on link click (mobile)
    function bindMobileClose() {
        document.addEventListener('click', (e) => {
            const links = document.getElementById('hs-nav-links');
            if (!links) return;
            if (e.target.classList.contains('hs-nav-link')) {
                links.classList.remove('open');
            }
            // Close when clicking outside
            if (!e.target.closest('.hs-nav') && links.classList.contains('open')) {
                links.classList.remove('open');
            }
        });
    }

    function init() {
        if (document.getElementById('hs-nav')) return; // Already injected

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                injectStyles();
                injectNav();
                bindMobileClose();
            });
        } else {
            injectStyles();
            injectNav();
            bindMobileClose();
        }
    }

    init();

    return {
        toggleMenu,
        PAGES,
        detectCurrentPage
    };
})();
