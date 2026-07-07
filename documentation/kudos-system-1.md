Kudos System MVP 1.0 Design Specification

**Status:** MVP 1.0 specification — VC integration decisions locked (see §28)\
**Target:** Song Pages desktop application, VC Mode, Projection Surface, live presentation workflows\
**Primary goal:** Turn the successful prototype heart effect into a flexible, host-configurable live visual reaction system.

# 1. Purpose

Kudos are short-lived visual reactions triggered by a VC host during song playback, Discord voice-channel sessions, Twitch streams, projected presentations, listening rooms, and related live experiences.

The existing prototype demonstrates a heart-based particle effect triggered by a keyboard command. User testing of this prototype was strongly positive.

MVP 1.0 expands that proof of concept into a reusable system supporting:

1.  **Song Pages custom images/icons**
2.  **Operating-system emoji**
3.  **Short words or phrases**
4.  **Words/phrases combined with emoji**

**A Kudo is a temporary visual reaction rendered over the active presentation surface.**

Kudos are not permanent page content, a full title-card system, a replacement for overlays, or a general-purpose motion-graphics editor.

# 2. Core Product Principles

## 2.1 Fast Host Reaction

A Kudo should feel immediate.

Examples:

``` text
Hearts rising
Stars bursting
🔥 raining
AWESOME! slamming onto screen
LOVE THIS ❤️ ballooning into view
```

## 2.2 Curated Capability, Not Broadcast-Software Complexity
Expose controls with obvious creative value:

-   content
-   effect
-   duration
-   speed
-   density where relevant
-   size
-   origin/placement where relevant
-   font for text
-   basic text styling

Avoid raw particle physics, animation curves, shader editing, keyframes, timelines, or unrestricted scene composition.

## 2.3 Reusable Engines

Separate:

-   **Kudo content**
-   **Kudo effect behavior**
-   **Kudo configuration**
-   **Kudo triggering**
-   **Kudo rendering**

A heart is content. `Rise` is behavior. `3 seconds` is timing. `Bottom` is origin.

## 2.4 Presets Are the Host-Facing Unit
Hosts should save named Kudo presets such as:

``` text
Love It
Awesome
Banger
Beautiful
Big Win
Funny
Applause
```

A preset can then be triggered from the VC Command Input System. (Full spec for this system is forthcoming and will be a sprint coming after this)

# 3. MVP 1.0 Kudo Content Types

## 3.1 Song Pages Custom Images / Icons

Song Pages already has a custom set of graphical images/icons. These icons are located in 	src/assets/images/kudo-images

They contain 26 specific elements in two forms:

	[element]-single-color-image = a mostly b/w/transparent png file for flat styled look
	[element]-grays-image = lots of shading to effect a more shaded styled look

When creating a built-in icon Kudo, the host may choose the asset variant behavior:
- Flat only
- Shaded only
- Mixed
If Mixed is selected, the particle engine may randomly choose between available variants of the selected icon elements.

Current characteristics:

-   curated by Song Pages
-   26 icons in 2 variants (flat / shaded)
-   visually consistent
-   suitable for particle and reaction effects

Examples may include:

``` text
Heart
Multiple Hearts
Diamond
Star
Sparkle
Lightning
Radio
Microphone
Crown
Musical Symbol
808
Piano Keys
Other approved Song Pages icons
```

The exact built-in library should come from the existing Song Pages asset set and may expand over time.

Reference assets by stable asset ID.

``` typescript
interface BuiltInKudoAsset {
  id: string;
  variant: 'single-color' | 'grays';
  label: string;
  assetPath: string;
  category?: string;
}
```
The renderer should load the built-in Kudo asset registry from the actual asset directory or a generated manifest. Do not hard-code file paths throughout the particle engine.

## 3.2 Operating-System Emoji
Hosts may use emoji as Kudo elements.

Examples:

``` text
❤️
🔥
💯
👏
😂
😭
⭐
✨
🎵
🎉
👑
⚡
```

MVP 1.0 does **not** require Song Pages to ship or maintain a custom emoji set.

**Emoji should render using the user's default operating-system emoji/font behavior.**

Appearance may differ between macOS and Windows. That variation is acceptable for MVP 1.0.

The host should be able to enter or select emoji using normal operating-system input methods.

Support:

``` text
1–4 emoji elements per particle-style Kudo
```

Example:

``` text
❤️ 💜 ⭐ ✨
```

The renderer may randomly mix them during the effect.

### Emoji Implementation Note
Do not assume one Unicode code point equals one visible emoji.

Avoid incorrectly splitting:

-   emoji variation selectors
-   skin-tone modifiers
-   zero-width-joiner sequences
-   flags
-   multi-code-point emoji

Use grapheme-aware handling where practical.

## 3.3 Words / Short Phrases
Hosts may define short text reactions.

Examples:

``` text
AWESOME!
BANGER!
WOW!
NO NOTES!
LOVE THIS!
AGAIN!
BEAUTIFUL!
```

MVP 1.0 maximum:

``` text
18 characters
```

The exact counting rule should be implemented consistently and documented in the UI.

## 3.4 Words + Emoji
Hosts may combine short text with emoji.

Examples:

``` text
LOVE THIS ❤️
🔥 BANGER!
WOW! 🤯
NO NOTES! 💯
AGAIN! 👏
```

Words + Emoji are a first-class MVP 1.0 content type.

This mode uses the text-rendering pipeline while preserving emoji through normal OS rendering.

**Words + Emoji are a single composed text reaction, not necessarily a separate particle layer.**

# 4. Kudo System Model

``` text
Kudo Preset
├── Content
├── Effect
├── Timing
├── Placement
├── Style
└── Trigger Bindings
```

Recommended content type:

``` typescript
type KudoContentType =
  | 'builtin-assets'
  | 'emoji'
  | 'text'
  | 'text-emoji';
```

# 5. Particle-Style Kudos
Particle-style Kudos use repeated visual elements moving across the active surface.

Supported MVP content sources:

``` text
Song Pages custom images/icons
OS emoji
```

## 5.1 Element Count

A particle Kudo may define:

``` text
1–4 visual elements
```

Examples:

``` text
Heart
```

or:

``` text
Heart
Star
Sparkle
Diamond
```

or:

``` text
❤️
💜
⭐
✨
```

## 5.2 Multi-Element Behavior

MVP 1.0 default:

``` text
Random Mix
```

When multiple elements are configured, each new particle selects one configured element.

Weighted random, sequencing, and advanced emission rules are not required for MVP 1.0.

# 6. Particle Effect Library

The same content should be reusable across multiple behaviors.

``` text
Heart + Rise
Heart + Rain
Heart + Burst
Heart + Drift
```

Recommended MVP 1.0 effect set:

## 6.1 Rise

Elements spawn near the lower region and float upward.

## 6.2 Rain

Elements enter from above and fall downward with modest lateral variation.

## 6.3 Burst

Elements explode outward from an origin point.

## 6.4 Fountain

Elements launch upward and arc or fall.

## 6.5 Drift

Elements move slowly across the surface with loose variation.

## 6.6 Swarm

Many elements cross the surface in loosely coordinated motion.

## 6.7 Scatter

A quick randomized directional spray.

## 6.8 Spiral

Elements rotate around a center while moving inward or outward.

## 6.9 Wave

Elements sweep across the surface in a curved or phased band.

## 6.10 Pop

Elements appear at distributed positions, scale into view, and disappear.

## 6.11 Pulse

Elements appear in distributed positions and pulse through scale and/or opacity.

## 6.12 Comet

Elements move rapidly in a direction with optional visual trailing.

### MVP Guidance

A strong 8--12 effect library is preferable to a larger weak library.

All effects should be registered by stable effect ID.

# 7. Particle Controls

Recommended MVP controls:

``` text
Length
Speed
Density
Size
Origin
Variation
```

## 7.1 Length

Total approximate Kudo duration.

Suggested initial range:

``` text
0.75–8 seconds
```

Centralize limits.

## 7.2 Speed

Recommended UI:

``` text
Slow
Normal
Fast
```

or a bounded slider.

Do not expose raw velocity units.

## 7.3 Density

Recommended UI:

``` text
Low
Medium
High
```

or a bounded slider.

Enforce a hard safety maximum.

## 7.4 Size

Recommended UI:

``` text
Small
Medium
Large
```

or a bounded slider.

## 7.5 Origin

Recommended choices:

``` text
Auto
Center
Top
Bottom
Left
Right
Random
```

Examples:

``` text
Rise + Bottom
Rain + Top
Burst + Center
```

## 7.6 Variation

Controls randomized differences in:

-   scale
-   trajectory
-   timing
-   rotation
-   spawn position

Recommended UI:

``` text
Low
Medium
High
```

# 8. Text Kudos

Text Kudos display a short host-defined reaction.

Maximum:

``` text
18 characters
```

Examples:

``` text
AWESOME!
BANGER!
WOW!
NO NOTES!
LOVE THIS!
```

## 8.1 Text Controls

Recommended MVP controls:

``` text
Text
Font
Effect
Length
Text Color
Outline
Shadow
Placement
```

## 8.2 Curated Fonts

Use our existing font mappings

## 8.3 Outline

Recommended choices:

``` text
Off
Light
Heavy
```

## 8.4 Shadow

Recommended choices:

``` text
Off
Soft
Hard
```

## 8.5 Placement

Recommended choices:

``` text
Auto
Center
Top
Bottom
Left
Right
```

Some draw effects may constrain or reinterpret placement.

# 9. Text Draw Effect Library

Recommended MVP 1.0 set:

## 9.1 Slam

Text rapidly enters and lands with strong scale impact.

## 9.2 Balloon

Text inflates from small to oversized and settles.

## 9.3 Echo

Text appears with repeated translucent offset copies.

## 9.4 Stamp

Text lands with a hard positional and/or rotational stamp effect.

## 9.5 Type

Characters appear rapidly in sequence.

## 9.6 Flash

Text appears abruptly with a short brightness or opacity pulse.

## 9.7 Bounce

Text enters and rebounds before settling or disappearing.

## 9.8 Drop

Text falls from above and lands.

## 9.9 Zoom

Text moves from apparent depth toward the viewer.

## 9.10 Wave

Characters or word segments move in sequential vertical phase.

### MVP Guidance

Ten strong text effects are sufficient. Ship fewer if specific effects prove weak or redundant.

# 10. Words + Emoji Kudos

Words + Emoji use the text pipeline while preserving OS-rendered emoji.

Examples:

``` text
LOVE THIS ❤️
🔥 BANGER!
WOW! 🤯
NO NOTES! 💯
```

Support the same controls as Text Kudos:

``` text
Font
Effect
Length
Color
Outline
Shadow
Placement
```

## 10.1 Emoji Rendering

Emoji should use OS-default rendering behavior.

Do not recolor emoji through text color controls where the platform
renders them as color emoji.

## 10.2 Character Limit

The host-facing maximum remains approximately:

``` text
18 characters
```

Use grapheme-aware counting rather than naïve JavaScript `.length` where practical.

# 11. Hybrid Composition
MVP 1.0 should support or architect for:

``` text
Text or Words+Emoji Layer
+
Particle Layer
```

Example:

``` text
Text:
AWESOME!

Text Effect:
Slam

Particle Elements:
Star + Sparkle

Particle Effect:
Burst
```

Result:

``` text
AWESOME! slams into view
Stars and sparkles burst around it
Entire event clears
```

## 11.1 Architecture Rule

Hybrid should compose existing engines:

``` text
Text Renderer
+
Particle Renderer
=
Hybrid Kudo
```

Do not build an unrelated third animation engine.

## 11.2 MVP Scope Control

If full Hybrid authoring threatens the 1.0 sprint, preserve the architecture and defer the full UI.

# 12. Kudo Presets

Hosts should save reusable named Kudos.

Examples:

``` text
Love It
Awesome
Banger
Beautiful
Big Win
Funny
Applause
```

Recommended conceptual model:

``` typescript
interface KudoPreset {
  id: string;
  name: string;
  contentType:
    | 'builtin-assets'
    | 'emoji'
    | 'text'
    | 'text-emoji'
    | 'hybrid';

  particle?: ParticleKudoConfig;
  text?: TextKudoConfig;

  createdAt?: number;
  updatedAt?: number;
}
```

# 13. Suggested Data Contracts

## 13.1 Particle Elements

``` typescript
type ParticleElement =
  | {
      type: 'builtin-asset';
      assetId: string;
    }
  | {
      type: 'emoji';
      value: string;
    };
```

## 13.2 Particle Configuration

``` typescript
interface ParticleKudoConfig {
  elements: ParticleElement[];
  effectId: string;
  durationMs: number;
  speed: number;
  density: number;
  size: number;
  variation: number;

  origin:
    | 'auto'
    | 'center'
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'random';
}
```

## 13.3 Text Configuration

``` typescript
interface TextKudoConfig {
  value: string;
  effectId: string;
  fontId: string;
  durationMs: number;
  textColor?: string;

  outline:
    | 'off'
    | 'light'
    | 'heavy';

  shadow:
    | 'off'
    | 'soft'
    | 'hard';

  placement:
    | 'auto'
    | 'center'
    | 'top'
    | 'bottom'
    | 'left'
    | 'right';
}
```

The exact contracts may adapt to existing Song Pages architecture.

# 14. Rendering Surface Rules

## 14.1 Active Surface

For the first implementation sprint (§28), Kudos render **only** on the active **VC Mode** presentation surface.

Broader surface support (Main Player, legacy Projection) is architectural future work — not this sprint:

``` text
VC Surface (this sprint)
├── Existing Surface Content
├── Active Visualizer if present
└── Temporary Kudo Layer
```

## 14.2 No Duplicate Surface Rendering

Do not render the same Kudo independently on multiple presentation surfaces merely because multiple windows exist.

## 14.3 Visualizer Coexistence

Kudos may coexist with the one active visualizer because Kudos are temporary composited reactions rather than independent persistent visualizer sessions.

``` text
Active Surface
├── Existing Surface Content
├── Active Visualizer if present
└── Temporary Kudo Layer
```

Centralize z-index/composition order.

# 15. Concurrency and Retriggering

Repeated reactions are part of live use.

Recommended rule:

``` text
Maximum simultaneous active Kudo instances: 3
```

Centralize and performance-test the cap.

## 15.1 At Capacity

Recommended initial policy:

``` text
Oldest active Kudo is ended
Newest Kudo is admitted
```

## 15.2 Same-Preset Retrigger

Recommended MVP behavior:

``` text
Retrigger
→ Create another instance
→ Respect global concurrency cap
```

This preserves the fun of repeated reactions.

# 16. VC Command Input System Integration

> **Sprint note (§28):** Per-preset command mapping is **deferred**. This sprint uses ⌘⌥P / Ctrl+Alt+P to cycle through presets in host-defined order for testing only.

Kudo presets integrate with the shared VC Command Registry.

Example:

``` text
Kudo Preset: Love It
→ Command ID: trigger-kudo-love-it
```

Possible bindings:

``` text
Safe Direct Hotkey
Gated Command Key
F13–F24
```

Example:

``` text
Gated H
→ Trigger Hearts Kudo

Gated A
→ Trigger AWESOME! Kudo

F17
→ Trigger Banger Kudo
```

All triggers resolve through the shared command architecture.

Do not create a separate incompatible hotkey system for Kudos.

# 17. Kudo Configuration UI

Recommended workflow:

``` text
Create Kudo
→ Name Preset
→ Choose Content Type
→ Configure Content
→ Choose Effect
→ Configure Basic Behavior
→ Preview
→ Save
→ Optionally Assign Command Binding
```

## 17.1 Content Type Choices

``` text
Song Pages Icons
Emoji
Words
Words + Emoji
```

If Hybrid authoring ships:

``` text
Hybrid
```

## 17.2 Particle Editor

For Song Pages Icons:

-   choose 1--4 built-in assets
-   choose effect
-   length
-   speed
-   density
-   size
-   origin
-   variation

For Emoji:

-   enter/select 1--4 emoji
-   choose effect
-   same basic controls

## 17.3 Text Editor

For Words:

-   enter up to 18 characters
-   choose font
-   choose draw effect
-   length
-   color
-   outline
-   shadow
-   placement

For Words + Emoji:

-   same controls
-   preserve OS-default emoji rendering

## 17.4 Preview
The host should be able to preview a Kudo before saving.

Preview should use a representative bounded surface and should not require starting VC Mode.

# 18. Built-In Starter Presets
MVP 1.0 should ship with useful presets.

Suggested examples:

``` text
Hearts Rise
Stars Burst
Sparkles Drift
Lightning Scatter
Emoji Pop
Applause 👏
AWESOME! Slam
LOVE THIS ❤️ Balloon
BANGER! Stamp
NO NOTES! 💯 Flash
```

The successful prototype heart behavior should be preserved as a starter preset unless technical reasons require replacement.

# 19. Performance Requirements

Kudos run during audio playback and may coexist with visualizers and VC rendering.

Therefore:

-   enforce particle-count limits
-   clean up completed animation instances
-   cancel timers and animation frames on destruction
-   avoid unbounded DOM node growth
-   avoid unbounded canvas objects
-   avoid duplicate render loops
-   reuse assets where practical
-   cache built-in graphical assets
-   test with an active visualizer
-   test with three simultaneous Kudos
-   test in Projection and VC Mode

The system should degrade gracefully rather than destabilize playback.

# 20. Accessibility and Host Safety

## 20.1 Reduced Motion

Where practical, respect reduced-motion preferences.

Possible behavior:

-   reduce particle count
-   reduce travel distance
-   replace extreme motion with fade/scale
-   disable especially aggressive effects

## 20.2 Flashing

Avoid rapid high-intensity flashing patterns.

The `Flash` text effect should be impactful without becoming a repeated strobe.

## 20.3 Host Preview

Hosts should be able to preview effects before live use.

# 21. Persistence

Kudo presets persist across app sessions.

``` typescript
interface KudoSystemState {
  version: number;
  presets: KudoPreset[];
}
```

Version the state for future migration.

# 22. Asset and Font Licensing

Any shipped custom image, icon, font, or third-party animation code must have documented licensing.

Where open-source components require attribution:

-   record them in the existing Song Pages credits process
-   include required notices
-   preserve license text where required

OS-default emoji do not require Song Pages to ship a custom emoji asset library. Do not copy platform emoji artwork into the app as bundled assets without separate rights review.

# 23. MVP 1.0 Implementation Phases

## Phase 1 --- Core Kudo Registry

Implement:

-   stable Kudo preset IDs
-   content type model
-   effect IDs
-   persistence
-   trigger API

## Phase 2 --- Built-In Asset Particle Engine

Implement:

-   existing Song Pages custom icons
-   1--4 elements
-   random mixing
-   initial particle effects
-   duration
-   speed
-   density
-   size
-   origin
-   variation

## Phase 3 --- OS Emoji Particle Support

Implement:

-   1--4 emoji elements
-   grapheme-safe handling
-   OS-default rendering
-   same particle effect pipeline where technically practical

## Phase 4 --- Text Kudo Engine

Implement:

-   18-character host text
-   curated fonts
-   text effects
-   duration
-   color
-   outline
-   shadow
-   placement

## Phase 5 --- Words + Emoji

Implement:

-   mixed text and emoji
-   grapheme-aware counting
-   OS-default emoji rendering
-   text effect compatibility

## Phase 6 --- Preset Editor and Preview

Implement:

-   create
-   edit
-   delete
-   preview
-   save
-   starter presets

## Phase 7 --- VC Command Integration

Implement:

-   command IDs for presets
-   Safe Direct mapping where available
-   gated command mapping
-   F13--F24 mapping

## Phase 8 --- Hybrid Composition

If sprint capacity permits:

-   text layer
-   particle layer
-   synchronized start
-   unified cleanup

If deferred, preserve compatible data architecture.

# 24. Acceptance Criteria

MVP 1.0 is successful when:

1.  The existing heart prototype concept is represented by the new system.
2.  Hosts can create a Kudo using Song Pages custom icons.
3.  Hosts can select 1--4 built-in icon elements.
4.  Hosts can create a Kudo using OS-default emoji.
5.  Hosts can define 1--4 emoji elements.
6.  Emoji handling does not naïvely split common multi-code-point emoji.
7.  Hosts can create a short Words Kudo.
8.  Words Kudos enforce the configured maximum length.
9.  Hosts can create Words + Emoji Kudos.
10. OS-default emoji rendering is preserved.
11. Particle content is separate from particle behavior.
12. The same icon can be used with multiple effects.
13. The same emoji can be used with multiple effects.
14. Particle Kudos support duration.
15. Particle Kudos support speed.
16. Particle Kudos support density.
17. Particle Kudos support size.
18. Particle Kudos support origin.
19. Particle Kudos support variation.
20. Text Kudos support curated fonts.
21. Text Kudos support multiple draw effects.
22. Text Kudos support basic styling.
23. Hosts can preview a Kudo.
24. Hosts can save named presets.
25. Presets persist across sessions.
26. Kudos render on the active presentation surface.
27. Kudos do not create duplicate independent rendering on multiple surfaces.
28. Kudos can coexist with the active visualizer.
29. Repeated triggers are bounded by a concurrency cap.
30. Completed Kudos clean up rendering resources.
31. Kudo presets integrate with the VC Command Registry.
32. Kudo presets can be triggered through gated commands.
33. Kudo presets can be mapped to F13--F24.
34. Safe Direct mappings may trigger Kudos where configured.
35. The system ships with useful starter presets.
36. The prototype-style Hearts reaction remains available as a starter experience.
37. The system remains stable during audio playback.
38. The system remains stable with an active visualizer.
39. The system remains stable with the maximum supported concurrent Kudos.
40. Hybrid composition is either implemented or preserved as a compatible architectural extension.

# 25. Explicit Non-Goals for MVP 1.0

MVP 1.0 does not require:

-   a full motion-graphics editor
-   keyframe timelines
-   raw physics editing
-   custom shaders for every Kudo
-   arbitrary JavaScript effects
-   custom Song Pages emoji artwork
-   an emoji marketplace
-   uploaded user particle graphics
-   unrestricted font uploads
-   animation curve editors
-   unlimited concurrent Kudos
-   permanent broadcast overlays
-   complex scene composition
-   synchronized lyric interaction
-   native Stream Deck integration
-   native MIDI integration
-   cloud preset sharing
-   public preset marketplace

# 26. Future Extensions

Potential future additions include:

-   uploaded host graphics
-   artist logos
-   transparent PNG/WebP particle assets
-   more Song Pages icon packs
-   weighted multi-element mixing
-   sequenced particle elements
-   more particle effects
-   more text effects
-   Kudo packs
-   preset import/export
-   shared community presets
-   artist-specific Kudos
-   MIDI triggering
-   OSC triggering
-   remote/mobile triggering
-   audience-triggered reactions
-   timed Kudo sequences
-   command macros
-   beat-aware triggering
-   audio-reactive Kudos

These are not MVP 1.0 requirements.

# 27. Core Product Rule

**A Song Pages Kudo is a short-lived host-triggered visual reaction rendered over the active presentation surface.**

MVP 1.0 supports four primary host-facing content types:

``` text
Song Pages Custom Images / Icons
OS-Default Emoji
Words
Words + Emoji
```

These content types combine with curated particle behaviors, text draw effects, basic timing and placement controls, saved presets, and the shared VC Command Input System.

**The system should preserve the immediacy and emotional success of the original heart prototype while expanding it into a flexible live reaction language for VC hosts.**

# 28. Song Pages VC integration (locked decisions)

Decisions locked for the first implementation sprint (2026-07). Supersede conflicting guidance elsewhere in this document where noted.

## 28.1 Presentation surface

- **VC Mode only** for this sprint. Kudos render on the **active VC presentation surface** and follow its lifecycle.
- **Not in scope:** Main Player surface, legacy Visualizer projection window, or any non-VC surface.
- If VC Mode is **not active**, triggering a Kudo does **nothing**.

## 28.2 Triggering (interim — pre Command Input sprint)

- Reuse the existing **Praise** trigger: **⌘⌥P** (Mac) / **Ctrl+Alt+P** (Windows) via `electron/vcHotkeys.js`.
- **Remove** the hard-coded heart prototype. No parallel legacy praise renderer.
- Each valid trigger activates the **next host-created Kudo preset in sequence** (cycle):
  - Trigger 1 → preset 1, trigger 2 → preset 2, … trigger N → preset N, trigger N+1 → preset 1.
- **Stable cycle order:** host-defined preset list order as persisted (explicit `order` / array index — **not** alphabetical, insertion time, or `updatedAt`).
- If **zero** presets exist, the trigger does **nothing**.
- This cycling behavior is **temporary test infrastructure** to verify save → resolve → trigger → render → replay. **Do not** build per-preset command mapping in this sprint; that belongs to the VC Command Input System sprint (§16).

## 28.3 Hybrid composition

- **In scope** for MVP 1.0 this sprint.
- Implement in phases after particle and text engines:
  - Phase 1 — Particle Kudos
  - Phase 2 — Text / Words + Emoji Kudos
  - Phase 3 — Hybrid composition
- Hybrid composes existing **particle + text** renderers — no third animation engine.
- **One text layer + one particle layer** per Hybrid preset, single trigger, unified cleanup. Not a general layer editor.

## 28.4 Effect library phasing

Target remains the full MVP effect lists (§6, §9). Implement in phased waves; later phases are **not** optional scope removal once earlier phases ship.

**Particle**

| Phase | Effects |
|-------|---------|
| A | Rise, Rain, Burst, Drift |
| B | Fountain, Swarm, Scatter, Spiral |
| C | Wave, Pop, Pulse, Comet |

**Text**

| Phase | Effects |
|-------|---------|
| A | Slam, Balloon, Echo, Type |
| B | Stamp, Flash, Bounce, Drop, Zoom, Wave |

## 28.5 Heart prototype migration

- **Delete** the hard-coded `PraiseHearts` implementation.
- Preserve heart behavior only as a **normal preset** (built-in starter and/or host-created) using the new particle engine (e.g. Hearts + Rise).
- ⌘⌥P remains only as the **cycling test trigger** until the Command Input sprint.

## 28.6 Preset ordering

Persist presets in a **versioned ordered list**. Cycle index advances through that list. Reorder UI may ship with the preset editor; until then, creation order defines cycle order.
