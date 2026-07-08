Song Pages Application Audit

Purpose
Song Pages is not merely a web application wrapped in Electron. It is evolving into a multi-role desktop application for high-velocity musical content creators.
Its responsibilities include:

* organizing song metadata and catalog information;
* managing local MP3, WAV, artwork, and related media assets;
* publishing cohesive song catalogs to the Web;
* reading distributed Song Pages JSON data back from the Web and organizing it into a coherent catalog model, conceptually similar to how RSS allows independent publishers to expose structured content;
* operating as a desktop audio player;
* providing visualizer modes;
* providing a specialized DJ / VC / streamer mode for broadcasting sets over the Internet;
* potentially performing local media analysis, waveform generation, metadata extraction, conversion, clipping, rendering, or other audio-processing tasks;
* interacting with remote media and metadata sources.

Because these roles create different security, performance, and lifecycle requirements, conduct a deliberate Electron architecture audit before the next major feature sprint.
The objective is not to rewrite working code, adopt every library named below, or mechanically implement generic Electron advice. The objective is to inspect the existing codebase, identify where current architecture and Song Pages requirements converge, preserve sound existing decisions, and make targeted improvements.

Do not begin broad implementation changes until the initial audit report is complete and reviewed. Small P0 fixes may be proposed immediately, but architectural changes should be sequenced after review.

The first deliverable is an audit report and prioritized plan, not a bulk code modification.

1. Required Audit Method
Before changing code or architecture:

1. Inspect the current Electron main process, preload layer, renderer architecture, window creation, IPC handlers, local file access, remote fetch behavior, audio playback architecture, visualizer architecture, persistence, packaging, and error handling.
        * Where Electron behavior is relevant, distinguish development mode from packaged production builds.
2. Update existing documentation with what is already implemented correctly as needed.
3. Identify genuine risks, bottlenecks, outdated patterns, or unnecessary coupling.
4. Distinguish:
    * immediate fixes;
    * worthwhile near-term improvements;
    * experiments or prototypes;
    * speculative future ideas;
    * recommendations that do not fit this codebase.
5. Prefer incremental changes over broad rewrites.
6. Do not add a dependency merely because it appears in this document.
7. Do not replace a working subsystem unless the replacement has a concrete benefit for Song Pages.
8. Do not make destructive changes to project files, metadata, user assets, cached data, or configuration without explicit approval. Migration proposals must describe backup/rollback behavior.
9. Where a recommendation conflicts with the current architecture, explain the conflict before changing it.
10. Where measurement is possible, measure before optimizing.
11. Preserve the Web application’s portability. Electron-specific capabilities should be isolated rather than allowed to spread unnecessarily through shared application code.
Produce an initial audit report before undertaking major architectural changes.

For each finding, report:

* Current state
* Evidence
* Risk or limitation
* Recommendation
* Priority: P0 / P1 / P2 / P3
* Estimated scope: small / medium / large
* Regression risk
* Whether implementation is recommended now

Maintain the audit report in `Song Pages Application Audit.md`.

Do not begin broad implementation changes until the initial audit report is complete and reviewed. Small P0 fixes may be proposed immediately, but architectural changes should be sequenced after review.

The audit succeeds if it identifies the highest-risk Electron/security/performance issues, proposes small prioritized fixes, avoids unnecessary framework churn, and leaves Song Pages better prepared for packaging, distribution, and continued feature development.

2. Core Architectural Principle: Electron as a Privileged Shell
Audit whether Song Pages has a clean separation between:

Renderer
The renderer should primarily handle:
* UI;
* React application state;
* catalog browsing;
* playlist presentation;
* ordinary playback controls;
* user interaction;
* visualization presentation;
* non-privileged Web APIs.
The renderer should not receive unrestricted Node.js capability.

Preload
How does any of our preload layer operate - are there possible efficiencies or improved security approaches we should add to make this process better?
Main Process
Evaluate the main processes and report if it is acting primarily as a privileged coordinator and application control plane, not as a dumping ground for arbitrary work.

Review these areas and report back if you feel they are properly aligned in the Main Process, should be moved in-or-out, etc. The goal is not to rewrite things but to discuss and ensure our overall architecture is best practices.

* application lifecycle;
* native windows;
* native dialogs;
* permissions;
* privileged filesystem access;
* protocol registration;
* approved remote networking;
* global shortcuts;
* OS integration;
* IPC authorization;
* worker / utility process lifecycle.
Background Workers / Utility Processes / Child Processes
Potentially expensive work should be isolated where appropriate. Please evaluate and discuss how these systems may be operating as proper background workers/utility processes/child processes in the application:

* FFmpeg;
* waveform / audio processing/evaluation
* media probing;
* expensive image processing;
* long-running transformations;
* other CPU-heavy or failure-prone jobs.

Audit Questions
* Is the main process currently doing CPU-heavy work?
* Can any operation block Electron lifecycle or window responsiveness?
* Is expensive work occurring in the renderer?
* Are responsibilities divided intentionally, or merely according to where implementation was easiest?
* Are there duplicated desktop and Web code paths that should share domain logic?
* Is Electron-specific code leaking unnecessarily into otherwise portable application code?
Do not assume every background task needs a UtilityProcess. Choose among renderer workers, Web Workers, AudioWorklets, Electron UtilityProcess, Node worker threads, and child processes based on the actual task.

3. Security Baseline
This section is high priority because Song Pages processes:

* local files;
* remote JSON;
* remote artwork;
* remote audio;
* URLs;
* potentially third-party catalog data;
* potentially malformed metadata;
* potentially untrusted filenames and paths.

The application should treat remote catalog content as data, not trusted application content.Most important to answering these is making sure we’re documenting for future agents/programmers our key rules that guide song pages as a media player that relies on data supplied to it by third-party content creators.

3.1 Renderer Security
Verify explicitly that production windows use appropriate secure defaults, including:

* nodeIntegration: false
* contextIsolation: true
* sandboxing where compatible with the application architecture
* no unnecessary privileged renderer capabilities

Audit all BrowserWindow and WebContents creation paths, not merely the primary window.
Check secondary windows, dialogs, visualizer windows, streamer windows, development tools, and any future external-content surfaces.

3.2 Preload and ContextBridge
Audit the preload script.

The preferred pattern is a narrow capability bridge such as:

contextBridge.exposeInMainWorld('songPagesDesktop', {
  chooseAudioFiles: () => ipcRenderer.invoke('files:choose-audio'),
  readTrackMetadata: (request) =>
    ipcRenderer.invoke('metadata:read-track', request),
  startAudioJob: (request) =>
    ipcRenderer.invoke('audio:start-job', request),
  cancelAudioJob: (jobId) =>
    ipcRenderer.invoke('audio:cancel-job', { jobId })
});

Do not expose:
* raw ipcRenderer;
* arbitrary channel names;
* fs;
* child_process;
* unrestricted shell execution;
* generic “run command” functions;
* generic filesystem access;
* arbitrary URL fetching without policy;
* broad Node.js objects.
Audit Questions
* Is every exposed preload method necessary?
* Is the bridge capability-oriented?
* Are APIs typed?
* Can the renderer choose arbitrary IPC channels?
* Can a compromised renderer turn a legitimate API into arbitrary filesystem, network, or process access?
* Are subscriptions cleaned up correctly?
* Are event listeners bounded and removable?

4. IPC Validation and Authorization
Treat every renderer-to-main IPC call as a request crossing a trust boundary.
Audit all:
* ipcMain.handle
* ipcMain.on
* renderer sends
* renderer invokes
* main-to-renderer events
For each privileged handler:
1. validate argument shape;
2. validate types;
3. validate ranges;
4. validate enums;
5. validate file paths;
6. validate URLs;
7. validate expected sender / frame where relevant;
8. reject unexpected fields where useful;
9. return structured errors rather than leaking internals.
Consider a schema validator already present in the project. If none exists, investigate whether a small validation layer or a library such as Zod would materially improve safety and maintainability. It may also be our current unit testing is doing a good job here. Do not involve Zod unless you feel it is necessary and then ask first so we can discuss.For any implemented fix, identify what regression test, manual test, or verification procedure proves the change did not break playback, import, publishing, VC Mode, visualizers, or packaged builds.
5. Content Security Policy and Remote Content
Audit the production CSP.
The target should be as strict as the application can reasonably support.
Investigate:
* default-src
* script-src
* style-src
* img-src
* media-src
* connect-src
* object-src
* frame-src
* worker requirements
Prefer:
* script-src 'self'
* object-src 'none'
unless the application has a documented reason otherwise.
Do not blindly copy a generic CSP because Song Pages legitimately handles remote media and distributed catalog data.
The important architectural distinction is:
	Permission to fetch or play remote content must not become permission to execute remote code.
Audit Questions
* Can remote Song Pages JSON inject HTML?
* Is metadata ever inserted with innerHTML or equivalent unsafe rendering?
* Can remote artwork URLs become navigation targets?
* Can remote catalog fields influence local file paths?
* Can remote URLs invoke custom protocols unexpectedly?
* Can a catalog specify javascript:, file:, or another dangerous scheme?
* Are Markdown or rich-text fields sanitized?
* Are external links opened through a controlled policy?

6. Navigation, New Windows, and External URLs
Audit all navigation behavior.
Investigate:
* will-navigate
* setWindowOpenHandler
* external browser opening
* OAuth or login windows if any
* embedded third-party pages
* custom protocol links
Establish explicit allowlists or policy functions.
Let’s establish and document our navigation policy relative to sending the user to remote out of application content.

7. Remote Fetching and the “CORS Bypass” Question
The renderer may encounter CORS restrictions when accessing remote audio or metadata.
Investigate whether selected remote requests should be performed through a Main-process or dedicated networking service.
However:
Do not treat “Main Process bypasses CORS” as a general-purpose workaround.
Moving requests out of the renderer creates a privileged network proxy. That can introduce:
* SSRF-like behavior;
* access to localhost;
* access to private network ranges;
* unexpected redirects;
* oversized downloads;
* malicious content;
* credential leakage;
* filesystem abuse if responses are saved.
Required Audit
Determine whether Song Pages currently needs privileged remote fetching for:
* JSON catalogs;
* artwork;
* audio;
* waveform generation;
* import workflows;
* third-party APIs.
If yes, propose explicit request policies for discussion.
Consider:
* allowed protocols;
* redirect limits;
* timeout limits;
* maximum response sizes;
* content-type checks;
* cancellation;
* streaming;
* private/local network policy;
* cache behavior;
* authentication boundaries.
Prefer normal documented APIs over browser automation. Do not use systems like Playwright without explicit permission.

8. Local Audio Delivery and Custom Protocols
Audit how local audio is currently exposed to Chromium. Keep in mind previous issues we’ve had with our audio engine and ensuring it is properly exposed to the OS so streaming systems like Twitch, Discord, FaceTime, Zoom, etc. can broadcast approved content from our windows.
If the application relies heavily on raw file:// URLs, investigate whether a custom application protocol using modern Electron protocol handling would provide cleaner:
* streaming;
* range requests;
* MIME handling;
* security boundaries;
* URL semantics;
* portability.
Do not replace working local playback merely because a custom protocol sounds more sophisticated. Keep in mind previous issues with how our audio engine works.
9. Audio Playback ArchitectureSong Pages is a media player. Playback stability should be treated as a first-class architectural concern. Audit where authoritative playback state lives.
Examples:
* current track;
* queue;
* play/pause;
* current time;
* duration;
* volume;
* mute;
* repeat;
* shuffle;
* crossfade if present;
* output device if supported;
* streamer state.
Important Principle
Much of the following you may already be doing. This audit is to further illuminate and discuss if we are doing everything related to our audio engine properly specific to a combination of best practices AND what what we think works for our specific context. Please comment and discuss these ideas:

* Do not route high-frequency audio state through expensive global React updates unless necessary.

Separate:

* authoritative low-frequency UI state;
* playback engine state;
* animation-frame presentation;
* high-frequency analyzer data.

Audit Questions (I’ve answered some of these based on my testing)
* Does playback survive ordinary React component remounts?
* Can UI rerenders interrupt audio?
* Does changing views recreate the audio element?
* Is there one authoritative player or multiple accidental players?
* Are progress updates causing broad rerenders?
* Is currentTime propagated more frequently than the UI can use?
* Does visualizer state contaminate application state?
* Can the player continue while the main UI changes mode? (Yes)
Investigate a lightweight store such as Zustand only if current state architecture genuinely needs improvement. Do not introduce it solely because it is popular.

10. High-Frequency Data Must Not Abuse IPC
Audit whether any of the following pass continuously through Electron IPC:
* visualizer FFT bins;
* waveform samples;
* millisecond playback updates;
* animation frame data;
* raw audio buffers;
* continuous metering data.
Then let’s discuss if we should change that approach.
Electron IPC should generally carry:

* commands;
* discrete state changes;
* bounded progress updates;
* job lifecycle events;
* low-frequency notifications.

It should not become a 60 FPS visualization bus unless there is a measured and unavoidable reason.

Preferred Investigation
Determine whether visualizer analysis can remain entirely within the renderer’s Web Audio graph.

11. AudioWorklet Audit
If Song Pages uses:

* ScriptProcessorNode;
* custom real-time audio analysis;
* custom DSP;
* timing-sensitive audio processing;

investigate AudioWorklet.

Do not migrate merely because AudioWorklet is newer.

First identify:
* current audio graph;
* actual main-thread load;
* visualizer stutter;
* callback timing problems;
* browser support requirements;
* complexity introduced by the migration.
Use AudioWorklet where it materially improves timing-sensitive audio processing.

12. Visualizer Architecture
Song Pages includes a dedicated visualizer mode, so rendering architecture deserves its own audit.
Identify the current rendering approach:
* DOM;
* SVG;
* Canvas 2D;
* WebGL;
* PixiJS;
* other.
Measure:
* frame rate;
* CPU;
* GPU;
* memory;
* behavior during React rerenders;
* behavior during track changes;
* behavior while streaming;
* behavior on integrated graphics.
Investigate PixiJS
PixiJS may be valuable for:
* large particle systems;
* layered effects;
* sprites;
* GPU-heavy scenes;
* high-frequency animation.
Do not migrate simple visualizers to PixiJS without evidence.
Investigate OffscreenCanvas
If Canvas rendering is genuinely CPU-heavy, investigate:
* transferControlToOffscreen();
* worker-based rendering;
* browser / Electron support in the project’s target versions;
* complexity of moving rendering ownership.
Again: benchmark first.
Architectural Goal
A visualizer dropping frames should not interrupt audio playback.
A busy React UI should not interrupt audio playback.
Audio processing should not unnecessarily depend on visualizer frame rate.

13. Waveform Strategy and WaveSurfer.js
Investigate WaveSurfer.js for workflows requiring:
* interactive waveforms;
* seeking;
* timeline display;
* regions;
* markers;
* clip selection UI;
* zoom;
* spectrogram-style extensions.
Do not assume WaveSurfer is an audio editor or FFmpeg replacement.
Before adoption, evaluate:
* current waveform implementation;
* bundle cost;
* React integration;
* large-file memory behavior;
* long DJ mix behavior;
* remote audio behavior;
* CORS implications;
* precomputed peaks;
* whether the waveform is editorial or merely decorative.
Important Song Pages Use Case
For long files or large catalogs, investigate precomputed waveform peaks rather than repeatedly decoding entire audio files in the renderer.
Potential architecture:
* background job generates compact peaks;
* peaks are cached;
* renderer displays peaks;
* playback remains independent.
This may be more valuable than adopting any particular waveform library.

14. Metadata Architecture
Investigate music-metadata for local metadata parsing.

Potential uses:
* MP3 tags;
* duration;
* bitrate;
* sample rate;
* embedded artwork;
* FLAC metadata;
* M4A metadata;
* WAV metadata where available.
Do not assume the same library provides complete, reliable tag writing across every required format.
Required Design Question
Song Pages has its own catalog metadata model. Determine the relationship among:
1. file-embedded metadata;
2. local Song Pages project metadata;
3. published JSON metadata;
4. remote catalog metadata.
Define precedence explicitly.
For example:
* Is embedded ID3 merely an import source?
* Does editing Song Pages metadata rewrite the original file?
* Are files immutable unless the user explicitly chooses “write tags”?
* What happens when published JSON disagrees with local metadata?
* How are provenance and user edits preserved?
Avoid accidental destructive metadata writes.

15. FFmpeg and Heavy Media Processing
If Song Pages needs:
* clipping;
* transcoding;
* normalization;
* rendering;
* format conversion;
* concatenation;
* stream preparation;
* audio extraction;
* media probing;
Investigate bundled FFmpeg / FFprobe.
Important Correction
Do not automatically choose fluent-ffmpeg.
First inspect:
* current maintenance status;
* direct process invocation options;
* argument safety;
* progress parsing;
* cancellation;
* packaging;
* platform-specific binaries.
A thin internal wrapper around explicit FFmpeg commands may be safer and easier to reason about than a large abstraction.

Process Isolation
Do not run expensive FFmpeg work synchronously in:

* renderer;
* main process event loop.

Investigate:

* child processes;
* UtilityProcess where appropriate;
* job queue architecture.

Each job should ideally support:

* unique job ID;
* progress;
* cancellation;
* timeout where appropriate;
* structured result;
* structured failure;
* cleanup of partial files;
* application shutdown behavior.

Security
Never construct shell commands through unsafe string concatenation of renderer-controlled values.
Prefer explicit executable invocation with argument arrays and validated inputs.

16. Background Job Architecture
Because Song Pages may perform multiple expensive operations, investigate whether a small unified job system would reduce architectural drift.

Potential jobs:

* metadata scan;
* waveform peak generation;
* FFmpeg conversion;
* catalog import;
* artwork processing;
* remote download;
* export;
* publish preparation.

Possible lifecycle:

* queued;
* starting;
* running;
* cancelling;
* completed;
* failed.

This is a suggestion, not an order.

Only implement if multiple existing workflows would genuinely benefit.

17. File Import and Large Catalog Performance

Song Pages targets high-velocity creators. Assume some users will eventually have:

* thousands of tracks;
* large WAV files;
* large artwork;
* deep folders;
* repeated imports;
* missing files;
* duplicate files;
* renamed files.

Audit:

* whether files are read entirely into memory;
* whether directory scans block;
* concurrency limits;
* duplicate detection;
* metadata caching;
* artwork caching;
* incremental scanning;
* cancellation;
* progress reporting.

Avoid unbounded Promise.all() across huge file sets.
Investigate bounded concurrency where bulk operations exist.

18. Memory Audit
Electron media applications can consume memory through multiple independent systems:
* Chromium;
* React;
* decoded audio;
* waveform buffers;
* artwork;
* visualizer textures;
* WebGL resources;
* remote caches;
* background processes.

Perform targeted memory investigation around:
* repeated track changes;
* repeated visualizer mode entry/exit;
* long playback sessions;
* large WAV files;
* opening and closing secondary windows;
* importing large catalogs;
* switching catalogs repeatedly.

Look for:
* unreleased object URLs;
* retained AudioBuffers;
* orphaned event listeners;
* uncleared timers;
* stale React subscriptions;
* unreleased Pixi/WebGL resources;
* abandoned workers;
* abandoned FFmpeg processes;
* image cache growth.

19. Desktop Context Menus
Investigate native-feeling context menus.

Possible uses:
* cut;
* copy;
* paste;
* select all;
* copy song URL;
* reveal file in Finder / Explorer;
* copy metadata;
* open published page;
* inspect element in development.

electron-context-menu may be appropriate, but first determine whether:

* existing menus already work;
* native Electron Menu APIs are sufficient;
* dependency cost is justified.

Development-only inspection options must not accidentally create unsafe production behavior.

20. Productivity Layout
Investigate whether resizable panel infrastructure would improve:

* playlist sidebar;
* catalog browser;
* metadata inspector;
* visualizer preview;
* waveform / timeline;
* streamer controls.

react-resizable-panels is a candidate, not a requirement.

Evaluate:
* keyboard accessibility;
* persistence;
* minimum sizes;
* collapsed states;
* responsive behavior;
* multi-window implications.

21. Accessible UI Primitives
Investigate whether the current component architecture needs stronger accessible primitives for:

* dialogs;
* menus;
* popovers;
* sliders;
* volume controls;
* dropdowns;
* tooltips.

Radix UI Primitives may be useful if compatible with the existing design system.

Do not layer a second component architecture over a working one without a concrete need.

Audit keyboard navigation for a media productivity application, especially:

* spacebar behavior;
* focus conflicts;
* sliders;
* modal dialogs;
* playlist navigation;
* global versus local shortcuts.

22. Global Media Controls

Investigate desktop playback control when Song Pages is:

* minimized;
* unfocused;
* behind another application.

Possible mechanisms include:
* Electron globalShortcut;
* Web Media Session APIs;
* OS-specific integrations.

Do not assume globalShortcut is automatically the best mechanism for physical media keys.

Audit:

* conflicts with system shortcuts;
* registration failure;
* cleanup on quit;
* macOS permissions or behavior;
* Windows behavior;
* keyboard shortcut customization.

Prioritize standard media semantics where possible.

23. OS-Specific Media Integration
Investigate selectively:

Windows

* taskbar thumbnail controls / ThumbarButtons;
* media integration where appropriate.

macOS
* native media behavior;
* dock menu opportunities;
* system integration appropriate to current Electron APIs.

Do not build platform-specific features simply to claim platform integration.
Rank them according to actual user value.

24. Window Design and Custom Title Bars
Investigate whether custom title bars would materially improve Song Pages.
Possible Electron options include platform-specific hidden title bar or overlay approaches.
Before changing:
* verify drag regions;
* window controls;
* fullscreen behavior;
* accessibility;
* macOS traffic lights;
* Windows snap behavior;
* double-click title behavior;
* multi-monitor behavior.
A custom title bar is polish, not a priority over playback stability or security.

25. Window Startup and FOUC
Audit startup behavior.

Set BrowserWindow.backgroundColor to a color matching the application’s initial theme to prevent bright flashes.
Investigate the best window-show strategy for the current application.

Possible approaches include:

* show: false plus ready-to-show;
* showing earlier with a correct background color;
* a lightweight startup shell.

Do not mechanically wait for ready-to-show if doing so slows perceived startup or interacts poorly with complex loading.

Measure:
* process launch to first window;
* first meaningful paint;
* interactive readiness.

26. Window State Persistence
Ensure Song Pages handles:
* window dimensions;
* maximized state;
* screen position;
* display removal;
* laptop docking / undocking;
* monitor resolution changes.

Investigate:
* a small custom persistence layer;
* electron-window-state;
* existing application state infrastructure.

Validate restored bounds against currently available displays so a saved window does not reopen off-screen.

27. Logging and Diagnostics
Audit logging across:

* main process;
* preload;
* renderer;
* background jobs;
* FFmpeg;
* remote fetches;
* publishing;
* streamer mode.

Investigate electron-log or an equivalent structured approach.

Requirements should include:

* local log files;
* rotation or size limits;
* severity levels;
* timestamps;
* process / subsystem identity;
* useful job IDs;
* redaction of secrets;
* redaction of sensitive URLs where appropriate;
* no uncontrolled dumping of user metadata.

Development Goal
A user should eventually be able to provide a useful diagnostic bundle without manually opening DevTools.
Consider a future “Export Diagnostics” feature containing safe information such as:

* app version;
* Electron version;
* OS;
* recent sanitized logs;
* enabled features;
* recent job failures.

Do not include personal catalog data by default.

28. Crash and Failure Recovery
Audit failure handling.
Do not assume that adding:
process.on('uncaughtException')
creates graceful recovery.

An uncaught exception may leave process state unreliable.
Instead investigate a deliberate strategy for:

* logging fatal errors;
* notifying users;
* renderer crash detection;
* background worker crash detection;
* FFmpeg crash cleanup;
* restart behavior;
* preserving unsaved work;
* preventing restart loops.

Use native error dialogs selectively.
Do not automatically restart after every fatal error.

Special Media Requirement
If a nonessential subsystem crashes, ask whether playback can continue.
For example:

* visualizer crash should ideally not destroy the catalog;
* waveform generation failure should not destroy playback;
* metadata extraction failure should not destroy the application;
* streamer failure should be isolated where feasible.

29. Packaging and ASAR
Audit packaging.

Verify whether the chosen packager uses ASAR appropriately.

Identify resources that cannot execute correctly from inside ASAR, potentially including:

* FFmpeg binaries;
* FFprobe binaries;
* native modules;
* helper executables;
* platform-specific resources.

Configure unpacking deliberately.

Test packaged production builds. Development success is insufficient.

Required platform tests should eventually include:

* clean install;
* first launch;
* local file playback;
* remote catalog playback;
* visualizer;
* media processing;
* update path if applicable;
* uninstall behavior;
* paths containing spaces;
* Unicode paths.

30. Bundle Size and Startup Optimization
Audit bundle composition before attempting optimization.
Measure:

* packaged size;
* renderer JS size;
* main process startup cost;
* preload size;
* dependency weight;
* first meaningful paint.

Investigate whether Vite or another build configuration should bundle Main and Preload code, but do not assume renderer bundling strategy should automatically be copied to Electron Main.

Be careful with:

* native modules;
* dynamic requires;
* optional dependencies;
* runtime-loaded resources.

Dependency Audit
Identify:
* unused packages;
* duplicate libraries;
* giant transitive dependencies;
* packages used for trivial functionality;
* development packages accidentally shipped.

Do not pursue tiny size wins at the expense of maintainability.

31. V8 Code Cache Claim: Verify Before Acting
Do not implement “V8 code caching” merely because it appeared in a best-practices list.
Investigate:

* whether Electron / Chromium already provides relevant caching behavior;
* whether the proposed mechanism is supported by the current build system;
* whether it creates measurable startup improvement;
* whether it complicates updates or packaging.

Treat this as an experimental optimization requiring evidence, not a default requirement.

32. React Rendering Audit
Use React profiling where useful.
Look for:

* broad rerenders caused by playback progress;
* context providers invalidating the entire tree;
* visualizer data entering React state;
* giant playlist rerenders;
* unstable callbacks;
* unnecessary derived state;
* expensive artwork components;
* unvirtualized large lists.

For large catalogs, investigate list virtualization only if current scale or profiling justifies it.
The objective is not “maximum memoization.”
The objective is predictable performance.

33. Streaming / DJ / VC Mode Isolation
Treat DJ / VC / streamer mode as a distinct reliability domain.

VC Mode is near 1.0. Treat it as a high-value working subsystem. Do not refactor VC Mode internals during this audit unless there is a clear security, stability, or architectural reason. Prefer documenting risks and proposing targeted follow-up slices.

Audit:

* capture sources;
* audio routing;
* network reconnect behavior;
* encoder lifecycle;
* credential handling;
* stream status;
* dropped connection behavior;
* UI responsiveness during broadcast;
* local playback interaction.

Questions:

* Can streamer failure interrupt ordinary playback?
* Can reconnect loops consume uncontrolled resources?
* Are credentials exposed to renderer code?
* Is broadcast state recoverable?
* Are logs sufficient to diagnose a failed stream?
* Is there a clear state machine for connecting / live / reconnecting / failed / stopped?

Consider explicit streamer lifecycle states.

34. Discord Rich Presence
Investigate Discord Rich Presence only as an optional feature.

Potential states:
* listening to track;
* editing track;
* broadcasting;
* browsing catalog.
Before adoption, evaluate:
* privacy;
* opt-in behavior;
* maintenance;
* dependency health;
* user value;
* whether current Discord APIs and libraries support the desired behavior.
Never expose unpublished track information without explicit user intent.

35. Library Investigation List
The following are candidates for investigation, not automatic installation orders:
* WaveSurfer.js — interactive waveforms and regions
* PixiJS — GPU-accelerated complex visualization
* music-metadata — local audio metadata parsing
* FFmpeg / FFprobe — media transformation and probing
* react-resizable-panels — productivity layouts
* Radix UI Primitives — accessible low-level UI
* Zustand — lightweight state management where justified
* electron-context-menu — desktop context menu convenience
* electron-log — cross-process logging
* electron-window-state — window persistence
* Axios — only if it improves over existing networking
* Playwright — only for genuinely necessary browser automation 

For every proposed dependency answer:
1. What exact problem does it solve?
2. Do we already solve that problem?
3. What is its maintenance health?
4. What is its bundle / packaging impact?
5. Does it run in renderer, main, preload, or worker?
6. What new security surface does it create?
7. What is the removal cost?
8. Is a small internal implementation simpler?

36. Suggested Priority Order
Use this as a starting hypothesis, then adjust based on codebase evidence.

P0 — Security and Dangerous Boundaries

* Node integration / context isolation audit
* preload exposure audit
* IPC validation
* navigation policy
* remote URL policy
* CSP
* unsafe path handling
* arbitrary process execution
* dangerous remote fetch proxy behavior

P1 — Playback and Responsiveness
* authoritative audio architecture
* high-frequency React state
* high-frequency IPC
* main-thread blocking
* FFmpeg isolation
* visualizer impact on playback
* memory leaks
* large-file behavior

P1 — Reliability
* logging
* job lifecycle
* worker cleanup
* failure handling
* packaged-build verification
* streamer state management

P2 — Scale
* large catalog imports
* metadata caching
* waveform peak caching
* bounded concurrency
* list rendering
* artwork memory
* incremental scanning

P2 — Desktop UX
* context menus
* media controls
* window state
* startup polish
* resizable panels
* accessibility audit

P3 — Optional Platform Polish
* custom title bars
* Windows taskbar controls
* Discord Rich Presence
* specialized OS integrations
* speculative V8 caching work

37. Required Deliverables From This Audit
Before a broad implementation pass, provide:

A. Architecture Map
A concise map of:

* Main Process
* Preload
* Renderer
* audio engine
* visualizer engine
* streamer engine
* filesystem services
* networking services
* background jobs
* persistence
* packaging

Show actual current architecture, not an idealized target.

B. Security Boundary Map
Identify:

* trusted code;
* untrusted remote data;
* local user-selected files;
* privileged operations;
* IPC boundaries;
* external navigation;
* remote fetches.

C. Performance Risk Map
Identify likely sources of:

* UI blocking;
* playback stutter;
* visualizer frame loss;
* memory growth;
* startup delay;
* catalog-scale slowdown.

D. Dependency Recommendations
For each suggested dependency:

* adopt;
* investigate;
* defer;
* reject.

Explain why.

E. Prioritized Improvement Plan
Produce a proposed sequence of small implementation slices.
Prefer slices that:

* are testable;
* can be committed independently;
* reduce risk;
* avoid mixing security rewrites with visual polish;
* preserve rollback options.

38. Final Engineering Principle
Song Pages should not become “more Electron” than necessary.

The Web application remains strategically important. The desktop application should add capabilities the Web cannot provide cleanly:

* deep local file integration;
* resilient desktop playback;
* native OS integration;
* heavy local media processing;
* background workflows;
* richer creator productivity;
* specialized streaming and visualization.

Preserve shared Web architecture where it is effective.

Isolate desktop privilege.

Keep audio stable.

Keep remote content untrusted.

Move heavy work away from latency-sensitive UI and playback paths.

Measure before optimizing.

Prefer explicit capability boundaries over broad access.

Prefer targeted improvements over framework churn.

The goal of this sprint is not to demonstrate how many Electron best practices can be implemented. The goal is to make Song Pages measurably safer, more responsive, more resilient, and better prepared for the unusually broad combination of creator tooling, Web publishing, distributed catalog consumption, media playback, visualization, and live streaming that the application is becoming.