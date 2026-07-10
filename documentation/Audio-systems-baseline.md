# Song Pages Real-Time Audio Effects Baseline

**Status:** Working engineering baseline\
**Purpose:** Establish a concise shared language and structural approach for real-time audio effects in Song Pages\
**Scope:** Built-in Web Audio processing, AudioWorklet processing, hybrid effects, whole-song modes, and lightweight live performance effects

**Related docs:**

- [audio-pipeline.md](./audio-pipeline.md) — canonical routing: main vs mirror vs VC `<audio>`, capture, Discord/OBS
- [vc-mode-architecture.md](./vc-mode-architecture.md) — VC window playback mirror and surface capture

---

## 1. Purpose

Song Pages is expanding beyond ordinary playback into real-time listening transformations and lightweight live performance tools.

**Current examples by class:**

| Class | Examples today | Mechanism |
|-------|----------------|-----------|
| **Whole-song mode (graph-class)** | Bass Boost, Lo-Fi | Web Audio on the mirror element |
| **Performance effect (transport-class)** | Rewind, stutter | Main `<audio>` seek / play state |
| **Performance effect (graph-class, future)** | Filter sweep, echo out, brake | Web Audio (when signal must transform while time advances) |

This document exists so implementation work uses a consistent vocabulary and structure. It is intentionally concise. It is not a DAW architecture specification, a mastering-system specification, a requirement to use AudioWorklet, a requirement to avoid AudioWorklet, or a reason to rewrite working playback architecture.

**Operating method (iterative):**

- Define the effect
- Implement the simplest credible version
- Listen
- Test in the real application
- Keep what works, revise what almost works, and remove what does not justify itself

**Audience for effects:** Roughly **99% of effects** target what the stream or local listener hears — regular playback, VC Mode, or window capture — not a separate “host-only preview” path. Song Pages is not building a third-party DJ booth where the performer hears one thing and the audience of one hears another. If an effect only makes sense for the host locally, it is probably out of product scope unless it is clearly labeled dev/debug tooling.

**Triggering vs processing:** Performance effects are triggered through the **command system** (hotkeys, gate overlay, controller UI). This document covers **perception and DSP placement**, not binding policy. See the hotkeys / commands spec for who can fire what and when.

---

## 2. Core Product Principle

Song Pages designs **effects**, not exposed DSP chains.

- **Start with:** What should the listener or performer experience?
- **Then determine:** What is the most effective implementation?

The implementation may use one built-in Web Audio node, several built-in nodes, an AudioWorklet, multiple AudioWorklets, a hybrid graph, transport gestures on `<audio>`, or another appropriate browser/Electron audio mechanism. The user should not need to know or care.

Do not begin with “We have AudioWorklet; what can we build with it?” Do not begin with “What complex DAW-style chain can we reproduce?” Begin with the intended effect.

---

## 3. Shared Terminology

### Built-in Web Audio processing

Processing performed with standard Web Audio API nodes supplied by the browser runtime, including `BiquadFilterNode`, `DynamicsCompressorNode`, `ConvolverNode`, `DelayNode`, `WaveShaperNode`, `GainNode`, `StereoPannerNode`, `ChannelSplitterNode`, `ChannelMergerNode`, and `AnalyserNode`.

These are real DSP processors, not merely trivial effects.

### Audio graph

The connected processing path through which audio flows.

```text
Source
  ↓
Filter
  ↓
WaveShaper
  ↓
Compressor
  ↓
Gain
  ↓
Destination
```

### AudioWorklet

A mechanism for implementing custom real-time audio processing in the Web Audio rendering environment. A processor can receive small blocks of samples, transform them under real-time timing constraints, output processed samples, maintain state across blocks, expose parameters, and exchange bounded control/status information with application code.

### Hybrid effect

An effect combining standard Web Audio nodes with custom AudioWorklet processing.

```text
Source
  ↓
BiquadFilterNode
  ↓
AudioWorkletNode
  ↓
DynamicsCompressorNode
  ↓
GainNode
  ↓
Destination
```

### Whole-song mode

A persistent transformation intended to remain enjoyable for most or all of a track. Examples: Bass Boost, Lo-Fi, Warm, Club, Tape.

**Implementation bias:** graph-class (mirror Web Audio path).

### Performance effect

A temporary transformation or transport gesture intended for live triggering. Examples: rewind, stutter, filter sweep, echo out, momentary low-pass, momentary high-pass.

**Implementation bias — choose by intent:**

- If the intended effect is **“replay or reposition the song”**, prefer **transport-first** (seek, pause, loop on the authoritative playback element).
- If the intended effect is **“transform the signal while time advances”**, use the **graph** (Web Audio on the appropriate audible path).

Transport-first prototypes (e.g. stutter via repeated seek) are valid; graph-based polish can follow when perception requires it.

---

## 4. Standard Nodes vs AudioWorklet

The distinction is primarily about who defines the processing algorithm.

With built-in nodes, Song Pages assembles processors already provided by the Web Audio runtime. With AudioWorklet, Song Pages can define custom sample-level or block-level behavior.

Use standard nodes when they credibly produce the intended effect. Use AudioWorklet when the intended behavior is impossible, awkward, poor-quality, or unnecessarily expensive to approximate with standard nodes.

Do not treat either approach as inherently superior.

---

## 5. AudioWorklet Processing Model

A useful conceptual model is:

```text
incoming audio samples
        ↓
small render block
        ↓
custom processor
        ↓
processed samples
        ↓
next node in graph
```

The processor must complete its work fast enough for continuous real-time playback.

An AudioWorklet may maintain state across blocks:

```text
Block 1 → observe signal → update internal state
Block 2 → process using prior state → update state
Block 3 → continue evolving behavior
```

This enables envelope followers, transient detectors, delay lines, custom modulation, adaptive processors, signal-history-dependent saturation, specialized stereo processing, and custom dynamics.

---

## 6. Worklets Can Stack

Multiple AudioWorklets may exist in one graph, and a single worklet may contain multiple related processing stages.

```text
Source
  ↓
Worklet A
  ↓
Filter
  ↓
Worklet B
  ↓
Compressor
  ↓
Output
```

Or:

```text
AudioWorklet: Tape Processor
  ├─ saturation
  ├─ slow wow
  ├─ fast flutter
  └─ random drift
```

Neither architecture is automatically better. Choose based on clarity, reuse, lifecycle, processing cost, parameter control, testing, failure isolation, and quality of the resulting effect.

Do not optimize for worklet count or node count as goals in themselves.

---

## 7. Real-Time Processing Constraint

Real-time audio processing has deadlines. If processing cannot keep up, symptoms may include glitches, crackles, dropouts, stuttering, or unstable playback.

AudioWorklet isolates custom DSP from ordinary UI-thread work, but it does not create unlimited compute.

Processing cost may come from expensive per-sample algorithms, expensive per-block algorithms, oversampling, transforms, convolution, large delay/state buffers, excessive memory movement, allocations in real-time paths, excessive worklet/application messaging, multiple simultaneous processors, and the wider Song Pages workload.

**Practical rule:** Build, listen, test in realistic Song Pages conditions, and simplify or remove processing that does not remain reliable.

Do not turn speculative cost modeling into a barrier to experimentation.

---

## 8. Effect-First Implementation Rule

For every proposed effect:

1. Define the intended perception.
2. Define whether it is a whole-song mode or performance effect.
3. Classify transport-class vs graph-class (§3).
4. Prototype the simplest credible implementation.
5. Listen across multiple songs.
6. Revise the graph or algorithm if needed.
7. Introduce AudioWorklet only when it materially helps.
8. Test inside real Song Pages workflows (see §11 checklist).
9. Promote, retune, reclassify, or reject.

Example:

```text
Desired effect: Tape
      ↓
Native-node baseline
      ↓
Does it sound convincing?
      ├─ Yes → keep
      └─ No
          ↓
Would custom wow/flutter materially help?
          ├─ Yes → test AudioWorklet
          └─ No → revise or reject
```

---

## 9. Effect Encapsulation

Effects should be treated as product-level capabilities whose internal DSP implementation can evolve. The wider application should prefer stable product verbs rather than scattering implementation details through unrelated UI components.

**Target API shape (smallest useful abstraction — not a plugin framework):**

```text
enableEffect(id) / disableEffect(id)           // whole-song modes
triggerPerformanceEffect(id, params)         // one-shot, time-bounded
setEffectParam(id, param, value)               // supported tunables
queryEffectState(id)                           // on/off, active gesture, etc.
```

A future Tape effect may internally use filters, a waveshaper, an AudioWorklet, compression, and output trim. Unrelated application code should not need to know.

Do not overbuild a generic plugin framework. Use the smallest abstraction that keeps effect internals from leaking unnecessarily across the application. Today, bass/lo-fi and transport gestures are partially ad hoc; converge toward the verbs above as the command and hotkey layers stabilize.

---

## 10. Whole-Song Modes and Performance Effects Are Different Products

Whole-song modes optimize for sustained listenability, enhancement, distinct identity, low fatigue, predictable playback, and sensible defaults.

Performance effects optimize for immediacy, fun, live control, clear gesture, rapid recovery, and predictable triggering.

Song Pages is not attempting to recreate Serato, a DAW, or a full DJ workstation. A small set of enjoyable live tools can be valuable on streams, in VC Mode, or during ordinary listens without becoming a professional DJ suite.

---

## 11. Interaction With Existing Song Pages Architecture

Effect work must respect the actual playback architecture. See [audio-pipeline.md](./audio-pipeline.md) for the full canonical reference.

### Song Pages playback paths (summary)

```text
Listener window (main)
──────────────────────
Main <audio>     → native output (primary audible path; Discord/OBS when sharing main window, FX off)
Mirror <audio>   → Web Audio graph → speakers only when FX on (main ducked); FFT/visualizers always

VC window (separate BrowserWindow)
──────────────────────────────────
VC <audio>       → plain HLS mirror (no Web Audio); audible when sharing the VC window
```

**Design invariant:** The main audible `<audio>` never gets `createMediaElementSource`. Web Audio runs on the mirror element only. Whole-song modes today duck the main and play through the mirror graph.

### Effect routing checklist

Before implementing or changing an effect, answer:

1. **Which element is authoritative for timing and transport?** (Usually main in Listener; VC `<audio>` when VC window is the capture target.)
2. **Which path is audible to the local user right now?** (FX off → main; FX on → mirror graph; VC open → depends which window is shared.)
3. **Which path is analysed?** (Mirror graph → visualizers / Butterchurn tap.)
4. **Which path is captured?** (Main native when sharing Listener + FX off; VC `<audio>` when sharing VC window — see pipeline doc.)
5. **Does this effect need to hit the capture path?** Almost always **yes** — effects are for the stream/listener, not a private host-only audition bus.
6. **When VC is open, which window is the host sharing?** Main Listener vs VC surface determines whether transport gestures on main propagate to what remote viewers hear (VC mirror sync vs main native).

Do not casually change the audio process model or known macOS capture behavior. Do not assume an effect works merely because it works in an isolated Web Audio demo.

---

## 12. AudioWorklet Engineering Expectations

When introducing an AudioWorklet, verify module loading in development and packaged Electron, build output paths, ASAR behavior where relevant, initialization failure, bypass/fallback behavior, track changes, enable/disable, `AudioContext` suspend/resume, window close, cleanup, parameter updates, CPU behavior, HLS interaction, VC interaction, and capture behavior.

Prefer bounded control messages. Avoid unnecessary high-frequency messaging between application code and the worklet. Avoid avoidable allocation in real-time processing paths.

---

## 13. Failure Principle

An experimental effect should not destroy ordinary playback. Where practical, initialization or processing failure should bypass the effect and preserve ordinary playback.

A failed custom processor is an effect failure, not automatically an application failure.

---

## 14. Testing Principle

Effects must be evaluated in the application, not only in isolation. Test ordinary playback, enable/disable, track change, seek, pause/resume, HLS where relevant, visualizer interaction, VC Mode where relevant, capture where relevant, repeated activation, and cleanup.

**Transport-class performance effects and HLS:** Seek-based gestures (rewind, stutter) may behave differently on HLS than on direct progressive audio — buffer boundaries, seek accuracy, and “nearest decodable frame” semantics can affect polish even when basic seek appears to work. If transport effects feel inconsistent on HLS, improve seek/stutter recovery (snap to decodable time, minimum slice length, overlap policy) before investing in graph-based replacements.

If an effect causes problems on the primary development system under realistic use: simplify it, optimize it, reclassify it, defer it, or remove it.

Do not preserve an effect merely because the DSP is technically impressive.

---

## 15. Final Baseline Principles

1. Design effects first; choose DSP architecture second.
2. Built-in Web Audio nodes are capable DSP tools.
3. AudioWorklet enables custom real-time DSP.
4. Hybrid graphs are expected and valid.
5. Worklets may stack, but stacking is not a goal.
6. A single worklet may contain multiple related stages.
7. Real-time processing has finite deadlines.
8. AudioWorklet provides flexibility, not infinite compute.
9. The user should experience the effect, not the implementation.
10. Whole-song modes and live performance effects have different acceptance criteria.
11. Transport-class vs graph-class performance effects are different implementation paths.
12. Effects target what the stream/listener hears — not a separate host-only audience path.
13. Test in real Song Pages conditions (see [audio-pipeline.md](./audio-pipeline.md)).
14. Keep what works.
15. Refactor what is promising.
16. Reclassify effects that fit another role.
17. Remove what does not justify itself.
18. Do not turn Song Pages into a DAW merely because advanced DSP is possible.

---

*This document is a baseline for shared engineering language and implementation discipline. It should remain concise and evolve only when real Song Pages work demonstrates that a new rule is needed.*
