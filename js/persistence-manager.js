// ═══════════════════════════════════════════════════════════════
// PERSISTENCE_MANAGER v1.0 — Memory & Intelligence Archive
// Hybrid Syndicate / Ethic Software Foundation
// ═══════════════════════════════════════════════════════════════
// "A detective without memory is just a tourist."
//
// This module provides:
// - Full signal archive with rich metadata
// - Export/Import JSON for backup & portability
// - Search & filter across all stored signals
// - Cross-session statistics
// - Zero servers. Your data stays yours.
// ═══════════════════════════════════════════════════════════════

const PersistenceManager = (() => {

    // ══════════════════════════════════════════════
    // CONFIGURATION
    // ══════════════════════════════════════════════

    const CONFIG = {
        archiveKey: 'hs_signal_archive',
        statsKey: 'hs_session_stats',
        settingsKey: 'hs_settings',
        maxArchiveSize: 2000,
        version: '2.0',
        signalTTL: 30 * 24 * 60 * 60 * 1000,  // 30 days TTL
        storageSoftLimit: 4 * 1024 * 1024,      // 4MB soft limit (warn)
        storageHardLimit: 4.5 * 1024 * 1024,    // 4.5MB hard limit (purge)
        cleanupInterval: 60 * 60 * 1000,        // 1h between cleanups
    };

    // ══════════════════════════════════════════════
    // STORAGE SIZE MONITORING
    // ══════════════════════════════════════════════

    let lastCleanup = 0;

    function estimateStorageBytes() {
        let total = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('hs_')) {
                    total += (localStorage.getItem(key) || '').length * 2; // UTF-16
                }
            }
            // Also count si_seen (dedup index)
            const seen = localStorage.getItem('si_seen');
            if (seen) total += seen.length * 2;
        } catch (e) { /* ignore */ }
        return total;
    }

    function getStorageReport() {
        const bytes = estimateStorageBytes();
        return {
            bytesUsed: bytes,
            kbUsed: Math.round(bytes / 1024),
            mbUsed: (bytes / (1024 * 1024)).toFixed(2),
            percentFull: Math.round((bytes / CONFIG.storageHardLimit) * 100),
            healthy: bytes < CONFIG.storageSoftLimit,
            critical: bytes >= CONFIG.storageHardLimit,
        };
    }

    // TTL-based cleanup: purge signals older than signalTTL
    function cleanupExpiredSignals() {
        const now = Date.now();
        if (now - lastCleanup < CONFIG.cleanupInterval) return;
        lastCleanup = now;

        const archive = getArchive();
        const cutoff = now - CONFIG.signalTTL;
        const before = archive.length;
        const filtered = archive.filter(s => (s.time || 0) > cutoff);

        if (filtered.length < before) {
            saveArchive(filtered);
            console.log(`[PERSISTENCE] TTL cleanup: purged ${before - filtered.length} signals older than 30 days`);
        }

        // Size-based emergency purge
        const storage = getStorageReport();
        if (storage.critical) {
            const current = getArchive();
            const keep = Math.floor(current.length * 0.6); // Keep newest 60%
            const trimmed = current.slice(0, keep);
            saveArchive(trimmed);
            console.warn(`[PERSISTENCE] Emergency purge: storage at ${storage.mbUsed}MB, trimmed to ${trimmed.length} signals`);
            if (typeof CoreFeed !== 'undefined') {
                CoreFeed.addMessage('SENTINEL', `Storage critico (${storage.mbUsed}MB). Archivio ridotto a ${trimmed.length} segnali.`);
            }
        } else if (!storage.healthy && typeof CoreFeed !== 'undefined') {
            CoreFeed.addMessage('SENTINEL', `Storage warning: ${storage.mbUsed}MB utilizzati (${storage.percentFull}%).`);
        }
    }

    // ══════════════════════════════════════════════
    // ARCHIVE MANAGEMENT
    // ══════════════════════════════════════════════

    function getArchive() {
        try {
            const raw = localStorage.getItem(CONFIG.archiveKey);
            if (!raw) return [];
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[PERSISTENCE] Archive corrupted, resetting.');
            return [];
        }
    }

    function saveArchive(archive) {
        try {
            // Trim if needed
            if (archive.length > CONFIG.maxArchiveSize) {
                archive = archive.slice(0, CONFIG.maxArchiveSize);
            }
            localStorage.setItem(CONFIG.archiveKey, JSON.stringify(archive));
            return true;
        } catch (e) {
            console.warn('[PERSISTENCE] Storage full, trimming archive.');
            archive = archive.slice(0, Math.floor(archive.length / 2));
            try {
                localStorage.setItem(CONFIG.archiveKey, JSON.stringify(archive));
                return true;
            } catch (e2) {
                return false;
            }
        }
    }

    function addSignal(signal) {
        // Run periodic cleanup on every add
        cleanupExpiredSignals();

        const archive = getArchive();
        // Avoid duplicates by link
        if (archive.some(s => s.link === signal.link)) return false;

        const entry = {
            id: signal.id || signal.link || Date.now().toString(),
            title: signal.title || '',
            description: signal.description || '',
            domain: signal.domain || 'UNKNOWN',
            domainColor: signal.domainColor || '#666',
            domainIcon: signal.domainIcon || '?',
            severity: signal.severity || 0,
            source: signal.source || '',
            feedId: signal.feedId || '',
            link: signal.link || '',
            lang: signal.lang || 'en',
            time: signal.classifiedAt || signal.time || Date.now(),
            matchScore: signal.matchScore || 0,
        };

        archive.unshift(entry);
        saveArchive(archive);
        updateStats('signalAdded');
        return true;
    }

    // ══════════════════════════════════════════════
    // MIGRATE OLD ARCHIVE
    // ══════════════════════════════════════════════
    // Migrates data from si_archive (old format) to hs_signal_archive

    function migrateOldArchive() {
        try {
            const oldRaw = localStorage.getItem('si_archive');
            if (!oldRaw) return;

            const oldArchive = JSON.parse(oldRaw);
            if (!oldArchive.length) return;

            const newArchive = getArchive();
            const existingLinks = new Set(newArchive.map(s => s.link));

            let migrated = 0;
            oldArchive.forEach(old => {
                if (old.link && !existingLinks.has(old.link)) {
                    newArchive.push({
                        id: old.link || Date.now().toString() + Math.random(),
                        title: old.title || '',
                        description: '',
                        domain: old.domain || 'UNKNOWN',
                        domainColor: getDomainColor(old.domain),
                        domainIcon: getDomainIcon(old.domain),
                        severity: old.severity || 0,
                        source: old.source || '',
                        feedId: '',
                        link: old.link || '',
                        lang: '',
                        time: old.time || Date.now(),
                        matchScore: 0,
                    });
                    existingLinks.add(old.link);
                    migrated++;
                }
            });

            if (migrated > 0) {
                // Sort by time descending
                newArchive.sort((a, b) => b.time - a.time);
                saveArchive(newArchive);
                console.log(`[PERSISTENCE] Migrated ${migrated} signals from old archive.`);
            }
        } catch (e) {
            console.warn('[PERSISTENCE] Migration failed:', e);
        }
    }

    function getDomainColor(domain) {
        const colors = {
            CLIMATE: '#00c8ff', GEOPOLITICS: '#ff3344', ECONOMY: '#00d4aa',
            TECHNOLOGY: '#39ff14', SOCIAL: '#ff6633', ENERGY: '#ffbf00',
        };
        return colors[domain] || '#666';
    }

    function getDomainIcon(domain) {
        const icons = {
            CLIMATE: '◈', GEOPOLITICS: '◆', ECONOMY: '◇',
            TECHNOLOGY: '◉', SOCIAL: '◎', ENERGY: '◐',
        };
        return icons[domain] || '?';
    }

    // ══════════════════════════════════════════════
    // SEARCH & FILTER
    // ══════════════════════════════════════════════

    function searchArchive(query, filters = {}) {
        let results = getArchive();

        // Text search
        if (query && query.trim()) {
            const q = query.toLowerCase().trim();
            results = results.filter(s =>
                (s.title && s.title.toLowerCase().includes(q)) ||
                (s.description && s.description.toLowerCase().includes(q)) ||
                (s.source && s.source.toLowerCase().includes(q))
            );
        }

        // Domain filter
        if (filters.domain && filters.domain !== 'ALL') {
            results = results.filter(s => s.domain === filters.domain);
        }

        // Severity filter
        if (filters.minSeverity) {
            results = results.filter(s => s.severity >= filters.minSeverity);
        }

        // Date range
        if (filters.fromDate) {
            const from = new Date(filters.fromDate).getTime();
            results = results.filter(s => s.time >= from);
        }
        if (filters.toDate) {
            const to = new Date(filters.toDate).getTime() + 86400000; // end of day
            results = results.filter(s => s.time <= to);
        }

        // Source filter
        if (filters.source) {
            results = results.filter(s => s.source === filters.source);
        }

        return results;
    }

    // ══════════════════════════════════════════════
    // STATISTICS
    // ══════════════════════════════════════════════

    function getStats() {
        const archive = getArchive();
        const domains = {};
        const sources = {};
        let totalSeverity = 0;
        let criticalCount = 0;

        archive.forEach(s => {
            domains[s.domain] = (domains[s.domain] || 0) + 1;
            sources[s.source] = (sources[s.source] || 0) + 1;
            totalSeverity += s.severity || 0;
            if (s.severity >= 70) criticalCount++;
        });

        const sessionStats = getSessionStats();

        return {
            totalSignals: archive.length,
            domains,
            sources,
            avgSeverity: archive.length ? Math.round(totalSeverity / archive.length) : 0,
            criticalCount,
            oldestSignal: archive.length ? archive[archive.length - 1].time : null,
            newestSignal: archive.length ? archive[0].time : null,
            firstSession: sessionStats.firstSession,
            totalSessions: sessionStats.totalSessions,
        };
    }

    function getSessionStats() {
        try {
            const raw = localStorage.getItem(CONFIG.statsKey);
            if (!raw) {
                const init = { firstSession: Date.now(), totalSessions: 1, totalSignalsEver: 0 };
                localStorage.setItem(CONFIG.statsKey, JSON.stringify(init));
                return init;
            }
            return JSON.parse(raw);
        } catch (e) {
            return { firstSession: Date.now(), totalSessions: 1, totalSignalsEver: 0 };
        }
    }

    function updateStats(event) {
        try {
            const stats = getSessionStats();
            if (event === 'signalAdded') {
                stats.totalSignalsEver = (stats.totalSignalsEver || 0) + 1;
            }
            localStorage.setItem(CONFIG.statsKey, JSON.stringify(stats));
        } catch (e) { /* ignore */ }
    }

    function incrementSession() {
        try {
            const stats = getSessionStats();
            stats.totalSessions = (stats.totalSessions || 0) + 1;
            localStorage.setItem(CONFIG.statsKey, JSON.stringify(stats));
        } catch (e) { /* ignore */ }
    }

    // ══════════════════════════════════════════════
    // EXPORT
    // ══════════════════════════════════════════════

    function exportJSON() {
        const data = {
            _meta: {
                system: 'HYBRID_SYNDICATE',
                module: 'PERSISTENCE_MANAGER',
                version: CONFIG.version,
                exportedAt: new Date().toISOString(),
                signalCount: 0,
            },
            archive: getArchive(),
            stats: getSessionStats(),
        };
        data._meta.signalCount = data.archive.length;

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `HS_ARCHIVE_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (typeof CoreFeed !== 'undefined') {
            CoreFeed.addMessage('PANKOW_77C',
                `Archivio esportato. ${data._meta.signalCount} segnali salvati su file.`);
        }

        return data._meta;
    }

    // ══════════════════════════════════════════════
    // IMPORT
    // ══════════════════════════════════════════════

    function importJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    // Validate structure
                    if (!data.archive || !Array.isArray(data.archive)) {
                        reject(new Error('Formato non valido: manca il campo "archive".'));
                        return;
                    }

                    // Merge with existing archive (no duplicates)
                    const currentArchive = getArchive();
                    const existingLinks = new Set(currentArchive.map(s => s.link).filter(Boolean));

                    // Allowed signal properties (whitelist)
                    const ALLOWED_KEYS = ['id', 'title', 'description', 'link', 'source', 'domain', 'severity', 'time', 'classifiedAt', 'domainColor', 'domainIcon'];

                    let imported = 0;
                    data.archive.forEach(signal => {
                        // Validate: must be a plain object with expected fields
                        if (!signal || typeof signal !== 'object' || Array.isArray(signal)) return;
                        if (typeof signal.title !== 'string' || typeof signal.domain !== 'string') return;

                        // Sanitize: strip any unexpected keys
                        const clean = {};
                        ALLOWED_KEYS.forEach(key => {
                            if (signal[key] !== undefined) {
                                clean[key] = typeof signal[key] === 'string' ? signal[key].substring(0, 2000) : signal[key];
                            }
                        });

                        if (clean.link && !existingLinks.has(clean.link)) {
                            currentArchive.push(clean);
                            existingLinks.add(clean.link);
                            imported++;
                        } else if (!clean.link) {
                            currentArchive.push(clean);
                            imported++;
                        }
                    });

                    // Sort by time descending
                    currentArchive.sort((a, b) => (b.time || 0) - (a.time || 0));

                    if (saveArchive(currentArchive)) {
                        if (typeof CoreFeed !== 'undefined') {
                            CoreFeed.addMessage('SIGNAL_HUNTER',
                                `Importazione completata. ${imported} nuovi segnali integrati nell'archivio.`);
                        }
                        resolve({ imported, total: currentArchive.length });
                    } else {
                        reject(new Error('Errore di salvataggio in localStorage.'));
                    }
                } catch (err) {
                    reject(new Error('File JSON non valido: ' + err.message));
                }
            };
            reader.onerror = () => reject(new Error('Errore nella lettura del file.'));
            reader.readAsText(file);
        });
    }

    // ══════════════════════════════════════════════
    // ARCHIVE BROWSER UI
    // ══════════════════════════════════════════════

    let panelEl = null;
    let isOpen = false;

    function createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* ── ARCHIVE BUTTON ── */
            .pm-archive-btn {
                position: fixed;
                bottom: 0;
                left: 240px;
                background: rgba(8,12,18,0.96);
                border-top: 1px solid #1a2436;
                border-right: 1px solid #1a2436;
                border-left: 1px solid #1a2436;
                padding: 6px 14px;
                font-family: 'Orbitron', monospace;
                font-size: 0.5rem;
                font-weight: 600;
                color: #ffbf00;
                letter-spacing: 0.1em;
                cursor: pointer;
                z-index: 9998;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s;
                user-select: none;
            }
            .pm-archive-btn:hover {
                background: rgba(255,191,0,0.08);
                color: #ffd700;
            }
            .pm-archive-btn .pm-count {
                font-family: 'Share Tech Mono', monospace;
                color: #4a5a6c;
                font-size: 0.45rem;
                letter-spacing: 0.05em;
            }

            /* ── ARCHIVE PANEL OVERLAY ── */
            .pm-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(4,8,16,0.92);
                backdrop-filter: blur(8px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
            }
            .pm-overlay.open {
                opacity: 1;
                visibility: visible;
            }

            .pm-panel {
                width: 90vw;
                max-width: 1100px;
                max-height: 85vh;
                background: #0a1020;
                border: 1px solid #1a2d50;
                border-radius: 4px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                transform: translateY(20px) scale(0.98);
                transition: transform 0.3s ease;
            }
            .pm-overlay.open .pm-panel {
                transform: translateY(0) scale(1);
            }

            /* ── PANEL HEADER ── */
            .pm-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 24px;
                background: #080e1c;
                border-bottom: 1px solid #152240;
                flex-shrink: 0;
            }
            .pm-header-left {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .pm-header-title {
                font-family: 'Orbitron', monospace;
                font-size: 0.8rem;
                font-weight: 700;
                color: #ffbf00;
                letter-spacing: 0.12em;
            }
            .pm-header-subtitle {
                font-family: 'Share Tech Mono', monospace;
                font-size: 0.55rem;
                color: #4a5a6c;
                letter-spacing: 0.06em;
            }
            .pm-header-actions {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            .pm-btn {
                font-family: 'Share Tech Mono', monospace;
                font-size: 0.6rem;
                padding: 6px 14px;
                border: 1px solid #1a2d50;
                background: rgba(8,12,18,0.8);
                color: #6b7fa3;
                cursor: pointer;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                transition: all 0.2s;
                border-radius: 2px;
            }
            .pm-btn:hover {
                background: rgba(0,200,255,0.06);
                border-color: #2a3d60;
                color: #c8d6e5;
            }
            .pm-btn.export { color: #00d4aa; border-color: rgba(0,212,170,0.3); }
            .pm-btn.export:hover { background: rgba(0,212,170,0.08); }
            .pm-btn.import { color: #00c8ff; border-color: rgba(0,200,255,0.3); }
            .pm-btn.import:hover { background: rgba(0,200,255,0.08); }
            .pm-btn.close {
                color: #ff3344;
                border-color: rgba(255,51,68,0.2);
                font-size: 0.7rem;
                padding: 4px 10px;
            }
            .pm-btn.close:hover { background: rgba(255,51,68,0.08); }

            /* ── STATS BAR ── */
            .pm-stats-bar {
                display: flex;
                gap: 20px;
                padding: 10px 24px;
                background: #070d18;
                border-bottom: 1px solid #121e35;
                flex-shrink: 0;
                flex-wrap: wrap;
            }
            .pm-stat {
                font-family: 'Share Tech Mono', monospace;
                font-size: 0.55rem;
                color: #4a5a6c;
                letter-spacing: 0.05em;
            }
            .pm-stat strong {
                color: #8898a8;
            }
            .pm-stat .val-gold { color: #ffbf00; }
            .pm-stat .val-cyan { color: #00c8ff; }
            .pm-stat .val-red { color: #ff3344; }
            .pm-stat .val-green { color: #00d4aa; }

            /* ── SEARCH BAR ── */
            .pm-search-bar {
                display: flex;
                gap: 10px;
                padding: 12px 24px;
                background: #080e1a;
                border-bottom: 1px solid #121e35;
                flex-shrink: 0;
                align-items: center;
                flex-wrap: wrap;
            }
            .pm-search-input {
                flex: 1;
                min-width: 200px;
                font-family: 'Share Tech Mono', monospace;
                font-size: 0.65rem;
                padding: 8px 14px;
                background: #0b1526;
                border: 1px solid #1a2d50;
                color: #c8d6e5;
                letter-spacing: 0.04em;
                outline: none;
                border-radius: 2px;
                transition: border-color 0.2s;
            }
            .pm-search-input:focus {
                border-color: #ffbf00;
            }
            .pm-search-input::placeholder {
                color: #3a4f6f;
            }

            /* ── DOMAIN FILTER PILLS ── */
            .pm-filters {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
                align-items: center;
            }
            .pm-filter-pill {
                font-family: 'Orbitron', monospace;
                font-size: 0.45rem;
                font-weight: 500;
                padding: 4px 10px;
                border: 1px solid #1a2d50;
                background: transparent;
                color: #4a5a6c;
                cursor: pointer;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                transition: all 0.2s;
                border-radius: 2px;
            }
            .pm-filter-pill:hover {
                background: rgba(255,255,255,0.03);
                color: #8898a8;
            }
            .pm-filter-pill.active {
                border-color: var(--pill-color, #ffbf00);
                color: var(--pill-color, #ffbf00);
                background: rgba(255,191,0,0.06);
            }
            .pm-severity-select {
                font-family: 'Share Tech Mono', monospace;
                font-size: 0.55rem;
                padding: 4px 8px;
                background: #0b1526;
                border: 1px solid #1a2d50;
                color: #6b7fa3;
                outline: none;
                cursor: pointer;
                border-radius: 2px;
            }

            /* ── RESULTS LIST ── */
            .pm-results {
                flex: 1;
                overflow-y: auto;
                padding: 0;
            }
            .pm-results::-webkit-scrollbar { width: 4px; }
            .pm-results::-webkit-scrollbar-track { background: transparent; }
            .pm-results::-webkit-scrollbar-thumb { background: #1a2436; border-radius: 2px; }

            .pm-signal-row {
                display: grid;
                grid-template-columns: 100px 1fr 80px 70px 70px;
                gap: 12px;
                padding: 10px 24px;
                border-bottom: 1px solid rgba(21,34,64,0.4);
                align-items: center;
                transition: background 0.15s;
                cursor: default;
            }
            .pm-signal-row:hover {
                background: rgba(0,200,255,0.02);
            }
            .pm-signal-domain {
                font-family: 'Orbitron', monospace;
                font-size: 0.5rem;
                font-weight: 600;
                letter-spacing: 0.06em;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .pm-signal-title {
                font-size: 0.62rem;
                color: #8898a8;
                line-height: 1.4;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .pm-signal-title a {
                color: inherit;
                text-decoration: none;
                transition: color 0.2s;
            }
            .pm-signal-title a:hover {
                color: #c8d6e5;
                text-decoration: underline;
            }
            .pm-signal-source {
                font-family: 'Share Tech Mono', monospace;
                font-size: 0.5rem;
                color: #4a5a6c;
                letter-spacing: 0.04em;
            }
            .pm-signal-severity {
                font-family: 'Orbitron', monospace;
                font-size: 0.5rem;
                font-weight: 600;
                letter-spacing: 0.06em;
            }
            .pm-signal-time {
                font-family: 'Share Tech Mono', monospace;
                font-size: 0.48rem;
                color: #3a4f6f;
                letter-spacing: 0.04em;
            }

            /* ── EMPTY STATE ── */
            .pm-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 60px 20px;
                gap: 12px;
            }
            .pm-empty-icon {
                font-size: 2rem;
                opacity: 0.3;
            }
            .pm-empty-text {
                font-family: 'Share Tech Mono', monospace;
                font-size: 0.65rem;
                color: #3a4f6f;
                text-align: center;
                letter-spacing: 0.05em;
            }

            /* ── RESULTS HEADER ── */
            .pm-results-header {
                display: grid;
                grid-template-columns: 100px 1fr 80px 70px 70px;
                gap: 12px;
                padding: 8px 24px;
                background: #070d18;
                border-bottom: 1px solid #152240;
                flex-shrink: 0;
            }
            .pm-results-header span {
                font-family: 'Orbitron', monospace;
                font-size: 0.42rem;
                font-weight: 500;
                color: #3a4f6f;
                letter-spacing: 0.12em;
                text-transform: uppercase;
            }

            /* ── FOOTER ── */
            .pm-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 24px;
                background: #060c18;
                border-top: 1px solid #121e35;
                flex-shrink: 0;
            }
            .pm-footer-text {
                font-family: 'Share Tech Mono', monospace;
                font-size: 0.5rem;
                color: #3a4f6c;
                letter-spacing: 0.05em;
            }

            /* ── IMPORT FEEDBACK ── */
            .pm-import-feedback {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #0a1020;
                border: 1px solid #ffbf00;
                padding: 24px 40px;
                border-radius: 4px;
                z-index: 10002;
                font-family: 'Share Tech Mono', monospace;
                font-size: 0.7rem;
                color: #ffbf00;
                text-align: center;
                animation: pm-feedback-in 0.3s ease;
            }
            @keyframes pm-feedback-in {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }

            /* Hidden file input */
            .pm-file-input { display: none; }

            /* ── RESPONSIVE ── */
            @media (max-width: 800px) {
                .pm-panel { width: 98vw; max-height: 95vh; }
                .pm-signal-row { grid-template-columns: 80px 1fr 60px; }
                .pm-signal-source, .pm-signal-time { display: none; }
                .pm-results-header span:nth-child(4),
                .pm-results-header span:nth-child(5) { display: none; }
                .pm-results-header { grid-template-columns: 80px 1fr 60px; }
                .pm-archive-btn { left: auto; right: 350px; }
                .pm-stats-bar { gap: 10px; }
            }
            @media (max-width: 600px) {
                .pm-archive-btn { left: auto; right: 0; bottom: 26px; border-right: none; }
                .pm-header { flex-direction: column; gap: 10px; }
                .pm-search-bar { flex-direction: column; }
                .pm-stats-bar { flex-direction: column; gap: 6px; }
            }
        `;
        document.head.appendChild(style);
    }

    function createUI() {
        createStyles();

        // Archive button (bottom bar, next to signal interceptor)
        const btn = document.createElement('div');
        btn.className = 'pm-archive-btn';
        btn.id = 'pmArchiveBtn';
        btn.onclick = () => togglePanel();
        const archiveCount = getArchive().length;
        btn.innerHTML = `
            ARCHIVIO_MEMORIA
            <span class="pm-count" id="pmBtnCount">${archiveCount} SEGNALI</span>
        `;
        document.body.appendChild(btn);

        // Hidden file input for import
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.className = 'pm-file-input';
        fileInput.id = 'pmFileInput';
        fileInput.onchange = handleImport;
        document.body.appendChild(fileInput);

        // Overlay panel
        const overlay = document.createElement('div');
        overlay.className = 'pm-overlay';
        overlay.id = 'pmOverlay';
        overlay.onclick = (e) => { if (e.target === overlay) closePanel(); };

        overlay.innerHTML = `
            <div class="pm-panel">
                <div class="pm-header">
                    <div class="pm-header-left">
                        <div>
                            <div class="pm-header-title">ARCHIVIO MEMORIA</div>
                            <div class="pm-header-subtitle">PERSISTENT INTELLIGENCE ARCHIVE // v${CONFIG.version}</div>
                        </div>
                    </div>
                    <div class="pm-header-actions">
                        <button class="pm-btn export" onclick="PersistenceManager.exportJSON()">EXPORT JSON</button>
                        <button class="pm-btn import" onclick="document.getElementById('pmFileInput').click()">IMPORT JSON</button>
                        <button class="pm-btn close" onclick="PersistenceManager.closePanel()">&#10005;</button>
                    </div>
                </div>

                <div class="pm-stats-bar" id="pmStatsBar"></div>

                <div class="pm-search-bar">
                    <input type="text" class="pm-search-input" id="pmSearchInput"
                        placeholder="Cerca nei segnali... (titolo, fonte, descrizione)">
                    <div class="pm-filters" id="pmFilters"></div>
                    <select class="pm-severity-select" id="pmSeveritySelect">
                        <option value="0">TUTTI I LIVELLI</option>
                        <option value="70">CRITICAL (70%+)</option>
                        <option value="50">HIGH (50%+)</option>
                        <option value="30">MODERATE (30%+)</option>
                    </select>
                </div>

                <div class="pm-results-header">
                    <span>DOMINIO</span>
                    <span>SEGNALE</span>
                    <span>FONTE</span>
                    <span>SEVERITY</span>
                    <span>DATA</span>
                </div>

                <div class="pm-results" id="pmResults"></div>

                <div class="pm-footer">
                    <span class="pm-footer-text" id="pmFooterText">0 risultati</span>
                    <span class="pm-footer-text">HYBRID SYNDICATE // ZERO SERVER // I TUOI DATI RESTANO TUOI</span>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        panelEl = overlay;

        // Set up search/filter event listeners
        const searchInput = document.getElementById('pmSearchInput');
        let searchTimeout = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => renderResults(), 250);
        });

        document.getElementById('pmSeveritySelect').addEventListener('change', () => renderResults());

        // Build domain filter pills
        buildFilterPills();

        // Listen for new signals
        window.addEventListener('signal-intercepted', (e) => {
            if (e.detail) {
                addSignal(e.detail);
                updateBtnCount();
            }
        });
    }

    let activeDomain = 'ALL';

    function buildFilterPills() {
        const container = document.getElementById('pmFilters');
        if (!container) return;

        const domains = ['ALL', 'CLIMATE', 'GEOPOLITICS', 'ECONOMY', 'TECHNOLOGY', 'SOCIAL', 'ENERGY'];
        const colors = {
            ALL: '#ffbf00', CLIMATE: '#00c8ff', GEOPOLITICS: '#ff3344',
            ECONOMY: '#00d4aa', TECHNOLOGY: '#39ff14', SOCIAL: '#ff6633', ENERGY: '#ffbf00',
        };

        container.innerHTML = domains.map(d => {
            const active = d === activeDomain ? 'active' : '';
            return `<button class="pm-filter-pill ${active}" style="--pill-color: ${colors[d]}"
                data-domain="${d}" onclick="PersistenceManager.setDomainFilter('${d}')">${d}</button>`;
        }).join('');
    }

    function setDomainFilter(domain) {
        activeDomain = domain;
        // Update pill states
        document.querySelectorAll('.pm-filter-pill').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.domain === domain);
        });
        renderResults();
    }

    function renderResults() {
        const container = document.getElementById('pmResults');
        const footer = document.getElementById('pmFooterText');
        if (!container) return;

        const query = (document.getElementById('pmSearchInput') || {}).value || '';
        const minSeverity = parseInt((document.getElementById('pmSeveritySelect') || {}).value || '0');

        const results = searchArchive(query, {
            domain: activeDomain,
            minSeverity: minSeverity,
        });

        if (results.length === 0) {
            container.innerHTML = `
                <div class="pm-empty">
                    <div class="pm-empty-icon">&#9778;</div>
                    <div class="pm-empty-text">
                        ${getArchive().length === 0
                            ? 'ARCHIVIO VUOTO<br>I segnali verranno salvati automaticamente durante la navigazione.'
                            : 'NESSUN RISULTATO<br>Prova a modificare i filtri di ricerca.'}
                    </div>
                </div>
            `;
            if (footer) footer.textContent = '0 risultati';
            return;
        }

        container.innerHTML = results.map(s => {
            const date = new Date(s.time);
            const dateStr = date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
            const timeStr = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            const sevColor = s.severity >= 70 ? '#ff3344' : s.severity >= 50 ? '#ff8833' : s.severity >= 30 ? '#ffbf00' : '#00d4aa';
            const titleHtml = s.link
                ? `<a href="${escapeHtml(s.link)}" target="_blank" rel="noopener">${escapeHtml(s.title)}</a>`
                : escapeHtml(s.title);

            return `
                <div class="pm-signal-row">
                    <div class="pm-signal-domain" style="color: ${s.domainColor || getDomainColor(s.domain)};">
                        ${s.domainIcon || getDomainIcon(s.domain)} ${s.domain}
                    </div>
                    <div class="pm-signal-title">${titleHtml}</div>
                    <div class="pm-signal-source">${escapeHtml(s.source)}</div>
                    <div class="pm-signal-severity" style="color: ${sevColor};">SEV:${s.severity}%</div>
                    <div class="pm-signal-time">${dateStr} ${timeStr}</div>
                </div>
            `;
        }).join('');

        if (footer) footer.textContent = `${results.length} risultati`;
    }

    function renderStats() {
        const bar = document.getElementById('pmStatsBar');
        if (!bar) return;

        const stats = getStats();
        const firstDate = stats.firstSession
            ? new Date(stats.firstSession).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';

        bar.innerHTML = `
            <div class="pm-stat">SEGNALI: <strong class="val-gold">${stats.totalSignals}</strong></div>
            <div class="pm-stat">CRITICI: <strong class="val-red">${stats.criticalCount}</strong></div>
            <div class="pm-stat">SEVERITY MEDIA: <strong class="val-cyan">${stats.avgSeverity}%</strong></div>
            <div class="pm-stat">SESSIONI: <strong>${stats.totalSessions}</strong></div>
            <div class="pm-stat">PRIMA SESSIONE: <strong class="val-green">${firstDate}</strong></div>
            ${stats.newestSignal ? `<div class="pm-stat">ULTIMO SEGNALE: <strong>${new Date(stats.newestSignal).toLocaleDateString('it-IT')}</strong></div>` : ''}
        `;
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ══════════════════════════════════════════════
    // PANEL CONTROLS
    // ══════════════════════════════════════════════

    function togglePanel() {
        if (isOpen) {
            closePanel();
        } else {
            openPanel();
        }
    }

    function openPanel() {
        const overlay = document.getElementById('pmOverlay');
        if (!overlay) return;
        isOpen = true;
        overlay.classList.add('open');
        renderStats();
        renderResults();
        buildFilterPills();

        // Announce
        if (typeof CoreFeed !== 'undefined') {
            CoreFeed.addMessage('CHRONO_WEAVER', 'Archivio memoria aperto. La storia parla.');
        }
    }

    function closePanel() {
        const overlay = document.getElementById('pmOverlay');
        if (!overlay) return;
        isOpen = false;
        overlay.classList.remove('open');
    }

    function updateBtnCount() {
        const el = document.getElementById('pmBtnCount');
        if (el) {
            const count = getArchive().length;
            el.textContent = `${count} SEGNALI`;
        }
    }

    // ══════════════════════════════════════════════
    // IMPORT HANDLER
    // ══════════════════════════════════════════════

    async function handleImport(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        try {
            const result = await importJSON(file);
            showFeedback(`IMPORTAZIONE COMPLETATA: ${result.imported} nuovi segnali. Totale: ${result.total}.`, 'success');
            updateBtnCount();
            if (isOpen) {
                renderStats();
                renderResults();
            }
        } catch (err) {
            showFeedback(`ERRORE: ${err.message}`, 'error');
        }

        // Reset file input
        e.target.value = '';
    }

    function showFeedback(message, type) {
        const el = document.createElement('div');
        el.className = 'pm-import-feedback';
        if (type === 'error') {
            el.style.borderColor = '#ff3344';
            el.style.color = '#ff3344';
        }
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    // ══════════════════════════════════════════════
    // KEYBOARD SHORTCUT
    // ══════════════════════════════════════════════

    function setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            // ESC to close
            if (e.key === 'Escape' && isOpen) {
                closePanel();
            }
            // Ctrl+Shift+A to toggle archive
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                togglePanel();
            }
        });
    }

    // ══════════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════════

    function init() {
        const startup = () => {
            migrateOldArchive();
            incrementSession();
            createUI();
            setupKeyboard();

            console.log('%c[PERSISTENCE_MANAGER] v1.0 ONLINE', 'color: #ffbf00; font-weight: bold;');
            console.log('%c Archive: ' + getArchive().length + ' signals | Ctrl+Shift+A to browse', 'color: #4a5a6c;');
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startup);
        } else {
            startup();
        }
    }

    init();

    // ══════════════════════════════════════════════
    // PUBLIC API
    // ══════════════════════════════════════════════

    return {
        getArchive,
        addSignal,
        searchArchive,
        getStats,
        getStorageReport,
        cleanupExpiredSignals,
        exportJSON,
        importJSON: (file) => importJSON(file),
        openPanel,
        closePanel,
        togglePanel,
        setDomainFilter,
        updateBtnCount,
    };

})();
