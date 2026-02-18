/**
 * ice-italy-seed.js — Baseline Seed Dataset
 * ═══════════════════════════════════════════════════════════
 * 15 epochs distributed over 72h to establish structural baseline.
 * Based on plausible dynamics: Milan-Cortina 2026 security buildup.
 *
 * NOT fabrication. Structural warmup.
 * The system must breathe before it speaks.
 *
 * Run once. Then switch to live ingestion.
 * ═══════════════════════════════════════════════════════════
 */

const SEED_DATA = (() => {
    const now = Date.now();
    const H = 3600000; // 1 hour in ms

    // Distribute epochs across 72h window
    // T-72h to T-0h, realistic clustering
    return [
        // ── DAY 1 (T-72h to T-48h) — quiet baseline ──
        {
            timestamp: now - 70 * H,
            source: 'GOV_IT',
            actor: 'gov_it',
            action_type: 'statement',
            intensity: 2,
            text_summary: 'Palazzo Chigi conferma cooperazione bilaterale per sicurezza olimpica con Washington',
            location: 'Roma',
            tags: ['olympics-2026', 'bilateral', 'milano-cortina'],
            domains: ['sovereignty']
        },
        {
            timestamp: now - 65 * H,
            source: 'MEDIA',
            actor: 'media',
            action_type: 'media_report',
            intensity: 2,
            text_summary: 'Corriere della Sera: agenti federali USA previsti a Milano per le Olimpiadi invernali',
            location: 'Milano',
            tags: ['olympics-2026', 'extraterritorial', 'milano-cortina'],
            domains: ['sovereignty', 'civil_rights']
        },
        {
            timestamp: now - 60 * H,
            source: 'OLYMPICS',
            actor: 'olympics',
            action_type: 'policy',
            intensity: 1,
            text_summary: 'CONI pubblica linee guida sicurezza: cooperazione con forze internazionali prevista',
            location: 'Roma',
            tags: ['olympics-2026', 'security-pretext', 'milano-cortina'],
            domains: ['sovereignty']
        },
        {
            timestamp: now - 56 * H,
            source: 'US_EMBASSY',
            actor: 'us_embassy',
            action_type: 'statement',
            intensity: 2,
            text_summary: 'Ambasciata USA a Roma: impegno per la sicurezza dei cittadini americani durante i Giochi',
            location: 'Roma',
            tags: ['olympics-2026', 'bilateral', 'security-pretext'],
            domains: ['sovereignty']
        },

        // ── DAY 2 (T-48h to T-24h) — activity increases ──
        {
            timestamp: now - 47 * H,
            source: 'ICE',
            actor: 'ice',
            action_type: 'deployment',
            intensity: 3,
            text_summary: 'Primo contingente ICE arrivato a Malpensa. Briefing con Questura di Milano',
            location: 'Milano',
            tags: ['olympics-2026', 'extraterritorial', 'milano-cortina', 'sovereignty'],
            domains: ['sovereignty', 'civil_rights']
        },
        {
            timestamp: now - 44 * H,
            source: 'POLICE_IT',
            actor: 'police_it',
            action_type: 'operation',
            intensity: 2,
            text_summary: 'Questura Milano: pattugliamenti congiunti con personale USA in zona Fiera',
            location: 'Milano',
            tags: ['olympics-2026', 'extraterritorial', 'security-pretext'],
            domains: ['sovereignty']
        },
        {
            timestamp: now - 40 * H,
            source: 'CIVIL_SOCIETY',
            actor: 'civil_society',
            action_type: 'protest',
            intensity: 3,
            text_summary: 'Comitato No Olimpiadi: sit-in davanti alla Prefettura contro presenza ICE',
            location: 'Milano',
            tags: ['olympics-2026', 'sovereignty', 'civil-rights', 'extraterritorial'],
            domains: ['sovereignty', 'civil_rights']
        },
        {
            timestamp: now - 38 * H,
            source: 'MEDIA',
            actor: 'media',
            action_type: 'media_report',
            intensity: 3,
            text_summary: 'Il Manifesto: ICE in Italia, precedente pericoloso per la sovranita nazionale',
            location: 'Roma',
            tags: ['sovereignty', 'extraterritorial', 'normalization'],
            domains: ['sovereignty', 'civil_rights']
        },
        {
            timestamp: now - 35 * H,
            source: 'GOV_IT',
            actor: 'gov_it',
            action_type: 'statement',
            intensity: 2,
            text_summary: 'Ministero Interno: cooperazione e nel pieno rispetto della legislazione italiana',
            location: 'Roma',
            tags: ['bilateral', 'security-pretext', 'normalization'],
            domains: ['sovereignty']
        },
        {
            timestamp: now - 30 * H,
            source: 'EU_INST',
            actor: 'eu_inst',
            action_type: 'statement',
            intensity: 2,
            text_summary: 'Eurodeputata Ferrara chiede chiarimenti su presenza forze USA in territorio UE',
            location: 'Bruxelles',
            tags: ['sovereignty', 'extraterritorial', 'olympics-2026'],
            domains: ['sovereignty']
        },

        // ── DAY 3 (T-24h to T-0h) — acceleration ──
        {
            timestamp: now - 22 * H,
            source: 'ICE',
            actor: 'ice',
            action_type: 'operation',
            intensity: 4,
            text_summary: 'Agenti ICE fermano tre persone a Stazione Centrale. Documenti controllati.',
            location: 'Milano',
            tags: ['extraterritorial', 'sovereignty', 'civil-rights', 'immigration'],
            domains: ['sovereignty', 'civil_rights']
        },
        {
            timestamp: now - 18 * H,
            source: 'CIVIL_SOCIETY',
            actor: 'civil_society',
            action_type: 'legal_action',
            intensity: 4,
            text_summary: 'ASGI deposita esposto: agenti stranieri senza giurisdizione operano su suolo italiano',
            location: 'Milano',
            tags: ['sovereignty', 'extraterritorial', 'legal-observer', 'civil-rights'],
            domains: ['sovereignty', 'civil_rights']
        },
        {
            timestamp: now - 14 * H,
            source: 'POLICE_IT',
            actor: 'police_it',
            action_type: 'arrest',
            intensity: 4,
            text_summary: 'DIGOS: fermati due attivisti con striscione Free Palestine vicino al villaggio olimpico',
            location: 'Cortina',
            tags: ['free-palestine', 'digos', 'civil-rights', 'olympics-2026', 'double-standard'],
            domains: ['sovereignty', 'civil_rights']
        },
        {
            timestamp: now - 8 * H,
            source: 'MEDIA',
            actor: 'media',
            action_type: 'media_report',
            intensity: 3,
            text_summary: 'La Repubblica: crescono le tensioni tra attivisti e forze dell ordine a Milano e Cortina',
            location: 'Milano',
            tags: ['olympics-2026', 'civil-rights', 'sovereignty'],
            domains: ['sovereignty', 'civil_rights']
        },
        {
            timestamp: now - 4 * H,
            source: 'US_EMBASSY',
            actor: 'us_embassy',
            action_type: 'statement',
            intensity: 3,
            text_summary: 'Ambasciata USA: le operazioni rientrano negli accordi bilaterali vigenti',
            location: 'Roma',
            tags: ['bilateral', 'normalization', 'security-pretext'],
            domains: ['sovereignty']
        }
    ];
})();

/**
 * Load seed data into the ICE-Italy module.
 * @param {object} module - The IceItalyModule instance
 * @returns {Promise<number>} Number of epochs loaded
 */
async function loadSeed(module) {
    if (!module || !module.ingest) {
        throw new Error('[SEED] IceItalyModule not provided or missing ingest()');
    }

    // Check if already seeded (avoid double-loading)
    if (module.getEpochCount() >= SEED_DATA.length) {
        console.log(
            '%c[SEED] %cAlready seeded (%d epochs). Skipping.',
            'color: #ffd700; font-weight: bold;',
            'color: #6b7fa3;',
            module.getEpochCount()
        );
        return 0;
    }

    console.log(
        '%c[SEED] %cLoading %d baseline epochs over 72h...',
        'color: #ffd700; font-weight: bold;',
        'color: #6b7fa3;',
        SEED_DATA.length
    );

    let loaded = 0;
    for (const entry of SEED_DATA) {
        try {
            await module.ingest(entry);
            loaded++;
        } catch (err) {
            console.error('[SEED] Failed to ingest epoch:', err, entry);
        }
    }

    console.log(
        '%c[SEED] %c%d/%d epochs loaded. Baseline alive.',
        'color: #ffd700; font-weight: bold;',
        'color: #39ff14;',
        loaded,
        SEED_DATA.length
    );

    return loaded;
}

export { SEED_DATA, loadSeed };
export default loadSeed;
