/* ================================================
   HYBRID SYNDICATE - ENHANCED JAVASCRIPT
   Advanced animations and cinematic transitions
   ================================================ */

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollReveal();
    initBackToTop();
    initParticles();
    initConsoleEasterEgg();
    initSmoothScroll();
    initKeyboardNav();
    initGlitchText();
    initCardAnimations();
    initGearParallax();
    initAccessibility();
});

// ============ NAVIGATION ============
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    let lastScroll = 0;
    let ticking = false;

    // Toggle mobile menu
    navToggle?.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');

        // Animate hamburger
        const spans = navToggle.querySelectorAll('span');
        if (navToggle.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
        } else {
            spans.forEach(span => {
                span.style.transform = '';
                span.style.opacity = '';
            });
        }
    });

    // Close mobile menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            navToggle?.classList.remove('active');
            const spans = navToggle?.querySelectorAll('span');
            spans?.forEach(span => {
                span.style.transform = '';
                span.style.opacity = '';
            });
        });
    });

    // Hide/show navbar on scroll
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const currentScroll = window.pageYOffset;

                if (currentScroll > lastScroll && currentScroll > 100) {
                    navbar.classList.add('hidden');
                } else {
                    navbar.classList.remove('hidden');
                }

                lastScroll = currentScroll;
                ticking = false;
            });
            ticking = true;
        }
    });

    // Active link highlighting
    const updateActiveLink = () => {
        const sections = document.querySelectorAll('section[id]');
        const scrollY = window.pageYOffset;

        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');
            const correspondingLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);

            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    if (link.getAttribute('href')?.startsWith('#')) {
                        link.classList.remove('active');
                    }
                });
                correspondingLink?.classList.add('active');
            }
        });
    };

    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink();
}

// ============ SCROLL REVEAL ============
function initScrollReveal() {
    const revealElements = document.querySelectorAll('[data-scroll-reveal]');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('revealed');

                    // Add cinematic blur effect
                    entry.target.style.filter = 'blur(5px)';
                    setTimeout(() => {
                        entry.target.style.filter = '';
                    }, 100);
                }, index * 100);

                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(element => {
        revealObserver.observe(element);
    });
}

// ============ BACK TO TOP BUTTON ============
function initBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');

    if (!backToTopBtn) return;

    let scrollTimeout;

    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);

        scrollTimeout = setTimeout(() => {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        }, 100);
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ============ FLOATING PARTICLES ============
function initParticles() {
    const particlesContainer = document.querySelector('.particles-container');

    if (!particlesContainer) return;

    const particleCount = 30;
    const colors = ['#39ff14', '#ffbf00', '#00f0ff', '#bf00ff'];

    // Add particle animation style
    if (!document.getElementById('particle-animations')) {
        const style = document.createElement('style');
        style.id = 'particle-animations';
        style.textContent = `
            @keyframes particleFloat {
                0% {
                    transform: translate(0, 0) scale(1);
                    opacity: 0;
                }
                10% {
                    opacity: 0.8;
                }
                50% {
                    opacity: 1;
                }
                90% {
                    opacity: 0.6;
                }
                100% {
                    transform: translate(var(--dx), var(--dy)) scale(0.5);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    for (let i = 0; i < particleCount; i++) {
        createParticle(particlesContainer, colors);
    }
}

function createParticle(container, colors) {
    const particle = document.createElement('div');
    const size = Math.random() * 3 + 1;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight;
    const duration = Math.random() * 20 + 10;
    const delay = Math.random() * 5;
    const dx = (Math.random() * 200 - 100) + 'px';
    const dy = (Math.random() * 200 - 100) + 'px';

    particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        left: ${startX}px;
        top: ${startY}px;
        opacity: 0;
        box-shadow: 0 0 ${size * 3}px ${color};
        pointer-events: none;
        --dx: ${dx};
        --dy: ${dy};
        animation: particleFloat ${duration}s ease-in-out ${delay}s infinite;
    `;

    container.appendChild(particle);
}

// ============ SMOOTH SCROLL ============
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            if (href === '#') return;

            e.preventDefault();

            const target = document.querySelector(href);

            if (target) {
                const offsetTop = target.offsetTop - 80;

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// ============ KEYBOARD NAVIGATION ============
function initKeyboardNav() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const navMenu = document.querySelector('.nav-menu');
            const navToggle = document.querySelector('.nav-toggle');

            if (navMenu?.classList.contains('active')) {
                navMenu.classList.remove('active');
                navToggle?.classList.remove('active');
            }
        }

        if (e.key === 'Home' && !e.ctrlKey) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        if (e.key === 'End' && !e.ctrlKey) {
            e.preventDefault();
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }
    });
}

// ============ GLITCH TEXT EFFECT ON HOVER ============
function initGlitchText() {
    document.querySelectorAll('.section-title').forEach(title => {
        title.addEventListener('mouseenter', () => {
            const originalText = title.textContent;
            const glitchChars = '!<>-_\\/[]{}—=+*^?#________';
            let iteration = 0;

            const glitchInterval = setInterval(() => {
                title.textContent = originalText
                    .split('')
                    .map((char, index) => {
                        if (index < iteration) {
                            return originalText[index];
                        }
                        return glitchChars[Math.floor(Math.random() * glitchChars.length)];
                    })
                    .join('');

                iteration += 1/3;

                if (iteration >= originalText.length) {
                    clearInterval(glitchInterval);
                    title.textContent = originalText;
                }
            }, 30);
        });
    });
}

// ============ CARD GRID ANIMATIONS ============
function initCardAnimations() {
    const animObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.classList.contains('model-grid') ||
                    entry.target.classList.contains('team-grid') ||
                    entry.target.classList.contains('identity-grid')) {
                    animateCardGrid(entry.target);
                }
            }
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('.model-grid, .team-grid, .identity-grid').forEach(el => {
        animObserver.observe(el);
    });
}

function animateCardGrid(grid) {
    const cards = grid.children;

    Array.from(cards).forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px) scale(0.9)';

            setTimeout(() => {
                card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0) scale(1)';
            }, 50);
        }, index * 100);
    });
}

// ============ GEAR PARALLAX ============
function initGearParallax() {
    document.addEventListener('mousemove', (e) => {
        const gears = document.querySelectorAll('.gear');
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;

        gears.forEach((gear, index) => {
            const speed = (index + 1) * 10;
            const x = (mouseX - 0.5) * speed;
            const y = (mouseY - 0.5) * speed;
            gear.style.transform = `translate(${x}px, ${y}px)`;
        });
    });
}

// ============ ACCESSIBILITY ============
function initAccessibility() {
    // Prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.style.setProperty('--transition-smooth', 'none');
        document.documentElement.style.setProperty('--transition-fast', 'none');
    }

    // Focus visible for keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            document.body.classList.add('keyboard-nav');
        }
    });

    document.addEventListener('mousedown', () => {
        document.body.classList.remove('keyboard-nav');
    });
}

// ============ CONSOLE EASTER EGG ============
function initConsoleEasterEgg() {
    const styles = {
        title: 'color: #00f0ff; font-size: 20px; font-weight: bold; text-shadow: 0 0 10px #00f0ff;',
        subtitle: 'color: #39ff14; font-size: 14px; font-weight: bold;',
        text: 'color: #cccccc; font-size: 12px;',
        warning: 'color: #ff073a; font-size: 12px; font-weight: bold;',
        code: 'color: #ffbf00; font-size: 11px; font-family: monospace;'
    };

    console.log('%c\u26A1 HYBRID SYNDICATE \u26A1', styles.title);
    console.log('%c\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501', styles.text);
    console.log('%c\u25B8 ETHIC SOFTWARE FOUNDATION', styles.subtitle);
    console.log('%c\u25B8 We Don\'t Build Apps. We Build Cognitive Weapons.', styles.text);
    console.log('%c\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501', styles.text);
    console.log('%c\u26A0 SYSTEM STATUS', styles.warning);
    console.log('%c\u251C\u2500 Circuit patterns: ACTIVE', styles.code);
    console.log('%c\u251C\u2500 Scanlines: RENDERING', styles.code);
    console.log('%c\u251C\u2500 Glitch effects: OPERATIONAL', styles.code);
    console.log('%c\u251C\u2500 Neon systems: CHARGING', styles.code);
    console.log('%c\u2514\u2500 Cognitive weapons: ARMED', styles.code);
    console.log('%c\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501', styles.text);
    console.log('%c"The damage is not hypothetical. It is structural."', styles.text);
    console.log('%c\u2014 EEI Strategic Forecast Report \u2022 2026', styles.code);
    console.log('%c\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501', styles.text);
    console.log('%cTIP: Try typing "hack()" in the console...', styles.subtitle);

    // Secret function
    window.hack = function() {
        console.clear();
        console.log('%c\uD83D\uDD13 ACCESS GRANTED', 'color: #39ff14; font-size: 24px; font-weight: bold; text-shadow: 0 0 20px #39ff14;');
        console.log('%c\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501', 'color: #39ff14;');
        console.log('%cYou\'ve unlocked the syndicate archives.', 'color: #00f0ff; font-size: 14px;');
        console.log('%c\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501', 'color: #39ff14;');
        console.log('%cCLASSIFIED FILES:', 'color: #ffbf00; font-weight: bold;');
        console.log('%c\u251C\u2500 manifest.txt', 'color: #cccccc;');
        console.log('%c\u251C\u2500 the_bridge_protocol.md', 'color: #cccccc;');
        console.log('%c\u251C\u2500 cognitive_weapons_v2.pdf', 'color: #cccccc;');
        console.log('%c\u2514\u2500 archaeologist_codex.encrypted', 'color: #cccccc;');
        console.log('%c\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501', 'color: #39ff14;');
        console.log('%c"One does not replace the other. One cannot exist without the other."', 'color: #bf00ff; font-style: italic;');
        console.log('%c\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501', 'color: #39ff14;');

        return '\u2713 Connection established to Hybrid Syndicate mainframe.';
    };
}

// ============ PERFORMANCE UTILITIES ============
function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============ ANALYTICS (PRIVACY-FIRST) ============
const analytics = {
    sessionStart: Date.now(),
    interactions: 0,

    logInteraction(type) {
        this.interactions++;
    },

    getSessionDuration() {
        return Math.floor((Date.now() - this.sessionStart) / 1000);
    }
};

document.querySelectorAll('.nav-link, .model-card, .team-card').forEach(el => {
    el.addEventListener('click', () => {
        analytics.logInteraction(el.className);
    });
});

console.log('%c\u2713 Hybrid Syndicate systems fully loaded.', 'color: #39ff14; font-weight: bold;');
console.log('%c\u2713 All cognitive weapons armed and ready.', 'color: #00f0ff;');
