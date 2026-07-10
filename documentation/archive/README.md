# Documentation Archive

**Purpose:** Preserve historical specs, audit deliverables, and proposed sprints without cluttering the active documentation root.

**Active index:** [../README.md](../README.md)  
**Deferred decisions:** [../OPEN-QUESTIONS.md](../OPEN-QUESTIONS.md)

---

## Layout

| Folder | What belongs here | Examples |
|--------|-------------------|----------|
| **specs/** | Original MVP/product specifications — often **implemented** but kept for design intent | VC surface designer, kudos, commands, host content, audit *specifications* |
| **audits/** | Completed audit **reports** and review commentary — frozen backlog, approve commits individually | Application audit R2, review comments |
| **investigations/** | Closed one-off technical analyses superseded by canonical docs | `library_song_id` FK investigation |
| **sprints/** | Proposed discovery or prototype programs not currently scheduled | Audio effects discovery sprint, effects-lab templates |

---

## Linking convention

- From **archive** to **active** docs: `../../design-and-vision.md`, `../../persistence-philosophy.md`, etc.
- From **active** docs to archive: `./archive/specs/...`, `./archive/audits/...`
- From **code** (`@see`): prefer active architecture docs; use `documentation/archive/specs/...` only when the spec remains the authoritative product contract for that module.

---

## When to archive

| Event | Action |
|-------|--------|
| MVP spec fully shipped | Move spec to `specs/`; ensure `vc-mode-architecture.md` (or equivalent) reflects runtime |
| Audit closed | Move spec to `specs/`, report to `audits/`; keep philosophy/guidance at root |
| Investigation resolved | Move to `investigations/`; link from canonical doc |
| Sprint deferred | Move proposal to `sprints/` |

Do not delete archived files without maintainer approval — they record *why* decisions were made.
