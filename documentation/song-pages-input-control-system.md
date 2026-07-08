SONG PAGES INPUT CONTROL SYSTEM

# Song Pages VC Command Input System --- MVP 1.0 Design Specification

**Status:** Proposed MVP 1.0 specification\
**Target:** Song Pages desktop player, VC Mode, projection/live presentation workflows\
**Primary goal:** Provide a safe, flexible, extensible command-input architecture for live hosts without requiring a large set of risky global shortcuts.

Option+Command+L is now reserved for VC mode.

# 1. Purpose

The Song Pages VC Command Input System provides three complementary input layers:

1.  **Safe Direct Hotkeys**
2.  **Gated Command Entry with Dynamic Overlay**
3.  **Extended Function Keys F13--F24**

These are not separate command systems.

These systems will also lay the foundation for a visual control window that can offer further control of VC mode by the host streamer. The visual control window is a sprint currently under design review.

**They are three input paths into one shared Song Pages command registry.**

Future inputs such as MIDI, OSC, remote control, mobile companions, foot pedals, or dedicated broadcast controllers should also be able to invoke the same registry without rewriting command behavior.

# 2. Core Product Principles

## 2.1 Safety Over Maximum Shortcut Count

The direct-hotkey pool should be deliberately limited. A shortcut enters the Safe Direct pool only after audit against current default behavior relevant to:

-   macOS
-   Windows
-   Chromium/Electron
-   major OS accessibility shortcuts
-   major browser/application conventions relevant to Song Pages

The goal is not every technically registerable shortcut.

**The goal is a small curated cross-platform intersection with low default collision risk.**

No shortcut can be guaranteed against arbitrary third-party software, user remapping, keyboard utilities, accessibility customization, or future OS changes. Runtime registration failure must be handled gracefully.

NOTE: OCAW referenced in this document is short hand for Option+Command (Mac) / Alt+Windows (Windows) OCAW refers to the similar mapping of keys on these two major OS keyboards.

## 2.2 Broad Control Through Gating

The limited size of the Safe Direct pool is intentional. Broad keyboard control comes from a gated command layer:

``` text
Safe Gate Chord
→ Gate Opens
→ Overlay Appears
→ Next Mapped Key Executes
→ Gate Closes
```

This allows semantic keys such as:

``` text
L = Lyrics
V = Visualizer
C = Cover
H = Host
N = Next
1 = Scene 1
```

without globally stealing ordinary typing keys.

## 2.3 Hardware Control Through F13--F24

F13--F24 form a dedicated extended-control mapping pool for:

-   Stream Deck
-   macro pads
-   programmable keyboards
-   gaming peripherals
-   foot pedals
-   MIDI-to-keystroke bridges
-   automation tools
-   specialized broadcast controllers

## 2.4 One Command Registry

All input paths invoke the same command IDs.

``` text
Safe Direct Hotkey → toggle-lyrics
Gated L           → toggle-lyrics
F17               → toggle-lyrics
```

The action implementation exists once.

# 3. System Architecture

``` text
           INPUT SOURCES

        Safe Direct Hotkeys
                │
        F13–F24 Extended Input
                │
        VC Command Gate
                │
        Future MIDI / OSC / Remote
                │
                ▼
      SONG PAGES INPUT BINDING SYSTEM
                │
                ▼
       SONG PAGES COMMAND REGISTRY
                │
        Validate Current Context
                │
                ▼
         COMMAND EXECUTION LAYER
                │
      ┌─────────┼──────────┐
      ▼         ▼          ▼
   Player   Projection   VC Mode
```

Future inputs may also route into the registry:

``` text
MIDI
OSC
Remote Control
Mobile Companion
Dedicated Hardware
Automation API
        ↓
Song Pages command registry
```

These future systems are not MVP 1.0 requirements.

## 3.2 Location of UI

Because this system may involve use for the entire app but also is heavily involved in the VC mode it needs a proper location and then alias capacity to quickly open it up.

Suggest the same UI be available as a tab under the overall app setting dialog which currently only shows UI themes right now. Change UI themes to a tab and keep current UI/choices there. Add a Tab called Key Bindings & Controls. The resultant UI can be built there. However, let’s also make the exact UI also available in VC mode in the Settings tab of VC Mode designer. This means that the control surface can be individually accessed through these same two paths. This is because while 80% of key bindings will likely be for VC mode there are likely to be bindings and other key commands unique to the player surface or other parts of the total Song Pages UI so it needs to be available elsewhere in the app as well.  

This means the core Keybindings UI needs to live in a reusable component surface that we may display in more than one general UI context.

## 3.3 Bindings reuse and Gate controls

It is not the goal right now to have different keybindings map to different commands when the app is in different modes (listener, artist, etc.) however the system should probably be built to enable this capability at least architecturally vs. as visible UI

VC Command Gate (see below for detailed design) does not need to work in any other section of the app at this time. It is exclusive to that mode.

# 4. Song Pages command registry

## 4.1 Command Definition

Every controllable action should have a stable command ID.

``` typescript
interface VCCommand {
  id: string;
  label: string;
  description?: string;
  category: string;

  availability?: {
    player?: boolean;
    projection?: boolean;
    vcMode?: boolean;
  };

  bindings: {
    direct?: string;
    gated?: string;
    extendedFunction?: string;
  };
}
```

Example:

``` typescript
{
  id: "toggle-lyrics",
  label: "Toggle Lyrics",
  category: "content",

  availability: {
    player: true,
    projection: true,
    vcMode: true
  },

  bindings: {
    direct: "OCAW+L",
    gated: "L",
    extendedFunction: "F17"
  }
}
```

The exact schema may adapt to existing Song Pages architecture.

## 4.2 Stable IDs

Command IDs should be stable, machine-readable, and independent of labels and bindings.

Examples:

``` text
toggle-lyrics
toggle-cover
toggle-visualizer
next-track
previous-track
clear-overlays
show-host
activate-scene-1
```

Changing a user-facing label must not break stored mappings.

## 4.3 Suggested Categories

Initial categories may include:

-   playback
-   visualizer
-   lyrics
-   overlays
-   projection
-   VC surface
-   scenes/layouts
-   audio effects
-   navigation
-   emergency/clear

# 5. Input Layer One --- Safe Direct Hotkeys

## 5.1 Purpose

Safe Direct Hotkeys provide immediate one-step execution:

``` text
Direct Hotkey
→ Execute Command Immediately
```

They are best for frequent, reflexive, or time-sensitive commands.

## 5.2 Curated Pool Rule

Users may only map direct commands from an approved Safe Direct pool.

**Direct mapping is curated, not free-form.**

Arbitrary global shortcut construction is not part of MVP 1.0.

## 5.3 Modifier Abstractions

Current logical abstraction:

``` text
OCAW
```

Meaning:

``` text
macOS:   Option + Command
Windows: Alt + Windows
```

A candidate is not safe merely because the logical name is shared. Each physical combination must be evaluated independently on each platform.

Second family:

``` text
CS
```

Meaning:

``` text
macOS:   Control + Shift
Windows: Control + Shift
```

## 5.4 Centralized Audited Registry

The exact Safe Direct pool must be centralized and versioned rather than scattered through UI code.

``` typescript
interface SafeHotkeyDefinition {
  id: string;
  logicalBinding: string;
  macBinding: string;
  windowsBinding: string;
  auditVersion: string;
  enabled: boolean;
}
```

## 5.5 No Duplicate Direct Bindings

A direct binding maps to only one command at a time.

If a user assigns an already-used binding:

1.  identify the existing command
2.  warn the user
3.  offer reassignment
4.  avoid silent duplication

## 5.6 Runtime Registration Failure

Even an audited shortcut may fail because of third-party software, remapping, OS customization, accessibility software, future OS changes, or another application claiming it.

If registration fails:

-   do not crash
-   do not silently pretend the shortcut works
-   mark the binding unavailable
-   tell the user which binding failed
-   allow reassignment

## 5.7 Context and Scope

Implementation must distinguish:

-   app-local shortcuts
-   window-level shortcuts
-   global shortcuts

Only use global registration where behavior actually requires commands to work while Song Pages lacks keyboard focus.

# 6. Input Layer Two --- VC Command Gate

## 6.1 Purpose

The VC Command Gate provides a large semantic command space without globally reserving ordinary keys.

``` text
Gate Toggle Hotkey
→ Gate Opens
→ Dynamic Command Overlay Appears
→ Next Key Is Evaluated
→ Command Executes If Mapped
→ Gate Closes
```

## 6.2 Gate Toggle

The gate must use one approved Safe Direct hotkey.

Initial proposed binding:

``` text
OCAW+G
```

**Locked for MVP 1.0.** OCAW+N remains **Next** (migrated from legacy `vcHotkeys.js`). OCAW+G **toggles** the gate on or off depending on current state.

## 6.3 Closed State

When closed:

-   ordinary keyboard behavior remains unchanged
-   simple letters and numbers are not intercepted as VC commands
-   normal Song Pages behavior and approved direct hotkeys apply

## 6.4 Open State

When open:

-   show an unmistakable command overlay
-   interpret the next eligible key as a gated command attempt
-   execute at most one mapped command
-   close immediately after evaluation

``` text
GATE OPEN
→ One-Shot Command Mode
```

## 6.5 Successful Command

``` text
OCAW+G
→ Gate Open

L
→ Execute "toggle-lyrics"
→ Gate Closed
```

Exactly one command executes.

## 6.6 Gate Toggle Abort

If already open:

``` text
OCAW+G
→ Gate Closed
→ No Command Executes
```

## 6.7 Escape Abort

`ESC` always aborts an open gate:

``` text
ESC
→ Gate Closed
→ No Command Executes
```

Escape is reserved within gated-command state and cannot be mapped to a VC command.

## 6.8 Unmapped Key Behavior

Recommended MVP rule:

``` text
Unmapped Key
→ No Command Executes
→ Gate Closes
```

The system may briefly indicate:

``` text
No Command Mapped
```

The gate should not remain armed after an accidental unmapped key.

## 6.9 Timeout

The gate automatically closes after inactivity.

Recommended initial default:

``` text
3 seconds
```

The exact value should be centralized and tunable.

## 6.10 One-Shot Rule

MVP gating is strictly one-shot:

``` text
Open
→ One Key Attempt
→ Close
```

Do not implement a persistent keyboard command mode in MVP 1.0.

# 7. Dynamic Gate Overlay

## 7.1 Purpose

The overlay makes gated commands discoverable. Hosts should not need to memorize every mapping.

Example:

``` text
VC COMMANDS

C   Cover
H   Host Camera
L   Lyrics
N   Next Song
P   Previous Song
V   Visualizer

1   Scene 1
2   Scene 2
3   Scene 3

ESC   Cancel
```

## 7.2 Dynamic Generation

Generate the overlay from the current command registry and current user mappings.

Do not maintain a separate hard-coded help list.

## 7.3 Context Awareness

Where practical, show commands relevant to current context:

-   Main Player
-   Projection active
-   VC Mode active
-   available content
-   configured scenes/layouts

Unavailable commands may be hidden or visibly disabled. MVP should choose one consistent behavior.

## 7.4 Overlay Location

The gate overlay is host-control UI.

By default it must not automatically appear on the broadcast/projected surface.

## 7.5 Visual Priority

The open-gate state must be unmistakable. Avoid subtle indicators.

## 7.6 Dismissal

The overlay disappears when:

-   a mapped key executes
-   an unmapped key is evaluated
-   the gate toggle is pressed again
-   Escape is pressed
-   timeout occurs
-   command context is destroyed

# 8. Gated Key Mapping Rules

## 8.1 Semantic Mapping

Encourage memorable keys:

``` text
L = Lyrics
V = Visualizer
C = Cover
H = Host
N = Next
P = Previous
B = Bass Boost
F = Fade
```

## 8.2 Numbers

Number keys are useful for:

-   scenes
-   layouts
-   presets
-   saved views
-   content states

``` text
1 = Scene 1
2 = Scene 2
3 = Scene 3
```

## 8.3 Punctuation

Punctuation keys may be available where useful:

``` text
[ = Previous
] = Next
```

Exact availability should be centralized.

## 8.4 Reserved Gated Keys

At minimum:

``` text
ESC = Abort Gate
```

Additional reserved keys may be defined for implementation or accessibility needs.

## 8.5 Duplicate Gated Bindings

A gated key maps to only one command at a time. Reassignment must warn
and resolve conflicts explicitly.

# 9. Input Layer Three --- F13--F24 Extended Control

## 9.1 Purpose

F13--F24 provide immediate command input designed especially for
programmable hardware and automation.

``` text
F13–F24
→ Execute Mapped Command Immediately
```

No gate is required.

## 9.2 Supported Range

``` text
F13
F14
F15
F16
F17
F18
F19
F20
F21
F22
F23
F24
```

## 9.3 Intended Devices

Especially useful for:

-   Stream Deck
-   macro pads
-   programmable keyboards
-   gaming mice
-   foot pedals
-   keyboard automation software
-   MIDI-to-keystroke translation
-   custom controllers

Song Pages does not need native integration with each device for this mechanism to work.

## 9.4 Example

``` text
Stream Deck Button
→ Emits F17

Song Pages
→ F17 mapped to "toggle-lyrics"

Result
→ Toggle Lyrics
```

## 9.5 Duplicate Bindings

Each F13--F24 binding maps to only one command at a time.

## 9.6 Platform Testing

F13--F24 behavior must be tested in the actual Electron runtime on supported macOS and Windows versions. Registration failures must fail safely.

# 10. Unified Mapping Model

A command may have multiple simultaneous bindings:

``` typescript
{
  id: "toggle-lyrics",
  label: "Toggle Lyrics",

  bindings: {
    direct: "OCAW+L",
    gated: "L",
    extendedFunction: "F17"
  }
}
```

All invoke:

``` text
toggle-lyrics
```

The command implementation should not care which input path triggered it unless future behavior explicitly requires source metadata.

# 11. Command Dispatch

Recommended conceptual invocation:

``` typescript
interface VCCommandInvocation {
  commandId: string;
  source: 'direct' | 'gated' | 'extended-function';
  binding: string;
  timestamp: number;
}
```

Flow:

``` text
Input Event
→ Resolve Binding
→ Resolve Command ID
→ Validate Availability
→ Dispatch Command
→ Report Result
```

# 12. Availability and Invalid Commands

A valid mapping may point to a command that cannot currently execute.

Example:

``` text
Command: next-track
Current state: no next track exists
```

Fail safely:

-   no unhandled error
-   no state corruption
-   optional brief host feedback
-   broadcast surface remains stable

# 13. Configuration UI

Organize mappings around a **configured action set** rather than a fixed list of every possible command.

The Key Bindings table shows only actions the host has added to their layout. A sidebar lists catalog actions not yet configured, including **Reserve for Kudos** (repeatable placeholder rows).

  Action (configured)   Direct    Gated   F13--F24
  --------------------- --------- ------- ----------
  Toggle Cover          OCAW+C    C       F18
  Reserve for Kudos     ---       H       ---
  Toggle Host           OCAW+F    ---     ---

Actual direct values must come from the approved Safe Direct pool.

Users should be able to:

-   add a keybinding from the unassigned key inventory and assign it to an action
-   add or remove configured actions (except future policy-locked required commands)
-   change which action a binding points to
-   clear individual binding layers
-   restore the factory default layout
-   add **Reserve for Kudos** placeholder rows (TBD preset until linked in the Kudos designer)

If a binding is already assigned, warn before reassignment. Do not silently overwrite.

Where practical, provide a preview of the generated gate overlay (including grayed **Kudo (preset TBD)** rows).

# 14. Persistence

Mappings persist across app sessions.

``` typescript
interface CommandMappingState {
  version: 2;
  gateTimeoutMs: number;

  /** Builtin + reserve-kudo-slot:{id} rows shown in Key Bindings. */
  configuredCommandIds: string[];

  /** Kudo presets with explicit binding rows (optional). */
  configuredKudoPresetIds: string[];

  commands: Record<string, {
    direct?: string;
    gated?: string;
    extendedFunction?: string;
  }>;

  /** Derived from reserve placeholder slot bindings. */
  reservedKudoKeys: string[];

  /** Preset linked to each reserved key (Kudos designer). */
  kudoPresetByReservedKey: Record<string, string>;

  kudoPresetBindings: Record<string, {
    direct?: string;
    gated?: string;
    extendedFunction?: string;
  }>;
}
```

Settings key: `commands.mappings` (see `documentation/settings-and-persistence.md`).

## 14.1 Versioning

Mapping state must be versioned so future releases can migrate when:

-   a shortcut becomes unsafe
-   OS conventions change
-   command IDs change
-   new input layers are added

# 15. Safe Hotkey Registry Maintenance

The Safe Direct pool must be centralized and versioned.

Do not duplicate safe-key lists across:

-   settings UI
-   command code
-   help text
-   validation logic

If a future release removes a previously allowed binding:

-   preserve awareness of the old mapping
-   mark it unsupported or migration-required
-   notify the user
-   offer reassignment

# 16. Focus and Text-Entry Safety

## 16.1 Direct Hotkeys

Approved direct hotkeys execute according to their registered scope.

## 16.2 Gated Commands

Opening the gate explicitly changes interpretation of the next eligible key.

Implementation must consider active text-entry contexts such as:

-   search fields
-   lyric editors
-   metadata editors
-   forms
-   dialogs

Recommended MVP rule:

**Do not open the VC Command Gate while the user is actively typing in an editable text field unless the product explicitly determines that global gate behavior is required.**

If global gate behavior is required during live hosting, make it a deliberate tested decision.

## 16.3 Escape

Escape closes the gate before any other gated interpretation.

# 17. Broadcast Surface Safety

By default:

-   gate overlay appears in host-control UI
-   mapping errors appear in host-control UI
-   registration failures appear in host-control UI
-   timeout indicators appear in host-control UI

The projected/VC surface changes only when the executed command itself changes broadcast content.

# 18. Logging and Diagnostics

Support lightweight command diagnostics:

``` text
timestamp
commandId
inputSource
binding
executionResult
failureReason
```

Useful failure reasons:

``` text
binding-unregistered
command-unavailable
command-not-found
gate-timeout
gate-abort
unmapped-gated-key
```

Do not expose unnecessary internal diagnostics in normal host UI.

# 19. MVP 1.0 Implementation Phases

## Phase 1 --- Unified Command Registry

Implement stable command IDs, labels, categories, shared dispatch, availability checks, and execution results.

## Phase 2 --- Safe Direct Hotkeys

Implement centralized Safe Direct registry, validation, duplicate detection, runtime registration, failure handling, and persistence.

## Phase 3 --- Command Gate

Implement gate open/close, one-shot execution, gate-toggle abort, Escape abort, unmapped-key close, timeout close, and cleanup.

## Phase 4 --- Dynamic Overlay

Implement generated mapping list, visible armed state, automatic dismissal, current mapping reflection, and host-only presentation.

## Phase 5 --- F13--F24

Implement registration, mapping, duplicate detection, shared dispatch, persistence, and platform testing.

## Phase 6 --- Configuration UI

Implement flexible configured-set mapping table, add/remove actions, key inventory assignment, conflict warnings, gate overlay preview, gate timeout configuration, and restore factory layout.

## Phase 7 --- Integration Polish

Align main-process migrate/resolve with the configured-set model, migrate legacy orphan reserved keys into placeholder rows, show reserve TBD rows on the live gate overlay, provide brief host feedback in the VC Controller, lock the gate toggle as a required configured action (`OCAW+G`), and gray unavailable overlay commands from live VC runtime context.

## Phase 5.1 --- F13--F24 hardware soak (manual)

When your programmable device is configured to emit F13--F24, verify on macOS and Windows:

1. Map one key (e.g. F17) to a builtin command in Key Bindings and confirm it fires immediately without opening the gate.
2. Map the same F-key to a Kudo preset and confirm it triggers the Kudo.
3. Reassign the F-key to a different command and confirm the previous mapping stops firing.
4. Quit and relaunch the app — mapping should persist.
5. Register a duplicate F-key on two commands — the UI should warn; only one registration should win at runtime.
6. Open VC Mode with the device connected — confirm F-keys still route through the command registry (not legacy hotkeys).

Log any OS-level registration failures from the Key Bindings warning banner.

# 20. Acceptance Criteria

MVP 1.0 is successful when:

1.  All controllable VC actions use stable command IDs.
2.  Direct, gated, and F13--F24 inputs route through one command
    registry.
3.  Direct mapping exposes only the approved Safe Direct pool.
4.  Safe Direct bindings cannot silently duplicate.
5.  Failed shortcut registration does not crash the app.
6.  Failed registration is visible to the host.
7.  The gate opens from its configured safe gate chord.
8.  Opening the gate displays an unmistakable host-side overlay.
9.  A mapped gated key executes exactly one command.
10. The gate closes immediately after command execution.
11. Pressing the gate toggle while open closes without execution.
12. Escape closes without execution.
13. An unmapped key closes without execution.
14. Timeout closes without execution.
15. The gate does not remain accidentally armed.
16. The overlay is generated from current mappings.
17. The overlay disappears whenever the gate closes.
18. F13--F24 can be mapped independently.
19. F13--F24 invoke the same commands as other input paths.
20. A command may simultaneously have direct, gated, and
    extended-function bindings.
21. Mapping state persists across sessions.
22. Mapping state is versioned.
23. Invalid or unavailable commands fail safely.
24. Host-only command UI does not automatically appear on the broadcast
    surface.
25. New future input sources can be added without rewriting command
    implementations.

# 21. Explicit Non-Goals for MVP 1.0

MVP 1.0 does not require:

-   arbitrary free-form global shortcut construction
-   native Stream Deck integration
-   native MIDI integration
-   OSC
-   mobile remote control
-   multi-key gated sequences
-   persistent gated keyboard mode
-   command macros
-   command scripting
-   chained commands
-   per-device profiles
-   cloud-synced mappings
-   automatic third-party shortcut discovery
-   guarantees against arbitrary user or third-party remapping

# 22. Future Extensions

The architecture should permit:

``` text
MIDI Note / CC
→ Song Pages command registry

OSC Message
→ Song Pages command registry

Mobile Remote Button
→ Song Pages command registry

Web Remote
→ Song Pages command registry

Dedicated VC Hardware
→ Song Pages command registry

Automation API
→ Song Pages command registry
```

Future macro support may permit chained actions, but is not part of MVP 1.0.

# 24. MVP 1.0 Locked Implementation Decisions

**Status:** Approved for build (2026-07).

## 24.1 Sprint scope

Deliver full MVP 1.0 Phases 1–6: unified registry, Safe Direct, gate + overlay, F13–F24, configuration UI, plus controller window v1.

## 24.2 Legacy hotkey migration

Migrate hard-coded shortcuts from `electron/vcHotkeys.js` into the command registry as **default mappings**, then remove legacy hard-coding. Preserve current behavior except Kudos (below).

Default Safe Direct mappings include:

| Command ID | Legacy action | Default direct |
|------------|---------------|----------------|
| `toggle-cover` | cover | OCAW+C |
| `toggle-host` | host | OCAW+F |
| `toggle-next-overlay` | next | OCAW+N |
| `toggle-remaining` | remaining | OCAW+R |
| `toggle-song-info` | songInfo | OCAW+S |
| `toggle-upcoming` | upcoming | OCAW+U |
| `toggle-layout-mode` | layoutMode | **OCAW+L** (locked) |
| `toggle-debug-outlines` | debugOutlines | OCAW+D |
| `alare-speed-up` | alareSpeedUp | OCAW+= |
| `alare-speed-down` | alareSpeedDown | OCAW+- |
| `alare-speed-reset` | alareSpeedReset | OCAW+0 |
| `toggle-vc-command-gate` | *(new)* | **OCAW+G** (required, locked direct binding) |

**Remove** legacy OCAW+P / ⌘⌥P Kudo cycle. Kudos use per-preset command IDs only.

Gate toggle (`toggle-vc-command-gate`) uses `bindingPolicy.requiredInConfig` — hosts cannot remove or reassign it; the Safe Direct `OCAW+G` layer stays locked.

## 24.3 Kudo integration

- Per-preset stable command IDs: `trigger-kudo-{presetId}`
- **Reserve for Kudos** is a catalog placeholder action. Each add creates a `reserve-kudo-slot:{id}` configured row. Assign keys on that row; link the preset in the Kudos designer via the reserved-key dropdown.
- `reservedKudoKeys` and `kudoPresetByReservedKey` stay in sync with placeholder slot bindings.
- Removing a reserve placeholder row clears its reserved key and preset link.
- Most Kudos expected via gate + controller visual menu; only a few top Kudos use Safe Direct.
- Gated reserve keys without a linked preset appear on the overlay as **Kudo (preset TBD)** (unavailable) and close the gate with host feedback if pressed.

## 24.4 Controller window

Spawn a dedicated **VC Controller** window (host-only, not on broadcast surface):

- Opens optionally with VC Mode; host may close and reopen (exact UX TBD during build)
- MVP v1: gate overlay + basic Kudo fire buttons
- Gate overlay and unavailable-command styling (disabled/grayed) live here

## 24.5 Shortcut scope

Architecturally split player vs VC commands. **VC-only commands no-op when VC Mode is not active.** Safe Direct keys aimed at VC Mode simply do not respond outside VC.

## 24.6 Safe Direct pool

Include **OCAW** and **CS** (Control+Shift) modifier families. Engineering audits and proposes the initial versioned pool; final list subject to cross-platform review.

## 24.7 Settings UI placement

Reusable **Key Bindings & Controls** component in:

1. App Settings dialog — Theme becomes a tab; add Key Bindings & Controls tab
2. VC Mode designer — Settings tab (same component)

## 24.8 Persistence

Settings key: `commands.mappings` (see `documentation/settings-and-persistence.md`).

# 25. Core Product Rule

**Song Pages VC Mode uses a layered live-control architecture: a small audited Safe Direct pool for immediate commands, a one-shot gated command layer with a dynamic overlay for broad semantic control, and F13--F24 for programmable hardware and external control.**

**All input paths resolve to one shared Song Pages command registry.**

The system should optimize for live-host safety, discoverability, extensibility, and low collision risk rather than maximizing the raw number of keyboard shortcuts.