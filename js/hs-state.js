// ═══════════════════════════════════════════════════════════
// HS-STATE v1.0 — Cross-Page State Management System
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════
// Persistent state across all HS pages via localStorage.
// Tracks visits, interactions, and enables cross-page messaging.

const HSState = (() => {
    const PREFIX = 'hs-';
    const SESSION_KEY = PREFIX + 'session';
    const VISITS_KEY = PREFIX + 'page-visits';
    const EVENTS_KEY = PREFIX + 'events';

    // ── SESSION ──
    function getSession() {
        let session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        if (!session) {
            session = {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                created: Date.now(),
                totalVisits: 0,
                lastPage: null,
            };
        }
        session.totalVisits++;
        session.lastPage = window.location.pathname.split('/').pop() || 'index.html';
        session.lastVisit = Date.now();
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session;
    }

    // ── PAGE VISITS ──
    function trackVisit(pageId) {
        const visits = JSON.parse(localStorage.getItem(VISITS_KEY) || '{}');
        if (!visits[pageId]) {
            visits[pageId] = { count: 0, firstVisit: Date.now() };
        }
        visits[pageId].count++;
        visits[pageId].lastVisit = Date.now();
        localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
        return visits;
    }

    function getVisits() {
        return JSON.parse(localStorage.getItem(VISITS_KEY) || '{}');
    }

    // ── CROSS-PAGE EVENTS ──
    function emitEvent(type, data) {
        const events = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
        events.push({
            type,
            data,
            page: window.location.pathname.split('/').pop(),
            timestamp: Date.now()
        });
        // Keep only last 50 events
        if (events.length > 50) events.splice(0, events.length - 50);
        localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    }

    function getEvents(type, limit) {
        const events = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
        const filtered = type ? events.filter(e => e.type === type) : events;
        return limit ? filtered.slice(-limit) : filtered;
    }

    function getLastEvent(type) {
        const events = getEvents(type);
        return events.length > 0 ? events[events.length - 1] : null;
    }

    // ── INIT ──
    const session = getSession();
    const currentPage = session.lastPage.replace('.html', '').replace('index', 'home');
    trackVisit(currentPage);

    return {
        session,
        trackVisit,
        getVisits,
        emitEvent,
        getEvents,
        getLastEvent,
        get: (key) => localStorage.getItem(PREFIX + key),
        set: (key, val) => localStorage.setItem(PREFIX + key, typeof val === 'string' ? val : JSON.stringify(val)),
    };
})();
