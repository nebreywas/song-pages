> **Archived spec** (audit closed 2026-07-10). Active index: [../../README.md](../../README.md).

# Song Pages SQLite & Data Layer Audit

**Status:** Specification complete — audit **closed** 2026-07-10  
**Deliverables:** [../../Song Pages SQLite and Data Layer Audit.md](../../Song%20Pages%20SQLite%20and%20Data%20Layer%20Audit.md) · [../../persistence-philosophy.md](../../persistence-philosophy.md) · [../../settings-and-persistence.md](../../settings-and-persistence.md)  
**Purpose:** Evaluate the current SQLite database and application data layer before making structural changes  
**Architectural context:** [persistence-philosophy.md](./persistence-philosophy.md) — Snapshot-First principle (relationship classes, FK scope)  
**Primary rule (historical):** Do not change schema, migrations, queries, persistence behavior, or existing data until the audit is complete and findings are jointly reviewed — **satisfied; audit closed**  
**Primary objective:** Improve reliability, clarity, maintainability, performance, data safety, and future extensibility without losing useful development data
---
# 1. Context

Song Pages has evolved rapidly. SQLite now supports or may support artists, songs, catalogs, subscriptions, playlists, cached media state, settings, VC Mode designs, Kudos presets, command bindings, host content, source adapters, compilation/publishing state, and future editor workflows.

The database may not be fundamentally unsound. SQLite is appropriate for this application class, and the current implementation may already follow many good practices.

The concern is that rapid feature growth can produce duplicated storage logic, ad hoc migrations, weak transaction boundaries, unclear ownership, insufficient constraints, oversized JSON payloads, stale columns, inconsistent error handling, and hidden coupling between features.

This audit should determine what is actually happening before recommending changes.

# 2. Core Audit Rule

Before changing code or data:

1. Inspect the current schema.
2. Inspect every initialization and migration path.
3. Inspect database access modules and call sites.
4. Map which features own which tables and fields.
5. Identify what data is valuable and must be preserved.
6. Distinguish schema problems from application-layer problems.
7. Measure query and database behavior where practical.
8. Produce an audit report.
9. Propose small implementation slices.
10. Await approval before changing schema or persistence behavior.

Do not redesign the database merely because another schema would look cleaner.

Do not introduce an ORM, query builder, migration library, schema validator, or new database dependency without explicit approval.

Do not delete, rebuild, or reset the development database.

# 3. Required Audit Deliverable

Maintain the audit in:

```text
documentation/Song Pages SQLite and Data Layer Audit.md
```

The first deliverable is a report, not a broad implementation pass.

Begin with:

- executive summary;
- top findings;
- what is already working well;
- highest-risk issues;
- recommended implementation order;
- explicit no-change / defer recommendations.

For each finding include:

| Field | Required |
|---|---|
| Current state | Yes |
| Evidence | Yes |
| Risk or limitation | Yes |
| Recommendation | Yes |
| Priority | P0 / P1 / P2 / P3 |
| Estimated scope | small / medium / large |
| Data-loss risk | low / medium / high |
| Regression risk | low / medium / high |
| Implement now? | yes / no / investigate |

# 4. Audit Scope

Inspect:

- database file creation;
- SQLite connection configuration;
- `better-sqlite3` usage;
- all tables, indexes, constraints, triggers, and views;
- schema versioning and migrations;
- seed/default data;
- settings persistence;
- transactions;
- prepared statements;
- query construction;
- data serialization;
- JSON columns or JSON-in-text usage;
- backup/export and restore/import behavior;
- crash recovery assumptions;
- integrity checks;
- packaged-app database paths;
- development versus production behavior;
- test database strategy;
- database logging and diagnostics;
- Electron main/preload/renderer boundaries;
- performance at current and future catalog sizes.

Also determine whether apparent database problems belong instead in:

- repository/service layer;
- domain model;
- validation layer;
- feature-specific code;
- migration tooling;
- caching layer;
- UI state;
- filesystem layout.

# 5. Preserve Existing Development Data

The current database contains useful development data.

Before any approved schema-changing work:

1. Identify the active database path.
2. Identify sidecar files relevant to the selected journal mode.
3. Create a verified backup strategy.
4. Confirm the backup can be opened.
5. Record current schema version.
6. Record row counts by table.
7. Run appropriate integrity checks.
8. Define rollback behavior.
9. Test migrations against a copied database first.
10. Never test destructive migration work against the only copy.

Do not assume copying only the main `.db` file is sufficient while the database is open or when WAL state may exist.

# 6. Architecture Map

Produce an actual current-state map:

```text
Electron Main
    ↓
Database connection / initialization
    ↓
Repositories / feature modules
    ↓
Prepared statements / transactions
    ↓
SQLite database
```

Show:

- where the connection is created;
- how many connections exist;
- which process owns the database;
- which modules access it;
- which IPC handlers reach it;
- whether renderer code ever constructs SQL;
- whether feature modules bypass a common data layer;
- whether database calls are concentrated or scattered;
- whether synchronous calls occur in latency-sensitive paths;
- whether any secondary process opens the same database.

Document the actual architecture, not an ideal target.

# 7. Database Ownership and Process Boundary

Confirm that SQLite access is owned by Electron main or another deliberate privileged process.

Audit:

- renderer access to SQLite;
- preload exposure;
- generic database methods;
- raw SQL over IPC;
- renderer-controlled table/column names;
- arbitrary query fragments;
- secondary-window database capabilities;
- capability-oriented versus generic APIs.

Preferred:

```text
Renderer intent
→ narrow IPC command
→ validated application service
→ prepared database operation
```

Avoid:

```text
Renderer
→ generic query API
→ raw SQL
```

# 8. Schema Inventory

For every table report:

| Item | Questions |
|---|---|
| Purpose | What feature owns it? |
| Primary key | Stable and appropriate? |
| Foreign keys | Present where needed? |
| Nullability | Intentional? |
| Defaults | Correct and centralized? |
| Unique constraints | Missing or over-restrictive? |
| Check constraints | Useful for enums/ranges/invariants? |
| Indexes | Match real query patterns? |
| Data types | Appropriate under SQLite affinity? |
| JSON/text payloads | Justified? |
| Lifecycle | Created, updated, archived, deleted how? |
| Orphan risk | Can records become detached? |
| Migration history | When/how introduced? |
| Current row count | Useful scale evidence |

Also identify:

- unused tables;
- stale columns;
- duplicate concepts;
- inconsistent naming;
- fields mixing unrelated concerns;
- overly generic tables;
- inconsistent enum storage;
- Boolean inconsistencies;
- timestamp inconsistencies;
- IDs with inconsistent type or meaning.

Do not remove anything during the audit.

# 9. Source of Truth and Data Ownership

For each major entity define the authoritative source:

- artist;
- song;
- playlist;
- catalog subscription;
- cached asset;
- host content;
- VC design;
- Kudo;
- command binding;
- settings;
- published metadata;
- local editor draft;
- external-source snapshot.

Questions:

- Is SQLite authoritative?
- Is remote JSON authoritative?
- Is the filesystem authoritative?
- Is a source adapter authoritative?
- Is the row a cache or durable user data?
- Can it be regenerated?
- Does deletion mean delete, unlink, archive, or invalidate?
- What happens when local and remote data disagree?
- What happens when a source disappears?

This may reveal application-layer ambiguity rather than schema defects.

# 10. Foreign Keys and Referential Integrity

Audit whether foreign-key enforcement is explicitly enabled for every connection.

Inspect:

- `PRAGMA foreign_keys`;
- connection initialization order;
- tests verifying enforcement;
- missing foreign keys;
- inappropriate cascades;
- missing cascade behavior;
- orphan rows;
- polymorphic references;
- soft-delete interactions;
- join tables without uniqueness constraints.

Do not add cascades casually.

For every proposed cascade explain:

- what user-visible data disappears;
- whether files are also deleted;
- whether undo/restore exists;
- whether cache rows should cascade;
- whether history should survive.

# 11. Constraints and Application Validation

Determine which invariants belong in SQLite and which belong in application code.

Potential database constraints:

- required fields;
- unique identifiers;
- valid ranges;
- limited enums;
- nonnegative counters;
- unique join pairs;
- foreign-key relationships.

Potential application validation:

- complex business rules;
- source provenance;
- file existence;
- remote URL policy;
- user-facing warnings;
- validation requiring external services.

Avoid both extremes:

```text
No database constraints; application must always behave perfectly
```

and:

```text
Every product rule encoded into inflexible SQL
```

The goal is layered protection.

# 12. Migration System Audit

Inspect:

- schema version mechanism;
- `PRAGMA user_version`, if used;
- migration organization;
- ordering;
- idempotency assumptions;
- transactional behavior;
- failure handling;
- partial migration risk;
- startup behavior;
- downgrade assumptions;
- backup-before-migrate behavior;
- logging;
- tests using copied real databases.

Questions:

- Can users skip multiple versions safely?
- Are migrations applied sequentially?
- Does startup continue after failure?
- Is the prior database preserved?
- Can failure leave partial state?
- Are destructive migrations separated?
- Are data transforms bounded and testable?
- Are migrations mixed with ordinary initialization?
- Can development code mutate schema outside migration history?

Do not introduce a migration library automatically.

# 13. Transaction Audit

Inspect whether multi-step writes use transactions appropriately.

Examples:

- create artist plus defaults;
- import catalog plus songs;
- playlist reorder;
- replace playlist contents;
- delete artist plus dependents;
- save VC design;
- save settings collections;
- cache state updates;
- migration transforms;
- bulk update;
- source-adapter import.

For each operation ask:

- Must all steps succeed or none?
- Can the app crash between steps?
- Can partial state become visible?
- Is filesystem work mixed inside a long transaction?
- Is a transaction held while doing network/file work?
- Are nested transactions composed safely?
- Are errors propagated with enough context?

Avoid long transactions around remote fetches, FFmpeg, large file copies, user dialogs, or unpredictable work.

# 14. Prepared Statements and Query Safety

Audit all SQL construction.

Confirm:

- values use bound parameters;
- table names are not renderer-controlled;
- column names are not renderer-controlled;
- sort direction is allowlisted;
- dynamic `IN` clauses are safe;
- search expressions are bounded;
- raw string concatenation is not used for user values;
- `LIKE` escaping is intentional;
- statement reuse is sensible;
- statements do not outlive the connection.

Any generic query method requires special scrutiny.

 15. Repository / Service Layer Audit

The biggest improvements may belong in application code.

Assess whether database access is:

- organized by feature;
- centralized appropriately;
- duplicated;
- mixed into IPC handlers;
- mixed into React/UI code;
- returning raw rows everywhere;
- translating rows into domain objects consistently;
- using stable functions and error contracts.

Possible separation:

```text
IPC handler
→ application service
→ repository
→ SQLite
```

Do not force this exact architecture if the current code is simpler and sound.

Avoid a large enterprise-style abstraction layer.

# 16. Settings Storage Audit

Settings tables often become accidental dumping grounds.

Inspect:

- every key;
- value format;
- ownership;
- default source;
- versioning;
- JSON parsing;
- malformed-value handling;
- stale keys;
- renamed keys;
- global versus project scope;
- window versus application scope;
- large objects stored as settings;
- settings that should be normal tables;
- tables that should instead be settings.

Questions:

- Are defaults duplicated between UI and database?
- Can settings reset safely?
- Are unknown keys preserved?
- Are old keys migrated?
- Can malformed JSON break startup?
- Are VC designs, Kudos, command mappings, and complex collections modeled appropriately?

Do not normalize settings for stylistic purity.

# 17. JSON-in-SQLite Audit

For every JSON field or settings JSON value ask:

- Why is JSON appropriate?
- Is the structure versioned?
- Is it validated on read?
- Is it validated on write?
- Can old versions migrate?
- Are individual fields frequently queried?
- Are full objects rewritten unnecessarily?
- Can malformed JSON crash startup?
- Is partial corruption isolated?
- Does JSON duplicate normalized columns?
- Is this durable data or replaceable configuration?

Potential outcomes:

- keep as JSON;
- add schema version;
- add validation;
- split selected query-critical fields;
- promote to table;
- leave unchanged.

# 18. Timestamp, ID, and Naming Consistency

Audit:

### Timestamps
- ISO text versus integer epoch;
- UTC versus local;
- seconds versus milliseconds;
- creation/update fields;
- null semantics;
- timezone assumptions.

### IDs
- integer keys;
- UUIDs;
- slugs;
- source IDs;
- composite keys;
- external IDs;
- mutable identifiers used as keys.

### Naming
- table naming;
- snake_case/camelCase boundaries;
- foreign-key naming;
- Boolean naming;
- status/enumeration naming;
- source/provenance naming.

Do not rename broadly for aesthetics. Recommend renames only where ambiguity creates bugs or migration risk.

# 19. Index and Query Plan Audit

Do not add indexes by intuition alone.

Inventory real query patterns:

- artist lookup by ID/slug/source;
- songs by artist;
- playlist ordering;
- cache lookup;
- subscription refresh;
- settings lookup;
- VC/Kudos lookup;
- recently changed;
- search;
- duplicate detection;
- source-adapter matching.

Use `EXPLAIN QUERY PLAN` where helpful.

For each proposed index report:

- query served;
- expected selectivity;
- write cost;
- storage cost;
- whether an existing index covers it;
- whether the table is large enough to matter.

Identify missing, redundant, duplicate, misordered, or defeated indexes.

# 20. Scale and Performance

Use future stress thinking around:

```text
5,000 songs
50 subscribed artists
many playlists
many cached assets
multiple VC designs
large settings/config history
```

Do not optimize prematurely.

Assess:

- query frequency;
- repeated full scans;
- N+1 patterns;
- per-row statements in loops;
- bulk insert behavior;
- transaction use;
- statement preparation;
- synchronous calls in high-frequency UI paths;
- database work during playback progress;
- overly frequent writes;
- playlist reorder complexity;
- catalog refresh complexity;
- startup query count;
- cache cleanup scale.

Do not assume `better-sqlite3` being synchronous is automatically a problem. Measure genuinely slow or frequent operations before moving work into workers.

# 21. Journal Mode, Busy Handling, and Pragmas

Inspect actual connection pragmas and why they are set.

Potential areas:

- `journal_mode`;
- `synchronous`;
- `foreign_keys`;
- `busy_timeout`;
- `cache_size`;
- `temp_store`;
- `wal_autocheckpoint`;
- `journal_size_limit`;
- `trusted_schema`;
- defensive options supported by the current build.

Questions:

- What journal mode is active?
- Is there one connection or more?
- Is concurrent read/write needed?
- Are `SQLITE_BUSY` errors observed?
- Is `busy_timeout` configured?
- Are checkpoints handled?
- Could WAL grow unexpectedly?
- Does backup account for WAL?
- Does shutdown leave sidecars?
- Are pragmas applied on every connection?

Do not enable or change WAL merely because it is commonly recommended.

# 22. Integrity Checks and Health Diagnostics

Assess use of:

- `PRAGMA quick_check`;
- `PRAGMA integrity_check`;
- `PRAGMA foreign_key_check`;
- schema version checks;
- migration checks;
- row-count diagnostics;
- startup health checks;
- manual diagnostics tools.

Do not run expensive full integrity checks on every startup without evidence.

Possible strategy:

- lightweight checks after migration;
- deeper checks through diagnostics;
- integrity check before backup/export;
- explicit support workflow.

# 23. Backup, Restore, and Recovery

Audit the current backup story.

Questions:

- Is there a backup feature?
- Is the DB copied while open?
- Is WAL considered?
- Is SQLite backup support available through current tooling?
- Can a safe support copy be exported?
- Can development data be restored?
- Are schema and app versions recorded?
- Are host-content files backed up with references?
- Are caches intentionally excluded?
- Are backups atomic enough?
- Can users identify backup age?

Distinguish database backup, full project/data backup, cache rebuild, settings export, and diagnostic export.

# 24. Data Deletion and Lifecycle

Audit every destructive action.

For each delete ask:

- hard delete or soft delete?
- confirmation?
- transaction?
- dependent rows?
- dependent files?
- cache cleanup?
- undo/restore?
- history?
- source data re-importable?
- UI removal versus actual deletion?

Potential entities:

- artist;
- song;
- playlist;
- subscription;
- cache entry;
- VC design;
- Kudo;
- host content;
- settings profile;
- source-adapter item.

Avoid blanket soft-delete architecture unless product needs it.

# 25. Filesystem / Database Consistency

Audit consistency between:

- song rows and local audio paths;
- host-content configuration and media files;
- cache rows and files;
- compile project rows and output folders;
- artwork metadata and files;
- deleted rows and orphaned files;
- missing files and stale rows.

Questions:

- Which side is authoritative?
- How are missing files represented?
- Is cleanup automatic or manual?
- Can file work fail after DB commit?
- Can DB work fail after file copy?
- Is compensation implemented?
- Are temporary files used?
- Are partial imports visible?

Not every filesystem operation should be inside a DB transaction. Define safe multi-stage workflows.

# 26. Cache Data vs Durable Data

Classify every table or major field as:

- durable user-created data;
- imported source data;
- regenerable cache;
- transient runtime state;
- derived data;
- diagnostics/history.

This affects backup, migration priority, corruption handling, deletion, rebuild behavior, and testing.

A cache should be rebuildable. Durable data should never be casually reset to solve a bug.

# 27. Error Handling

Look for:

- swallowed errors;
- raw SQLite errors shown to users;
- generic failures without logs;
- startup crashes from malformed settings;
- partial transactions;
- errors without feature context;
- retries that repeat non-idempotent writes;
- untranslated constraint failures;
- locked-database behavior;
- migration failures;
- disk-full behavior;
- read-only filesystem behavior.

Preferred:

```text
SQLite error
→ repository/service context
→ structured application error
→ safe user-facing message
→ detailed sanitized log
```

# 28. Logging and Diagnostics

Map current database logging.

Useful events may include:

- connection open;
- active schema version;
- migration start/success/failure;
- integrity-check result;
- transaction failure;
- constraint failure;
- busy/locked errors;
- backup start/result;
- restore result;
- database path;
- database size;
- WAL size where relevant.

Do not log full lyrics, private metadata dumps, raw binary data, secrets, or sensitive URLs unnecessarily.

Future diagnostics may include app version, SQLite version, schema version, DB size, row counts, active pragmas, recent errors, and integrity-check results.

Recommendation only unless approved.

# 29. Testing Strategy

Audit existing tests.

Potential categories:

### Schema tests
- fresh DB creates;
- expected schema exists;
- foreign keys enabled.

### Migration tests
- supported old versions migrate;
- skipped versions migrate;
- copied development DB migrates;
- failure preserves recoverable data.

### Repository tests
- CRUD;
- uniqueness;
- constraints;
- rollback;
- ordering;
- malformed JSON/settings;
- missing relations.

### Integration tests
- subscribe/import;
- playlists;
- VC/Kudos/settings persistence;
- restart;
- cache cleanup;
- compile-related data if any.

### Recovery tests
- locked DB;
- disk full where feasible;
- corrupted copy;
- interrupted migration;
- missing files/sidecars.

Prioritize tests around proposed changes rather than building exhaustive infrastructure first.

# 30. Packaged Application Behavior

Confirm:

- DB path in development;
- packaged macOS path;
- packaged Windows path;
- first-run initialization;
- upgrade behavior;
- uninstall behavior;
- portable-build behavior;
- permissions;
- userData changes;
- native `better-sqlite3` packaging;
- ASAR unpack settings;
- backup/export destinations.

Development success is insufficient.

# 31. Dependency Review

Current library:

- `better-sqlite3`

Assess version, Electron/native compatibility, rebuild process, packaging, maintenance, worker support if needed, backup API availability, transaction usage, and safe-integer requirements.

Do not replace it without a concrete problem.

Potential future candidates must be evaluated, not automatically adopted:

- migration framework;
- query builder;
- ORM;
- schema validator;
- repository generator;
- backup helper.

For every proposed dependency explain the exact problem solved, current solution, migration cost, runtime cost, packaging impact, removal cost, and whether a small internal implementation is clearer.

# 32. Specific Feature Audits

## 32.1 Artists and Songs

Inspect identity, source IDs, duplicate detection, remote/local relationship, metadata precedence, deletion, slug uniqueness, ordering, artwork/audio references, and version concepts.

## 32.2 Subscriptions and Remote Catalogs

Inspect base URL, refresh state, last success, errors, provenance, removed songs, changed IDs, stale data, and transactional import.

## 32.3 Playlists

Inspect identity, ordering, reorder transactions, duplicates, snapshots versus live references, mixed sources, deleted/missing songs, and reorder performance.

## 32.4 Cache

Inspect identity, source URL, local path, status, size, last access, invalidation, cleanup, orphan rows/files, and rebuildability.

## 32.5 VC Designs

Inspect design version, nested JSON, regions, floats, rotations, assignments, migrations, defaults, and deleted host-content references.

## 32.6 Kudos

Inspect identity, content representation, ordering, effect settings, Unicode/emoji handling, and deleted command-binding references.

## 32.7 Command Bindings

Inspect stable command IDs, uniqueness, stale mappings, defaults, migration, overrides, and generated commands from user-created objects.

## 32.8 Settings

Inspect ownership, defaults, type handling, malformed values, naming, and versioning.

## 32.9 Future Content Editor

Do not design the editor in this audit. Assess whether the data layer can support drafts, autosave, unsaved changes, validation state, local versus published state, asset replacement, missing files, metadata provenance, possible history, multi-song editing, and schema evolution.

Identify blockers or preparatory improvements without prematurely building editor schema.

# 33. Priority Framework

## P0 — Data Loss / Corruption / Privilege

- destructive migration;
- arbitrary SQL/path injection;
- unverified destructive operation;
- corruption-prone workflow;
- broken atomic write;
- unsafe backup/restore;
- schema startup failure with no recovery.

## P1 — Reliability and Maintainability

- missing foreign-key enforcement;
- missing transaction around atomic workflow;
- migration fragility;
- duplicated persistence logic;
- malformed settings breaking startup;
- filesystem/DB inconsistency;
- orphan creation;
- unclear source of truth;
- packaged upgrade risk.

## P2 — Scale and Clarity

- indexes confirmed by query plan;
- N+1 queries;
- full scans;
- inconsistent naming;
- stale columns;
- large JSON requiring versioning;
- repository cleanup;
- diagnostics.

## P3 — Optional Refinement

- aesthetic renames;
- speculative normalization;
- ORM adoption;
- complex history systems;
- theoretical optimization without evidence.

# 34. Required Final Deliverables

## A. Current Architecture Map
Connection ownership, modules, IPC, feature boundaries, filesystem relationships.

## B. Schema Inventory
Every table, column, index, constraint, trigger/view, row count, and owner.

## C. Data Classification Map
Durable, imported, cache, transient, derived, diagnostics.

## D. Source-of-Truth Map
Major entities and conflict rules.

## E. Migration Assessment
Current mechanism, risks, backup behavior, recommended improvements.

## F. Integrity and Recovery Assessment
Foreign keys, integrity checks, backup, corruption, restore.

## G. Query and Index Assessment
Evidence-based recommendations.

## H. Application-Layer Assessment
Where improvements belong outside SQLite.

## I. Dependency Recommendations
Keep, investigate, defer, reject.

## J. Prioritized Improvement Plan
Small independently approvable commits.

## K. No-Change Recommendations
Areas that are unusual but appropriate and should remain unchanged.

# 35. Implementation Approval Rule

After the audit:

1. Propose exact commits.
2. Explain data impact.
3. Explain migration impact.
4. Explain rollback.
5. Explain tests.
6. Wait for individual approval.
7. Test against copied development data.
8. Preserve a pre-change backup.
9. Do not combine unrelated schema, UI, and feature work.
10. Record completed changes back into the audit.

# 36. Final Engineering Principle

The objective is not to produce the most normalized, abstract, fashionable, or enterprise-looking SQLite system.

The objective is to make Song Pages' data layer:

- understandable;
- safe;
- recoverable;
- testable;
- maintainable;
- appropriately constrained;
- performant at expected scale;
- ready for the future content editor;
- capable of evolving without destroying existing user data.

Prefer explicit ownership, prepared statements, purposeful constraints, short transactions, tested migrations, safe backups, clear source-of-truth rules, small application-layer improvements, evidence-based indexes, and incremental change.

Avoid schema churn, ORM-driven rewrites, destructive resets, speculative normalization, hidden migrations, generic raw-query IPC, long transactions around files/network, and assuming every persistence problem is a SQLite problem.

The first task is assessment.

The second task is agreement.

Only then should implementation begin.
