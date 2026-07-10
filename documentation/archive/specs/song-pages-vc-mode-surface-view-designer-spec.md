# Song Pages VC Mode 1.0 --- Surface/View Designer Specification

**Status:** **Implemented** (1.0 surface designer + live VC window). This document remains the product spec; see [vc-mode-architecture.md](./vc-mode-architecture.md) for runtime architecture and [settings-and-persistence.md](./settings-and-persistence.md) for persistence keys.

**Implementation deltas (code vs original proposal):**

| Topic | Spec (below) | Current implementation |
|-------|----------------|------------------------|
| Float limit | 0–4 floats | **0–6 floats** (`VC_MAX_FLOATS` in `shared/vcSurface/constants.ts`) |
| Save workflow | Explicit save step (§18 step 11) | **Auto-save** (500ms debounce) via `useAutoSaveVcConfig`; flush on designer close |
| Grid appearance | Not in original spec | **`gridDesign`**: background color, default typography, separate **`gridLines`** (template dividers) and **`floatLines`** (float outlines) |
| Host content | Referenced generically | Full **host content catalog** (`vc.hostContent`) with assignment bindings — see [Host-content-design.md](./Host-content-design.md) |
| Song slot settings | Graphic-style rules for host | Extended to **song content** via `VcSongSlotSettings` and `SONG_CONTENT_SETTINGS_RULE` |
| Audio for capture | Layout must not interrupt playback | **HLS audio mirror** in VC window for Discord/window capture — see [vc-mode-architecture.md](./vc-mode-architecture.md) |

**Target:** Song Pages Desktop Player / VC Mode 1.0\
**Primary runtime:** Electron desktop application\
**Sprint scope:** Surface geometry, division templates, adjustable
dividers, floating areas, persistence, and integration with the existing
VC Mode proof of concept

------------------------------------------------------------------------

# 1. Purpose

The current Song Pages VC Mode implementation is a successful proof of
concept. It demonstrated that Song Pages can create a dedicated external
presentation window suitable for Discord voice channels, Twitch, screen
sharing, second monitors, projectors, and streaming/capture software.

The next step is to replace the current rudimentary layout system with a
more capable **VC Surface/View Designer** suitable for a true 1.0
implementation.

The objective of this sprint is not to redesign all VC content types.
The objective is to create a strong, flexible, constrained system for
defining **where content appears on the VC surface**.

# 2. Product Philosophy

Song Pages VC Mode is not intended to become professional broadcast
software or reproduce OBS, arbitrary broadcast canvases, node-based
layout tools, unrestricted window managers, full VJ software, or
television production software.

The intended user is a music host or artist who wants to create a useful
and attractive shared surface without learning professional broadcast
software.

A typical user may want a web page, visualizer, cover artwork, lyrics,
host camera, or information strip arranged on one shared surface.

> **Provide constrained structure first, then controlled freedom through
> floats.**

# 3. Sprint Goal

Replace the current fixed VC layout system with a new **Surface/View
Designer** based on:

1.  Stock division templates
2.  Adjustable divider positions
3.  Stable numbered base areas
4.  Optional floating areas
5.  Percentage-based geometry
6.  Persistent saved configuration
7.  Reuse of existing VC content capabilities wherever practical

# 4. Scope Boundary

This sprint is focused on **surface geometry and layout editing**. Reuse
existing VC content types and content-assignment behavior wherever
practical.

A later sprint will address expanded content types, improved content
configuration, new source types, richer area behavior, content-specific
settings, and additional VC presentation features.

Do not delay this sprint by redesigning those systems.

# 5. VC Surface Model

``` text
VC Surface
│
├── Division Template
│   ├── 1–4 base areas
│   ├── areas collectively cover the surface
│   ├── divider positions may be adjustable
│   └── areas have stable identities
│
└── Floats
    ├── 0–6 floating areas (implementation; spec originally 0–4)
    ├── positioned above the base composition
    ├── percentage-based width and height
    ├── percentage-based X/Y position
    ├── draggable
    ├── constrained to surface bounds
    └── may overlap other content
```

Maximum: **4 base areas + 6 floats** (implementation maximum).

# 6. Initial Surface Aspect Model

The Surface/View Designer should use a **16:9 default preview surface**.

This sprint should **not** enforce a fixed 16:9 output ratio. The user
may resize or stretch the external VC presentation window.
Percentage-based geometry should continue functioning.

Do not add forced letterboxing, pillarboxing, fixed broadcast
resolutions, alternate aspect-ratio presets, responsive breakpoints, or
automatic composition reflow.

# 7. Division Templates

VC Mode 1.0 should provide exactly these 13 stock templates:

1.  **Single Screen** --- one full-surface area.
2.  **Double Vertical** --- left/right; one adjustable vertical divider.
3.  **Double Horizontal** --- top/bottom; one adjustable horizontal
    divider.
4.  **Triple Striped Vertical** --- three vertical bands; two adjustable
    vertical dividers.
5.  **Triple Striped Horizontal** --- three horizontal bands; two
    adjustable horizontal dividers.
6.  **Triple Split Bottom** --- large top region plus split lower row.
7.  **Triple Split Top** --- split upper row plus large bottom region.
8.  **Triple Split Right** --- large left region plus split right
    column.
9.  **Triple Split Left** --- split left column plus large right region.
10. **Quad** --- 2×2 grid with shared horizontal and vertical dividers.
11. **Quad Split Top** --- split top row plus full-width middle and
    bottom rows.
12. **Quad Split Middle** --- full-width top and bottom rows plus split
    middle row.
13. **Quad Split Bottom** --- full-width top and middle rows plus split
    bottom row.

## 7.1 Area Numbering

Area identities are stable and belong to the template definition.

Examples:

-   Triple Split Bottom: Area 1 = top; Area 2 = bottom-left; Area 3 =
    bottom-right.
-   Triple Split Top: Area 1 = top-left; Area 2 = top-right; Area 3 =
    bottom.
-   Triple Split Right: Area 1 = left; Area 2 = top-right; Area 3 =
    bottom-right.
-   Triple Split Left: Area 1 = top-left; Area 2 = bottom-left; Area 3 =
    right.

Area numbers must not change because of divider movement, area size,
current content, or window resizing.

# 8. Template Geometry Architecture

Do not implement the 13 templates as unrelated arbitrary rectangles.
Each template should define constrained geometry through split trees,
constrained nested regions, named divider parameters, or an equivalently
clean model.

Example:

``` text
Triple Split Bottom

ROOT
└── Horizontal Split
    ├── Area 1
    └── Lower Region
        └── Vertical Split
            ├── Area 2
            └── Area 3
```

Example:

``` text
Triple Split Right

ROOT
└── Vertical Split
    ├── Area 1
    └── Right Region
        └── Horizontal Split
            ├── Area 2
            └── Area 3
```

Adjusting one divider should affect only structurally related areas. Do
not expose the internal geometry representation to users.

# 9. Divider Behavior

Templates containing divisions should expose interactive divider
controls in Designer mode.

## 9.1 Storage

Store divider positions as normalized percentages or equivalent
normalized values, not primarily as pixels.

``` json
{
  "templateId": "double-vertical",
  "dividers": {
    "primaryVertical": 0.67
  }
}
```

## 9.2 Interaction

Users should be able to click and drag a divider, see continuous layout
updates, and release it at the desired position.

## 9.3 Minimum Area Size

Base areas should not collapse to zero. Recommended initial minimum:

``` text
10% minimum along the affected axis
```

Clamp divider movement at the minimum. Centralize the minimum as a
defined constant.

## 9.4 Divider Visibility

Divider controls appear in Designer mode only and must not appear on the
external VC presentation.

## 9.5 Reset

Provide a simple reset to stock template proportions. Centralize
defaults in template definitions.

# 10. Floats

Floats are optional rectangular content areas positioned above the base
division composition.

A VC design may contain **0–6 floats**. Six is the current 1.0 limit (`VC_MAX_FLOATS`).

# 11. Float Geometry

Store float geometry relative to the complete VC surface.

``` json
{
  "id": "float-1",
  "widthPct": 25,
  "heightPct": 25,
  "xPct": 5,
  "yPct": 70,
  "zIndex": 1
}
```

Equivalent normalized `0.0–1.0` values are acceptable internally.

# 12. Creating Floats

The user should be able to create a float by defining at minimum:

-   width as percentage of surface
-   height as percentage of surface

After creation, the float appears on the design surface and may be
dragged and edited.

When six floats exist, prevent creation of a seventh.

# 13. Float Positioning and Boundaries

Floats should be directly draggable. Persist position relative to the
full surface.

A float may not be dragged partially or completely outside the VC
surface. Clamp movement so:

``` text
x >= 0
y >= 0
x + width <= surface width
y + height <= surface height
```

# 14. Float Resizing

Preferably support both:

-   numeric width/height editing
-   direct visual resizing through handles

Resize handles appear only in Designer mode. Percentage values should
update during resize. Enforce minimum usable dimensions and surface
bounds.

# 15. Float Overlap

Floats may overlap base areas and other floats.

Do not add collision avoidance, automatic rearrangement, overlap
warnings, automatic movement of other elements, or inferred designer
intent.

Overlap is the user's responsibility.

# 16. Float Stacking Order

Because floats may overlap, maintain deterministic stacking order using
a value such as `zIndex`.

For MVP 1.0 provide:

-   Bring to Front
-   Send to Back

A complex layer-management UI is not required.

# 17. Maximum Area Count

``` text
Maximum base areas: 4
Maximum floats:     6
Total maximum:      10
```

Enforce this structurally.

# 18. Surface/View Designer Workflow

The workflow should support:

1.  Open VC configuration
2.  Open Surface/View Designer
3.  Browse stock templates
4.  Select a template
5.  Preview the template
6.  Adjust dividers
7.  Add floats
8.  Resize floats
9.  Reposition floats
10. Adjust float stacking where necessary
11. ~~Save the VC design~~ — **auto-saved** while editing (see implementation deltas above)
12. Use the design in VC Mode

The exact UI is left to implementation. Prioritize clarity over density.

# 19. Designer Mode vs Presentation Mode

## Designer Mode may display

-   area numbers
-   divider handles
-   selected-area outlines
-   float outlines
-   resize handles
-   drag affordances
-   stacking controls
-   percentage values
-   template labels

## Presentation Mode must not display editor chrome

Do not show divider handles, area numbers, resize handles, selection
outlines, drag controls, or editing labels on the external VC surface.

# 20. Persistence

Persist enough information to recreate the surface.

``` json
{
  "surface": {
    "templateId": "triple-split-bottom",
    "dividers": {
      "primaryHorizontal": 0.7,
      "lowerVertical": 0.5
    },
    "floats": [
      {
        "id": "float-1",
        "widthPct": 20,
        "heightPct": 25,
        "xPct": 75,
        "yPct": 70,
        "zIndex": 1
      }
    ]
  }
}
```

Persistence must preserve:

-   template identity
-   divider positions
-   float count
-   float identities
-   float dimensions
-   float positions
-   float stacking order
-   existing content assignments where applicable

# 21. Existing Content Integration

Preserve and reuse existing VC content capabilities wherever practical.

The new geometry system should provide stable targets for existing
content assignments:

``` text
Area 1 → Existing Content Type
Area 2 → Existing Content Type
Area 3 → Existing Content Type

Float 1 → Existing Content Type
Float 2 → Existing Content Type
```

Do not redesign the full content-source model during this sprint.

If the proof of concept tightly couples content to old layouts, perform
the minimum clean refactor needed. Do not distort the new geometry
architecture to preserve weak prototype assumptions.

# 22. Visualizer Integration

Existing Song Pages Visualizer System rules remain in force:

> Song Pages 1.0 may have zero or one active visualizer rendering
> session. It must never intentionally maintain more than one.

If a VC composition includes a visualizer:

-   the single active visualizer may render in one assigned VC area
-   that area may be a base area or supported float if existing content
    architecture permits
-   no second active visualizer should be instantiated elsewhere

The Surface/View Designer is a consumer of the visualizer system, not a
separate visualizer runtime.

# 23. External Surface Ownership

Existing external-surface behavior should remain intact.

Song Pages 1.0 supports one external presentation surface. VC Mode may
own that surface. Starting VC Mode should replace whatever presentation
currently owns the external surface according to existing rules.

Do not introduce multiple external windows, multiple simultaneous VC
surfaces, multiple independent monitor outputs, or professional
preview/program routing.

# 24. Error Handling

Fail safely:

-   invalid persisted divider value → clamp or restore template default
-   float outside surface bounds → clamp inside surface
-   float larger than surface → clamp to valid maximum
-   malformed float geometry → restore safe defaults
-   unknown template ID → fall back to Single Screen or another
    designated safe template
-   missing content assignment → render empty area safely
-   deleted/unavailable content source → do not destabilize the surface

Layout errors must not interrupt audio playback.

# 25. Explicit Non-Goals

Do not implement:

-   arbitrary user-drawn grids
-   arbitrary freeform base rectangles
-   custom template creation
-   user-authored template code
-   unlimited floats
-   more than four floats
-   automatic overlap prevention
-   collision-detection intelligence
-   smart layout recommendations
-   automatic float placement
-   snapping systems
-   alignment guides
-   professional layer panels
-   nested user-created groups
-   scene banks
-   preview/program switching
-   transitions between VC scenes
-   multiple external outputs
-   multiple VC windows
-   alternate aspect-ratio presets
-   enforced 16:9 output
-   letterboxing
-   pillarboxing
-   responsive breakpoints
-   automatic layout reflow
-   new content-source architecture
-   professional broadcast controls
-   OBS replacement functionality

These may be considered later and should not delay this sprint.

# 26. Implementation Guidance

First inspect the existing VC Mode proof-of-concept implementation and
determine:

-   how current layouts are represented
-   how content is assigned
-   how the external surface is created
-   how VC configuration is persisted
-   how the visualizer integrates
-   which prototype components are reusable
-   which prototype assumptions should be removed

The current implementation is not an architectural constraint.

The coding agent may retain useful code, refactor useful code, replace
weak layout code, remove obsolete prototype code, and introduce a
cleaner geometry subsystem.

Prefer a deliberate 1.0 architecture over preserving prototype
internals, but do not perform unrelated broad rewrites.

# 27. Suggested Internal Separation

``` text
vc/
├── surface/
│   ├── templates/
│   ├── geometry/
│   ├── dividers/
│   ├── floats/
│   ├── persistence/
│   └── validation/
│
├── designer/
│   ├── preview/
│   ├── controls/
│   ├── interactions/
│   └── selection/
│
├── presentation/
│   ├── renderer/
│   └── external-surface/
│
└── content/
    └── existing integrations
```

This is illustrative. Use repository conventions where appropriate.

# 28. Acceptance Criteria

The sprint is complete when:

1.  The user can open the VC Surface/View Designer.
2.  The user can choose among all 13 stock templates.
3.  Each template renders the correct number and arrangement of stable
    numbered areas.
4.  Adjustable template dividers can be dragged.
5.  Divider movement updates the layout immediately.
6.  Divider positions persist.
7.  Divider movement respects minimum area constraints.
8.  The user can reset template proportions.
9.  The user can create up to four floats.
10. The fifth float cannot be created.
11. Float width and height can be configured.
12. Floats can be dragged.
13. Floats cannot leave the surface bounds.
14. Float geometry persists.
15. Floats may overlap base areas.
16. Floats may overlap other floats.
17. Float stacking is deterministic.
18. The user can bring a float to front.
19. The user can send a float to back.
20. Designer controls do not appear on the external presentation
    surface.
21. Existing VC content can render in the new geometry system
    sufficiently to validate the design.
22. Existing audio playback remains stable.
23. Existing external-surface ownership behavior remains stable.
24. The visualizer system does not create multiple simultaneous active
    visualizers.
25. Invalid persisted geometry fails safely.
26. The external VC window can be resized or stretched without crashing
    the composition.
27. Saved VC designs reopen with their template, divider geometry,
    floats, stacking, and applicable existing content assignments
    intact.

# 29. Core Product Rule

> **VC Mode 1.0 provides a constrained composition system: stock
> adjustable division templates define the base surface, and up to four
> floating areas provide controlled freedom above it.**

The system should be powerful enough for sophisticated casual music
sharing and streaming layouts while remaining substantially simpler than
professional broadcast software.
