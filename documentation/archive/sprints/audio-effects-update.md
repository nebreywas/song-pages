# Song Pages Audio Effects Discovery Sprint

**Status:** Proposed prototype and production-discovery sprint\
**Purpose:** Rapidly prototype, audition, compare, reject, reclassify, and promote audio effects before broad UI integration\
**Primary contexts:** Listener playback, VC Mode, streams, lightweight live performance\
**Existing evidence:** Bass Boost and Lo-Fi received positive user response during live VC testing; lightweight rewind/stutter tools are also being added as simple live-performance features\
**Related docs:**

- [Audio-systems-baseline.md](./Audio-systems-baseline.md) — shared vocabulary, transport vs graph, encapsulation, routing checklist
- [audio-pipeline.md](./audio-pipeline.md) — main / mirror / VC paths, capture, Discord/OBS constraints
- [effects-lab/evaluation-template.md](./effects-lab/evaluation-template.md) — per-effect audition worksheet

## 1. Sprint Objective

Song Pages has early evidence that users enjoy clear, named audio transformations and simple live-performance tools. Current examples include Bass Boost, Lo-Fi, rewind, and stutter.

The next step is not to build a conventional equalizer, DAW effects rack, or full DJ suite. The next step is to discover which whole-song effects are genuinely enjoyable, which temporary effects are fun on streams, which ideas enhance songs, which effects survive an entire track, which should be reclassified as live gestures, which implementations are simplest and most reliable, and where AudioWorklet materially improves results.

This is an **experimental selection sprint**. Rejecting prototypes is still a successful outcome.

## 2. Product Principle

Song Pages should offer **enjoyable alternate ways to hear and perform music** rather than **a technical audio control panel**.

The user-facing concept should be understandable through named effects and direct actions: Bass Boost, Lo-Fi, Warm, Club, Night Drive, Radio, Dream, Tape, Late Night, Rewind, Stutter, Filter Sweep.

Avoid requiring ordinary users to manipulate center frequency, Q, filter slope, compressor ratio, attack, release, arbitrary multi-band EQ, or complex routing. Technical controls may exist in the prototype harness for tuning.

## 3. Effect-First Rule

``` text
Desired listener / performer experience
        ↓
Simplest credible implementation
        ↓
Native Web Audio?
Hybrid graph?
AudioWorklet?
        ↓
Listen
        ↓
Test in Song Pages
        ↓
PROMOTE / RETUNE / RECLASSIFY / REJECT
```

Do not imitate complex DAW stacks merely because they are familiar. Do not use AudioWorklet merely because it is available. Do not avoid AudioWorklet when custom DSP materially improves the effect.

## 4. Two Effect Families

### A. Whole-Song Modes

Persistent transformations intended to remain active for most or all of a track:

-   Bass Boost
-   Lo-Fi
-   Wide
-   Warm
-   Club
-   Night Drive
-   Radio
-   Dream
-   Tape
-   Late Night
-   Mono Punch
-   Air

### B. Performance Effects

Temporary gestures intended for live triggering:

-   Rewind
-   Stutter
-   Filter Sweep
-   Echo Out
-   Momentary Low-Pass
-   Momentary High-Pass
-   Reverb Throw
-   Drop Preparation

These are different products with different acceptance criteria.

Song Pages is not attempting to recreate Serato. A deliberately small collection of fun, reliable, easy-to-trigger tools can add meaningful performance value to VC Mode and streams.

## 5. Whole-Song Mode Acceptance Standard

A whole-song candidate should meet most of these criteria:

-   **Whole-song viability:** remains enjoyable for approximately an entire song.
-   **Clear identity:** meaningful difference without a technical explanation.
-   **Enhancement potential:** improves or compellingly reinterprets a meaningful subset of songs.
-   **Distinction:** not a minor variation of an existing mode.
-   **Controlled failure behavior:** does not routinely clip, pump badly, destroy vocals, smear bass, create severe phase problems, exhaust highs, collapse intelligibility, or destabilize playback.
-   **Genre breadth or strong niche value.**
-   **Operational compatibility:** evaluate normal playback, HLS, analyser mirror, visualizers, VC Mode, track changes, enable/disable, cleanup, and capture where relevant.

## 6. Performance Effect Acceptance Standard

A performance effect should provide:

-   immediate gesture;
-   fun;
-   predictable triggering;
-   predictable recovery;
-   repeatability;
-   appropriate scope.

Do not expand a simple useful effect into a full DJ subsystem without evidence.

## 7. Tier 1 --- Highest-Priority Whole-Song Prototypes

### 7.1 Wide

**Concept:** Make the song feel larger and more enveloping without destroying center focus or bass stability.

**Desired reaction:** "This feels bigger."

**Possible directions:** frequency-aware stereo treatment, subtle decorrelation, very short delayed side path where safe, low-frequency mono preservation, gain compensation.

**Avoid:** naive full-spectrum Haas widening, phasey vocals, unstable mono compatibility, smeared bass.

**Priority:** Very high.

### 7.2 Warm

**Concept:** Reduce brittle digital aggression and add subtle body/density.

**Desired reaction:** "This sounds smoother and richer."

**Possible directions:** subtle high-frequency softening, low-mid contour, gentle waveshaping, mild compression, output compensation.

**Avoid:** muddy low mids, obvious distortion, simply reducing treble, excessive overlap with Lo-Fi.

**Priority:** Very high.

### 7.3 Club

**Concept:** Make playback feel tighter, more physical, and more assertive.

**Desired reaction:** "This feels like it belongs on a club system."

**Possible directions:** controlled low-end contour, reduction of muddy low-mid energy, percussion/presence contour, moderate compression, subtle saturation, output protection.

**Avoid:** Bass Boost 2, excessive loudness, crushed dynamics, harsh percussion.

**Priority:** Very high.

### 7.4 Night Drive

**Concept:** Darker, deeper, smoother, less brittle presentation.

**Desired reaction:** "I want to hear this version late at night."

**Possible directions:** high-shelf reduction, controlled bass contour, upper-mid smoothing, gentle compression, optional subtle stereo treatment.

**Avoid:** generic muffling, excessive bass, becoming Warm under another label.

**Priority:** High.

### 7.5 Radio

**Concept:** Focused, compressed, assertive, intentionally band-shaped presentation.

**Desired reaction:** "This sounds like a powerful broadcast version."

**Possible directions:** high-pass, low-pass, midrange focus, compression, subtle saturation.

**Avoid:** novelty telephone effect, unintelligible vocals, excessive distortion.

**Priority:** High.

### 7.6 Late Night

**Concept:** A mode intended for quieter, intimate listening.

**Desired reaction:** "This still feels full and satisfying at a restrained listening level."

**Possible directions:** controlled transients, tonal rebalance, mild compression, low-level fullness, softened aggression.

**Avoid:** simply lowering volume, overcompression, muddy bass.

**Priority:** Very high.

## 8. Tier 2 --- Strong Experimental Whole-Song Candidates

### Dream

Spacious, softened, slightly distant, immersive. Possible directions: dry path retained, `ConvolverNode` wet path, filtered reverb return, subtle delay, softened upper presence. Avoid drowning the mix or generic "more reverb."

### Tape

Warm density, softened highs, subtle analog-like instability. Begin with a native-node baseline. Investigate AudioWorklet only if custom wow/flutter materially improves the result. Avoid low-pass-plus-distortion masquerading as tape and exaggerated novelty wobble.

### Mono Punch

Dense, centered, forceful, old-school presentation. Possible directions: controlled mono/downmix path, compression, tonal contour, subtle saturation. Potentially useful for funk, soul, garage rock, old country, early house, and retro pop.

### Underwater

Immersive, strongly filtered alternate presentation that remains musically coherent. Possible directions: resonant low-pass, preserved low-frequency foundation, subtle modulation, restrained reverb. May prove better as a Performance Effect.

### Arena

Larger-space, live-event reinterpretation. Possible directions: convolution, pre-delay, filtered wet path, dynamics, tonal shaping. Avoid full-mix reverb wash and low-end mud.

### Air

More open, glossy, lifted presentation. Possible directions: careful high-shelf lift, presence shaping, dynamics/gain compensation. Avoid harshness, sibilance, and simply turning up treble.

## 9. Additional Advanced Research Candidates

### Alive

Add restrained harmonic presence and immediacy to dull or overly flat material. Possible directions: selective harmonic excitation, controlled nonlinear processing, frequency-conscious enhancement, output compensation.

**AudioWorklet relevance:** Potentially high.

### Punch

Make rhythmic attacks feel more immediate without merely increasing bass
or compressing everything. Possible directions: transient detection,
envelope tracking, attack/body distinction, restrained transient emphasis.

**AudioWorklet relevance:** Potentially high.

## 10. Performance Effects Discovery Track

**Implementation classes** (see [Audio-systems-baseline.md](./Audio-systems-baseline.md) §3):

| Class | Examples in this sprint | Mechanism |
|-------|-------------------------|-----------|
| **Transport-class** | Rewind, stutter (existing) | Authoritative `<audio>` seek / play state |
| **Graph-class** | Filter Sweep, Echo Out, momentary filters, Reverb Throw | Web Audio on the audible path (mirror when whole-song FX duck main) |

Existing rewind/stutter work stays transport-first; evaluate and polish under §18 without rewriting for graph unless audition proves transport cannot reach the bar.

### Filter Sweep

Temporary automated filter movement for transitions, builds, drops, or expressive gestures. Possible directions: automated `BiquadFilterNode`, low-pass sweep, high-pass sweep, resonance contour, defined return behavior.

**Priority:** High.

### Echo Out

Trigger a repeating tail while the dry signal drops or transitions. Possible directions: `DelayNode`, feedback path, filtered repeats, controlled decay, explicit cleanup.

**Priority:** High.

### Momentary Low-Pass

Hold or trigger a temporary muffled-down state, then recover.

**Priority:** High.

### Momentary High-Pass

Temporarily strip low end for a transition or drop setup.

**Priority:** High.

### Reverb Throw

Send a moment into a larger spatial tail without washing the entire ongoing mix.

**Priority:** Medium.

### Drop Preparation

A deliberately designed short transition effect that creates anticipation before returning to full playback. Possible ingredients: filter movement, controlled gain contour, echo, short stutter, timed release.

**Caution:** Keep simple. Do not accidentally build a full automation system.

## 11. Adaptive Whole-Song Modes

Do not begin here. First establish that static transformations are musically worthwhile.

-   **Living Bass Boost:** observe low-frequency energy and slowly adapt boost.
-   **Smart Warm:** apply more softening to brittle tracks and little change to already-dark tracks.
-   **Adaptive Wide:** keep bass centered, widen upper content, reduce widening when instability indicators rise.

Adaptive behavior must remain musically stable and should not visibly chase the analyser.

## 12. Web Audio Primitive Map

-   `BiquadFilterNode`: Warm, Club, Night Drive, Radio, Underwater, Air, Filter Sweep, momentary filters.
-   `DynamicsCompressorNode`: Warm, Club, Radio, Tape, Late Night, Mono Punch.
-   `ConvolverNode`: Dream, Arena, Reverb Throw.
-   `DelayNode`: Wide experiments, Dream, Tape modulation experiments, Echo Out.
-   `WaveShaperNode`: Warm, Club, Radio, Tape, Mono Punch.
-   `StereoPannerNode`: controlled spatial or performance experiments.
-   `ChannelSplitterNode` / `ChannelMergerNode`: Wide, Mono Punch, frequency-aware stereo processing.
-   `AnalyserNode`: future adaptive modes and diagnostics. Do not route analyser data through expensive high-frequency React state.
-   `AudioWorkletNode`: Tape wow/flutter, custom saturation, transient-aware Punch, harmonic Alive, adaptive processors, specialized stereo processing, future time-domain effects.

## 13. AudioWorklet Investigation Track

Run a bounded technical investigation alongside effect discovery.

Questions:

1.  What desired processing is impossible or awkward with native nodes?
2.  Does the current graph support inserting an `AudioWorkletNode` cleanly?
3.  Does worklet processing preserve required capture behavior?
4.  How does it interact with the analyser mirror?
5.  What is the practical CPU cost?
6.  How is module loading handled in development and packaged Electron?
7.  What happens on track change, disable, `AudioContext` suspend/resume, and window close?
8.  Can initialization failure bypass safely?
9.  Can parameters use `AudioParam` where useful?

### Recommended first worklet prototype

Build one narrow experiment: **Subtle wow/flutter modulation for Tape mode**

Reasons: bounded scope, easy to A/B, awkward enough to justify custom processing, useful lifecycle test, and capable of falling back to Tape without modulation.

Do not begin by building a generic DSP framework.

## 14. Prototype Harness

Before broad UI integration, create a deliberately temporary internal test surface.

Suggested whole-song controls:

-   Effect selector
-   Enable / bypass
-   A/B toggle
-   Internal parameter controls
-   Output trim
-   Reset
-   Optional save experimental preset
-   Debug status

Suggested performance-effect controls:

-   Trigger
-   Hold where appropriate
-   Release
-   Repeat
-   Reset transport/effect state

The prototype harness may expose technical parameters because it is for development. Production UI should not inherit this complexity automatically.

It is not necessary to connect these to hotkeys yet — the input/command system is under revision. Create a **listener-window test surface** runnable during ordinary playback (not VC-only) so effects can be auditioned across the test corpus without waiting on binding policy.

**Routing reminder:** Whole-song prototypes run on the **mirror Web Audio graph** (main ducked when FX audible). Performance graph effects must be tested for **capture path** impact — see [audio-pipeline.md](./audio-pipeline.md) and baseline §11. Effects target what the stream/listener hears, not a host-only preview bus.

## 15. Loudness and Evaluation Discipline

A louder effect often appears better even when it is not. Where practical, apply output compensation, compare bypass and processed modes at roughly similar perceived loudness, watch clipping, and document intentional loudness changes.

This is especially important for Club, Bass Boost, Warm, Tape, Radio, Mono Punch, Alive, and Punch.

## 16. Test Corpus

Use a deliberately varied internal corpus:

-   Chicago house
-   French house / disco
-   modern EDM
-   funk
-   hip-hop / rap
-   R&B
-   country
-   Americana
-   bluegrass
-   rock
-   metal
-   jazz-influenced material
-   sparse acoustic
-   dense AI-generated production
-   bright/brittle mix
-   dark mix
-   bass-heavy mix
-   bass-light mix
-   male vocal
-   female vocal
-   instrumental

A mode should not be judged from one flattering track.

## 17. Whole-Song Evaluation Method

  Criterion                      Score / Notes
  ------------------------------ ---------------
  Clearly audible                
  Distinct from existing modes   
  Whole-song listenable          
  Enhances enough songs          
  Genre breadth                  
  Strong niche value             
  Vocal preservation             
  Bass stability                 
  Fatigue risk                   
  Clipping risk                  
  Runtime stability              
  VC compatibility               
  HLS compatibility              
  Keep / revise / reject         

Verdicts: **Promote**, **Promote after tuning**, **Keep experimental**,
**Reclassify as Performance Effect**, **Reject**.

## 18. Performance Effect Evaluation Method

  Criterion                   Score / Notes
  --------------------------- ---------------
  Immediate                   
  Fun                         
  Easy to trigger             
  Predictable                 
  Clean recovery              
  Repeatable                  
  Works during VC             
  Works during visualizers    
  Transport remains correct   
  Runtime stability           
  Keep / revise / reject      

Verdicts: **Promote**, **Promote after tuning**, **Keep experimental**,
**Reclassify as Whole-Song Mode**, **Reject**.

## 19. Initial Build Order

### Phase A --- Native-node whole-song prototypes

1.  Wide
2.  Warm
3.  Club
4.  Night Drive
5.  Radio
6.  Late Night

### Phase B --- Spatial / character prototypes

7.  Dream
8.  Mono Punch
9.  Underwater
10. Arena
11. Air

### Phase C --- Performance Effects

12. Filter Sweep
13. Echo Out
14. Momentary Low-Pass
15. Momentary High-Pass
16. Reverb Throw if earlier effects justify continuation

Integrate existing rewind/stutter work into the same evaluation vocabulary without unnecessarily rewriting it.

### Phase D --- AudioWorklet investigation

17. Tape native-node baseline
18. Tape worklet wow/flutter experiment
19. Compare native vs hybrid/worklet value

### Phase E --- Advanced research

20. Alive
21. Punch

Only continue if earlier work demonstrates enough value.

### Phase F --- Adaptive experiments

22. Living Bass Boost
23. Smart Warm
24. Adaptive Wide

Only after static modes are evaluated.

## 20. Promotion Criteria

A whole-song prototype moves toward production UI only when it has a clear identity, is understandable by ear, survives full-song listening, enhances or compellingly reinterprets enough songs, is distinct from existing modes, avoids unacceptable instability, works with required playback paths, and has a sensible default without required user tweaking.

A performance effect moves toward production UI only when it is fun, immediate, predictable, recovers cleanly, survives repeated use, and adds enough expressive value to justify its control surface.

## 21. Reclassification Is a Successful Outcome

Examples:

-   Wide is excellent → promote.
-   Warm overlaps Lo-Fi → reject or retune.
-   Club only works on dance tracks but is exceptional → promote as niche.
-   Underwater is fun for 20 seconds → reclassify as Performance Effect.
-   Arena creates too much mud → reject.
-   Tape needs custom DSP → retain experimental and test worklet.
-   Air increases fatigue → reject.
-   Filter Sweep is excellent live but poor as a whole-song mode → Performance Effect.
-   Rewind is fun but not precise enough for serious DJ use → keep as lightweight stream tool rather than expanding into a Serato-like subsystem.

The purpose is to discover excellent effects, not maximize effect count.

## 22. Runtime Testing

Test promising effects in actual Song Pages workflows. Relevant combinations include ordinary playback, visualizer active, VC open, analyser active, Kudos firing, ALARE lyrics, projection window, and Discord/OBS capture where relevant.

Do not require every early prototype to pass every stress scenario before it can be heard. But do not promote an effect merely because it works in isolation.

If an effect causes problems: simplify it, optimize it, reclassify it, defer it, or remove it.

Use iterative trial and error.

## 23. Explicit Non-Goals

Do not turn this sprint into:

-   a mastering suite;
-   a DAW;
-   a generic equalizer;
-   a plugin host;
-   a full DJ workstation;
-   a Serato replacement;
-   a large preset marketplace;
-   an AudioWorklet framework rewrite;
-   a reason to destabilize capture;
-   a reason to refactor playback without evidence.

The product opportunity is a curated combination of enjoyable whole-song transformations, simple live audio gestures, VC presentation, visualizers, Kudos, lyrics, and stream-friendly interaction.

That combination is more important than reproducing professional audio software feature-for-feature.

## 24. Expected Deliverables

### A. Prototype inventory

Every effect attempted.

### B. Technical implementation note

For each candidate: native nodes, hybrid, AudioWorklet, or other relevant approach. Keep concise.

### C. Evaluation results

Promote, retune, experimental, reclassify, reject.

### D. Runtime notes

Record obvious glitches, cleanup failures, interaction problems, capture issues, and stability concerns.

### E. AudioWorklet report

For any worklet prototype: did it materially improve the effect, load reliably, clean up correctly, remain stable, and justify further worklet development?

### F. Production recommendation

A deliberately small recommended set for future UI integration.

## 25. Final Sprint Principle

The objective is not “How many Web Audio effects can Song Pages implement?”

The objective is: **Which audio transformations and live gestures make people enjoy hearing and presenting music more?**

Bass Boost and Lo-Fi have already provided evidence that whole-song transformations have value. Rewind and stutter-style tools suggest that lightweight live gestures can add fun without turning Song Pages into a full DJ suite.

The next step is systematic experimentation: build, listen, test, keep, refine, reclassify, or remove.

The best implementation is the one that produces the best effect reliably enough for the actual product.

---

## 26. Current Code Anchor (engineering)

Today’s production graph is intentionally small — see `src/audio/graph/buildGraph.ts`:

```text
MediaElementSource (mirror only)
  → bassFilter (lowshelf)
  → lofiLowpass
  → lofiDrive (waveshaper)
  → AnalyserNode
  → speakerGain → destination
```

Bass Boost and Lo-Fi are **mutually exclusive toggles** mapped to that fixed chain via `resolvePlaybackEffectParams` / `applyPlaybackEffects`. This sprint’s prototype harness should **not** require refactoring that chain on day one. Prefer:

1. A **dev-only effects lab** that can insert parallel chains or swap preset graphs on the mirror element.
2. Promotion into production only after an effect earns **Promote** and a minimal encapsulation API (`enableEffect`, etc. — baseline §9).

Mutually exclusive whole-song modes in production UI can remain a product rule even if the harness allows A/B stacking for discovery.

