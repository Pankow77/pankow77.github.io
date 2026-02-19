# Viaggio al Centro del Cuore — Product & Ethics
## Journey to the Center of the Heart

> Name established: Luna 49, 19 February 2026
> Inspired by Jules Verne's "Voyage au Centre de la Terre" (1864)

## The Product

**Viaggio al Centro del Cuore** (Journey to the Center of the Heart) is a cross-platform
interactive narrative experience built with Flutter. The user is a crew member aboard the
dying starship TERMINUS, navigating the Void with an AI-driven crew. It is sold as a game.
The therapeutic architecture is embedded in the design, invisible to the user.

### Naming Convention

| Context | Name |
|---------|------|
| App Store listing | Viaggio al Centro del Cuore |
| International markets | Journey to the Center of the Heart |
| In-game ship | TERMINUS |
| Research protocol | TERMINUS-OMNI |

## Platform

**Flutter** — single codebase for:
- iOS (App Store)
- Android (Google Play)
- Web (browser-based)
- Desktop (macOS, Windows, Linux)

## Pricing Model

**EUR 2.99 — one-time purchase.**

No subscriptions. No in-app purchases. No premium tiers. No ads.

### Why 2.99

- The price of a coffee in Milan
- Eliminates economic barriers completely
- Does not devalue the product (free = perceived as worthless)
- Accessible to students, unemployed, people in financial difficulty
- Accessible to anyone, anywhere

### The License

**Buy once. Share with anyone.**

When you purchase TERMINUS, you can give it to your partner, your friend, your
family member. There is no per-user licensing. No seat limits. No "family plan"
upsell.

One purchase can help an entire community.

This is not a business strategy. It is an ethical position. Access to emotional
tools should not be gated by recurring payments. The current mental health app
industry (Woebot, Wysa, BetterHelp) extracts monthly subscriptions from people
in pain. TERMINUS does the opposite.

## BYOK: Bring Your Own Key

TERMINUS requires an LLM to function. Rather than building our own inference
infrastructure (expensive, creates vendor lock-in, increases price), the user
provides their own API key.

**Supported models** (in order of recommended capability):
- Gemini 3 Pro (Google) — validated in Session Alpha
- Claude (Anthropic) — strong narrative capability
- GPT-4+ (OpenAI) — wide availability
- Other models as they emerge

**Why BYOK**:
- Eliminates ongoing server costs (keeps the price at 2.99)
- No vendor dependency (the protocol works across models)
- User chooses their preferred model
- Privacy: sessions go directly to the user's chosen provider
- The app provides the architecture; the user provides the engine

**Onboarding for BYOK**:
- Clear, simple instructions for obtaining an API key
- Links to each provider's key generation page
- Estimated cost per session (typically < EUR 1 in API costs)
- The total cost of a full TERMINUS experience: ~EUR 4 (app + one session of API)

## What We Sell

We sell the **architecture**, not the AI:
- The five-character system with therapeutic functions
- The Lumen-Count narrative engine
- The three-act structure with calibrated pacing
- The Ghost appearance system
- The Ship's Log recording and playback
- The "crew goes to sleep" safety mechanism
- The terminal UI (green on black, ship systems aesthetic)
- The prompt engineering that makes the LLM a narrative conductor

The AI model is the user's. The design is ours.

## Distribution

### App Stores
- iOS App Store
- Google Play Store
- Category: Games > Adventure / Narrative
- NOT listed under Health & Fitness or Medical
- Age rating: 17+ (mature themes)

### Marketing Language

**DO say**:
- "Viaggio al Centro del Cuore — an interactive narrative experience"
- "A journey into the heart of a dying starship. And into yours."
- "Five crew members. One ship. No way out."
- "What would you carry through the Void?"
- "Inspired by Jules Verne. Built for the stories we carry inside."

**DO NOT say**:
- "Therapy" / "therapeutic" / "mental health"
- "Trauma processing" / "emotional healing"
- "AI therapist" / "digital counselor"
- "Evidence-based" / "clinically validated"
- Any medical or psychological claims

### Visual Identity

- Terminal aesthetic: green/amber text on black background
- Ship systems UI (not chatbot UI)
- The Hybrid Syndicate / Ethic Software Foundation logo
- Minimal, atmospheric, no cartoon characters or friendly mascots
- The interface IS the experience — not a wrapper around it

## Ethics as Architecture

The word "ETHIC" in Ethic Software Foundation is not branding. It is a design
constraint that governs every decision:

| Decision | Ethic Principle |
|----------|----------------|
| EUR 2.99 one-time | Access should not require wealth |
| Share with anyone | Healing is communal, not transactional |
| BYOK model | No vendor lock-in, no data hoarding |
| No therapy claims | Don't raise defenses, don't make promises |
| Crew goes to sleep | Safety without pathologization |
| Ghost's silence | Respect the user's projective space |
| No analytics on content | What happens in the Void stays in the Void |
| No social sharing prompts | The experience is private by design |

## Privacy

Viaggio al Centro del Cuore does not:
- Store session content on our servers (BYOK = direct to LLM provider)
- Track emotional content or disclosures
- Build user profiles based on session data
- Share any data with third parties
- Require account creation (optional, for session persistence only)

The Ship's Log is stored locally on the user's device. It belongs to them.

## Revenue Model

At EUR 2.99 with the share-freely license, this is not a venture-scale business.
It is a sustainable, ethical product.

**Revenue covers**:
- Flutter development and maintenance
- App store fees (30% Apple/Google)
- Prompt engineering refinement
- Accessibility improvements
- Localization (multiple languages)

**Revenue does NOT need to cover**:
- AI inference costs (BYOK)
- Server infrastructure (minimal — app is client-side)
- Marketing budget (the product markets through impact)
- Investor returns (no investors, no equity, no exit strategy)

## The Alter Ego Precedent

Alter Ego (Peter Favaro, 1986) was a life simulation game that achieved cultural
impact by embedding psychological profiling in game mechanics. Players thought
they were playing a game. They emerged understanding themselves differently.

Viaggio al Centro del Cuore follows the same lineage. It is a game that does more
than entertain. But it can only do more than entertain if it is SOLD as entertainment.
The moment it becomes "therapy software," the mechanism that makes it work is destroyed.

## Development Priorities

1. **Flutter app scaffold** — terminal UI, basic navigation
2. **BYOK integration layer** — API key management, model selection
3. **Prompt engine** — the five characters, Lumen-Count, narrative flow
4. **Ship's Log** — text recording and playback system
5. **Safety system** — crew rest mechanism, modulation behaviors
6. **Ghost system** — context-aware appearance and behavior
7. **Onboarding** — crew intake (disguised character creation)
8. **Session persistence** — save/resume, multi-session support
9. **Localization** — Italian, English, Spanish, French, German, Portuguese
10. **Testing** — diverse user profiles, safety validation

## Summary

Viaggio al Centro del Cuore is a EUR 2.99 narrative experience that may change
someone's life. Not because it promises to. Because it doesn't promise anything
at all. It just tells a story. And the story does the rest.

Like Verne's explorers descending into the Earth, the user descends into the
heart of a dying ship — and discovers, at the center, something they didn't
expect to find.
