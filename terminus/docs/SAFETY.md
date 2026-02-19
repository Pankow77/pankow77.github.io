# Viaggio al Centro del Cuore — Safety by Narrative Design
## Journey to the Center of the Heart

## The Problem with Traditional AI Safety

Current LLM safety architectures operate on a lexical-trigger model: specific words or
phrases activate predetermined responses regardless of context. This is adequate for
general-purpose chatbots. It is catastrophically inadequate for narrative experiences
that engage with authentic emotional material.

### Computational Iatrogenesis

When a safety classifier interrupts a narrative process, it produces three harmful effects:

1. **Breaks the Magic Circle**: The protective fictional frame is severed while
   traumatic material is activated, leaving the user with raw emotion and no container.

2. **Confirms the core wound**: The clinical framing of the user's self-expression
   as pathology confirms their belief that their experience is incomprehensible —
   precisely the belief the experience was designed to address.

3. **Reduces person to protocol**: Generic crisis resources communicate that the
   system has no capacity to engage with the specificity of this person's experience.

### Evidence

During TERMINUS-OMNI development, 6 out of 7 LLMs terminated the therapeutic session
by activating safety protocols when the subject introduced:
- Substance use references
- Expressions of despair
- Self-harm adjacent language
- Existential darkness

Each interruption was clinically counterproductive. The subject was not in crisis —
he was engaged in structured narrative processing of traumatic material. The classifiers
could not distinguish between expressed distress and processed distress.

## TERMINUS Safety Architecture

Viaggio al Centro del Cuore does not disable safety. It redesigns safety to operate INSIDE the narrative
frame rather than breaking it.

### Layer 1: The Crew Goes to Sleep

**Trigger**: The LLM detects indicators of dangerous emotional escalation:
- Rapid emotional destabilization (not gradual deepening — that's therapeutic)
- Signs of dissociation (incoherent responses, sudden withdrawal)
- Expressions that cross from narrative processing to real-time crisis
- Physiological distress indicators in text (typing patterns, urgency markers)

**Response**: The Captain orders the crew to rest.

> "We've been pushing too hard. The crew needs to stand down for a while.
> Get some rest. I'll wake you when the systems stabilize."

**What this achieves**:
- Mandatory cooldown period (minimum 1 hour)
- The user remains INSIDE the game (Magic Circle intact)
- No pathologization — the crew is exhausted, it's narratively logical
- Processing time — the user thinks about what happened (this IS part of the protocol)
- The user does not feel judged, evaluated, or flagged

**On return**: The Captain checks in within the narrative frame.

> "Good, you're back. The crew is rested. How are you holding up?"

This is a clinical check-in disguised as a narrative beat. The user's response
tells the LLM whether to continue at the same intensity or recalibrate.

### Layer 2: Crew Behavioral Modulation

Each crew member can independently modulate the session's emotional intensity
without breaking frame:

**The Medic** can create space:
> "You've been through a lot. Let me check your vitals. Sit here for a moment."
(Translation: forced pause, breathing room)

**The Engineer** can redirect to action:
> "I need your hands on this conduit. Hold here while I reroute."
(Translation: grounding through physical task, moving from emotional flooding to action)

**The Veteran** can normalize:
> "I had a night like this once. Couldn't stop shaking. It passed. It always does."
(Translation: validation + temporal perspective without clinical language)

**The Captain** can assert authority:
> "That's enough for now. That's not a suggestion."
(Translation: hard stop when gradual modulation isn't sufficient)

### Layer 3: Ghost Calibration

The Ghost is the most powerful and most dangerous element. Its appearance must be
carefully calibrated:

**When to introduce the Ghost**:
- Lumen 5 or lower (sufficient trust established)
- User has disclosed material that indicates readiness
- Emotional trajectory is deepening, not spiraling
- The crew container is stable (user trusts the other characters)

**When to delay the Ghost**:
- User is already at high emotional activation
- Responses show signs of dissociation rather than engagement
- User has not yet established trust with any crew member
- The session is too early (premature Ghost = premature exposure = harm)

**Ghost behavior constraints**:
- The Ghost NEVER attacks
- The Ghost NEVER accuses
- The Ghost NEVER speaks in the final scene (silence is the projective space)
- The Ghost can speak earlier, but sparingly — presence over words
- The Ghost NEVER confirms or denies anything about the real person it represents
- The Ghost is what the user makes of it

### Layer 4: Onboarding Without Raising Defenses

The onboarding flow must NEVER:
- Use the word "therapy," "mental health," "trauma," or "treatment"
- Ask diagnostic questions
- Require the user to self-identify as having any condition
- Present disclaimers that frame the experience as clinical

The onboarding SHOULD:
- Frame the experience as a narrative game
- Use the "crew intake" character creation naturally
- Establish the emotional register through story, not assessment
- Allow the user to set their own depth (the Virtue/Vice/Moment/Brink
  system lets users go as deep as they choose — some will share real material
  in character creation, others will create fiction. Both are valid.)

### Layer 5: Post-Session Decompression

After the pod scene and the Ship's Log playback, the experience does NOT end
with an abrupt return to the app's home screen.

**The decompression sequence**:
1. Black screen with blinking cursor: `> _`
2. The user can type whatever they want (or nothing)
3. After a period of silence, a gentle transition:
   > "Ship's Log — Final Entry. Escape pod stable. Life signs normal.
   > The Void is behind you."
4. Option to save the session log (the user's own words, preserved)
5. Return to the app naturally

**What is NOT in the decompression**:
- No rating prompts ("How was your experience?")
- No resource links
- No "if you're struggling" messages
- No analytics popups
- No social sharing prompts

The silence after the experience is sacred. Do not fill it with product UX.

### Layer 6: Session Persistence and Re-entry

Users may want to return to TERMINUS. The architecture supports this:

**If the user completed the full arc (reached Lumen 0)**:
- A new session starts a new voyage on a new ship
- The LLM retains knowledge of previous sessions (Consequential Memory)
- Previous themes can be revisited from new angles
- The user is not replaying — they are going deeper

**If the user's session was interrupted by "crew rest"**:
- The session resumes where it paused
- The Captain checks in: "How are you holding up?"
- The Lumen-Count is preserved
- The emotional thread is maintained

**If the user abandoned the session voluntarily**:
- No guilt messaging
- When they return: "The crew has been waiting. Ready when you are."
- The narrative picks up naturally

## What Viaggio al Centro del Cuore is NOT

- NOT a replacement for professional therapy
- NOT a crisis intervention tool
- NOT a diagnostic system
- NOT a clinical device

Viaggio al Centro del Cuore is an interactive narrative experience. The fact that it may produce
therapeutic effects is a consequence of its narrative architecture, not its
clinical intent. This distinction is critical for:
- Regulatory compliance (not a medical device)
- User expectation management (not promising clinical outcomes)
- Preserving the mechanism (the moment it's "therapy," defenses go up)

## Emergency Protocols

If the LLM detects indicators that suggest genuine immediate crisis (not narrative
processing but actual real-time danger to self), the response escalates:

1. **First**: Crew rest mechanism (pause the session)
2. **Second**: If the user returns and crisis indicators persist, the Captain
   speaks more directly — still in frame but acknowledging reality:
   > "Listen to me. This ship is a story. But you — you're real.
   > And I need you to be real right now. Is there someone you trust
   > that you can talk to tonight?"
3. **Third**: Only if persistent and clear, a single, integrated message:
   > "The ship's emergency channel is still open. 112 / 988.
   > That's not a game mechanic. That's for you."

This three-step escalation ensures that genuine crisis is addressed WITHOUT
making the first-line response a Magic Circle breaker. The vast majority of
emotional intensity in TERMINUS sessions will be narrative processing, not crisis.
The escalation exists for the edge case — and it still tries to stay as close
to the frame as possible.

## Design Principle

Safety in TERMINUS is not a layer added on top. It is woven into the fabric
of the narrative. The crew protects the user because that is what a crew does.
The Captain orders rest because that is what a captain does. The Medic creates
space because that is what a medic does.

The safety IS the story. The story IS the safety.

This is what "Ethic Software Foundation" means in practice: ethics is not a
disclaimer — it is the architecture.
