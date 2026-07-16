/**
 * Song Creation Process — matrix of process × target with conditional detail panels.
 * Suno import maps into AI model / prompt rows (not a parallel Style Prompt UI).
 */

import type {
  Artist2AiModelEntry,
  Artist2AiPromptEntry,
  Artist2CreationProcess,
  Artist2CreationProcessTarget,
  Artist2CreationProcessType,
  Artist2PerformedContext,
  Artist2SongPayload,
} from './types';

export type CreationProcessPayloadSlice = {
  creationProcesses?: Artist2CreationProcess[];
  aiPrompts?: Artist2AiPromptEntry[];
  /** @deprecated Mapped into aiPrompts when AI generation is present. */
  stylePrompt?: string;
};

export const CREATION_PROCESS_TYPES: Artist2CreationProcessType[] = [
  'performed',
  'electronic_daw',
  'ai_generation',
  'other',
];

export const CREATION_PROCESS_TARGETS: Artist2CreationProcessTarget[] = [
  'music_mix',
  'vocals',
];

export const CREATION_PROCESS_TYPE_LABELS: Record<Artist2CreationProcessType, string> = {
  performed: 'Performed Recording',
  electronic_daw: 'Electronic / DAW',
  ai_generation: 'AI Generation',
  other: 'Other Processes',
};

export const CREATION_PROCESS_TARGET_LABELS: Record<Artist2CreationProcessTarget, string> = {
  music_mix: 'Music / Mix',
  vocals: 'Vocals',
};

export const PERFORMED_CONTEXTS: Artist2PerformedContext[] = [
  'studio',
  'personal',
  'live',
  'field',
];

export const PERFORMED_CONTEXT_LABELS: Record<Artist2PerformedContext, string> = {
  studio: 'Studio',
  personal: 'Personal',
  live: 'Live',
  field: 'Field',
};

export function newCreationProcessId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newAiModelId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `aim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newAiPromptId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `aip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function coercePerformedContexts(raw: unknown): Artist2PerformedContext[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const allowed = new Set(PERFORMED_CONTEXTS);
  const out = raw.filter(
    (value): value is Artist2PerformedContext =>
      typeof value === 'string' && allowed.has(value as Artist2PerformedContext),
  );
  return out.length > 0 ? out : undefined;
}

function coerceAiModels(raw: unknown): Artist2AiModelEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const models = raw
    .map((item): Artist2AiModelEntry | null => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Partial<Artist2AiModelEntry>;
      return {
        id: typeof row.id === 'string' && row.id.trim() ? row.id : newAiModelId(),
        provider: typeof row.provider === 'string' ? row.provider : undefined,
        modelName: typeof row.modelName === 'string' ? row.modelName : undefined,
        version: typeof row.version === 'string' ? row.version : undefined,
        primary: Boolean(row.primary),
        persona: typeof row.persona === 'string' ? row.persona : undefined,
      };
    })
    .filter((row): row is Artist2AiModelEntry => Boolean(row));
  return models.length > 0 ? ensureSinglePrimaryModel(models) : undefined;
}

function coerceAiPrompts(raw: unknown): Artist2AiPromptEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index): Artist2AiPromptEntry | null => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Partial<Artist2AiPromptEntry>;
      const promptType = row.promptType === 'negative' ? 'negative' : 'prompt';
      const target =
        row.target === 'vocals' || row.target === 'general' || row.target === 'music_mix'
          ? row.target
          : 'general';
      return {
        id: typeof row.id === 'string' && row.id.trim() ? row.id : newAiPromptId(),
        promptType,
        text: typeof row.text === 'string' ? row.text : undefined,
        // Negative prompts are never primary.
        primary: promptType === 'prompt' ? Boolean(row.primary) : false,
        target,
        sortOrder: Number.isFinite(row.sortOrder) ? Number(row.sortOrder) : index * 10,
      };
    })
    .filter((row): row is Artist2AiPromptEntry => Boolean(row))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

function coerceProcess(raw: unknown): Artist2CreationProcess | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<Artist2CreationProcess>;
  if (
    (row.target !== 'music_mix' && row.target !== 'vocals') ||
    (row.processType !== 'performed' &&
      row.processType !== 'electronic_daw' &&
      row.processType !== 'ai_generation' &&
      row.processType !== 'other')
  ) {
    return null;
  }
  return {
    id: typeof row.id === 'string' && row.id.trim() ? row.id : newCreationProcessId(),
    target: row.target,
    processType: row.processType,
    // Absent flag ⇒ available (older data had no explicit flag).
    available: row.available === false ? false : true,
    performedContexts: coercePerformedContexts(row.performedContexts),
    performedNotes: typeof row.performedNotes === 'string' ? row.performedNotes : undefined,
    primaryTool: typeof row.primaryTool === 'string' ? row.primaryTool : undefined,
    additionalTools: Array.isArray(row.additionalTools)
      ? row.additionalTools.filter((t): t is string => typeof t === 'string' && Boolean(t.trim()))
      : undefined,
    dawCommentary: typeof row.dawCommentary === 'string' ? row.dawCommentary : undefined,
    aiModels: coerceAiModels(row.aiModels),
    aiCommentary: typeof row.aiCommentary === 'string' ? row.aiCommentary : undefined,
    sameAsMusic: row.target === 'vocals' ? Boolean(row.sameAsMusic) : undefined,
    otherProcessName: typeof row.otherProcessName === 'string' ? row.otherProcessName : undefined,
    otherCommentary: typeof row.otherCommentary === 'string' ? row.otherCommentary : undefined,
  };
}

/** At most one Primary / Final AI model per process cell. */
export function ensureSinglePrimaryModel(models: Artist2AiModelEntry[]): Artist2AiModelEntry[] {
  if (models.length === 0) return [];
  const primaryIdx = models.findIndex((m) => m.primary);
  const keep = primaryIdx >= 0 ? primaryIdx : 0;
  return models.map((m, i) => ({ ...m, primary: i === keep }));
}

/** At most one Primary among normal (non-negative) prompts. */
export function ensureSinglePrimaryPrompt(prompts: Artist2AiPromptEntry[]): Artist2AiPromptEntry[] {
  // Exactly one primary across all prompts (any type). Primary and
  // positive/negative are independent statuses. Defaults to the first prompt.
  if (prompts.length === 0) return prompts;
  const primaryId = prompts.find((p) => p.primary)?.id ?? prompts[0].id;
  return prompts.map((p) => ({ ...p, primary: p.id === primaryId }));
}

export function findCreationProcess(
  processes: Artist2CreationProcess[],
  target: Artist2CreationProcessTarget,
  processType: Artist2CreationProcessType,
): Artist2CreationProcess | undefined {
  return processes.find((p) => p.target === target && p.processType === processType);
}

export function hasCreationProcess(
  processes: Artist2CreationProcess[],
  target: Artist2CreationProcessTarget,
  processType: Artist2CreationProcessType,
): boolean {
  return Boolean(findCreationProcess(processes, target, processType));
}

export function setCreationProcessEnabled(
  processes: Artist2CreationProcess[],
  target: Artist2CreationProcessTarget,
  processType: Artist2CreationProcessType,
  enabled: boolean,
): Artist2CreationProcess[] {
  const existing = findCreationProcess(processes, target, processType);
  if (enabled) {
    if (existing) return processes;
    return [
      ...processes,
      {
        id: newCreationProcessId(),
        target,
        processType,
        ...(processType === 'ai_generation' && target === 'vocals'
          ? { aiModels: [{ id: newAiModelId(), primary: true }] }
          : {}),
        ...(processType === 'ai_generation' && target === 'music_mix'
          ? { aiModels: [{ id: newAiModelId(), primary: true }] }
          : {}),
      },
    ];
  }
  return processes.filter((p) => !(p.target === target && p.processType === processType));
}

/**
 * Availability = cell exists AND is not explicitly unavailable. Used by the
 * matrix checkboxes / editor tabs (distinct from raw `hasCreationProcess`, which
 * only reports existence).
 */
export function isCreationProcessAvailable(
  processes: Artist2CreationProcess[],
  target: Artist2CreationProcessTarget,
  processType: Artist2CreationProcessType,
): boolean {
  const cell = findCreationProcess(processes, target, processType);
  return Boolean(cell && cell.available !== false);
}

/**
 * Toggle a cell's availability WITHOUT destroying its data. Turning it on creates
 * the cell (seeded like enable) if missing, or flips `available` back to true.
 * Turning it off keeps the cell + all entered data and just marks it unavailable.
 */
export function setCreationProcessAvailable(
  processes: Artist2CreationProcess[],
  target: Artist2CreationProcessTarget,
  processType: Artist2CreationProcessType,
  available: boolean,
): Artist2CreationProcess[] {
  const existing = findCreationProcess(processes, target, processType);
  if (existing) {
    return syncAiVocalsSameAsMusic(
      processes.map((p) => (p.id === existing.id ? { ...p, available } : p)),
    );
  }
  // Nothing to turn off when the cell was never created.
  if (!available) return processes;
  return [
    ...processes,
    {
      id: newCreationProcessId(),
      target,
      processType,
      available: true,
      ...(processType === 'ai_generation'
        ? { aiModels: [{ id: newAiModelId(), primary: true }] }
        : {}),
    },
  ];
}

/**
 * Clear a cell's entered information (with the same identity + availability), so
 * the section stays checked/shown but empty. AI cells keep one blank model row.
 */
export function clearCreationProcess(
  processes: Artist2CreationProcess[],
  target: Artist2CreationProcessTarget,
  processType: Artist2CreationProcessType,
): Artist2CreationProcess[] {
  return processes.map((p) => {
    if (!(p.target === target && p.processType === processType)) return p;
    return {
      id: p.id,
      target: p.target,
      processType: p.processType,
      available: p.available,
      ...(processType === 'ai_generation'
        ? { aiModels: [{ id: newAiModelId(), primary: true }] }
        : {}),
    };
  });
}

/** True when any AI Generation cell is currently available (shown). */
export function anyAiGenerationAvailable(processes: Artist2CreationProcess[]): boolean {
  return processes.some((p) => p.processType === 'ai_generation' && p.available !== false);
}

/** Clone Music / Mix AI models onto Vocals (new ids so rows stay independent if unchecked later). */
export function duplicateAiModelsFromMusic(
  models: Artist2AiModelEntry[] | undefined,
): Artist2AiModelEntry[] {
  const source = models ?? [];
  if (source.length === 0) {
    return [{ id: newAiModelId(), primary: true }];
  }
  return ensureSinglePrimaryModel(
    source.map((m) => ({
      ...m,
      id: newAiModelId(),
    })),
  );
}

/**
 * Keep Vocals AI in sync when `sameAsMusic` is set.
 * Call after any Creation Process mutation that might change Music / Mix AI.
 */
export function syncAiVocalsSameAsMusic(
  processes: Artist2CreationProcess[],
): Artist2CreationProcess[] {
  const music = findCreationProcess(processes, 'music_mix', 'ai_generation');
  const vocals = findCreationProcess(processes, 'vocals', 'ai_generation');
  if (!vocals?.sameAsMusic || !music) return processes;
  return processes.map((row) =>
    row.id === vocals.id
      ? {
          ...row,
          aiModels: duplicateAiModelsFromMusic(music.aiModels),
          aiCommentary: music.aiCommentary ?? '',
        }
      : row,
  );
}

/** Enable same-as-music on the Vocals AI cell (duplicates current Music / Mix values). */
export function setAiVocalsSameAsMusic(
  processes: Artist2CreationProcess[],
  sameAsMusic: boolean,
): Artist2CreationProcess[] {
  const vocals = findCreationProcess(processes, 'vocals', 'ai_generation');
  if (!vocals) return processes;
  if (!sameAsMusic) {
    return processes.map((row) =>
      row.id === vocals.id ? { ...row, sameAsMusic: false } : row,
    );
  }
  const music = findCreationProcess(processes, 'music_mix', 'ai_generation');
  return processes.map((row) =>
    row.id === vocals.id
      ? {
          ...row,
          sameAsMusic: true,
          aiModels: duplicateAiModelsFromMusic(music?.aiModels),
          aiCommentary: music?.aiCommentary ?? row.aiCommentary ?? '',
        }
      : row,
  );
}

export function updateCreationProcess(
  processes: Artist2CreationProcess[],
  id: string,
  patch: Partial<Artist2CreationProcess>,
): Artist2CreationProcess[] {
  const next = processes.map((row) => {
    if (row.id !== id) return row;
    const updated = { ...row, ...patch, id: row.id, target: row.target, processType: row.processType };
    if (Array.isArray(patch.aiModels)) {
      updated.aiModels = ensureSinglePrimaryModel(patch.aiModels);
    }
    return updated;
  });
  // Music edits should refresh a linked Vocals “same as music” cell.
  return syncAiVocalsSameAsMusic(next);
}

export function anyAiGenerationSelected(processes: Artist2CreationProcess[]): boolean {
  return processes.some((p) => p.processType === 'ai_generation');
}

/**
 * Canonical Creation Process + associated prompts.
 * Migrates legacy stylePrompt into a primary Prompt when AI is active / being seeded.
 */
export function normalizeCreationProcessState(payload: CreationProcessPayloadSlice | null | undefined): {
  processes: Artist2CreationProcess[];
  aiPrompts: Artist2AiPromptEntry[];
} {
  const processes = (Array.isArray(payload?.creationProcesses) ? payload!.creationProcesses! : [])
    .map(coerceProcess)
    .filter((row): row is Artist2CreationProcess => Boolean(row));

  let aiPrompts = ensureSinglePrimaryPrompt(coerceAiPrompts(payload?.aiPrompts));
  const legacyStyle = payload?.stylePrompt?.trim();
  if (legacyStyle && aiPrompts.length === 0 && anyAiGenerationSelected(processes)) {
    aiPrompts = [
      {
        id: newAiPromptId(),
        promptType: 'prompt',
        text: legacyStyle,
        primary: true,
        target: 'music_mix',
        sortOrder: 0,
      },
    ];
  }

  return { processes, aiPrompts };
}

/** Build AI cells + prompt from a Suno import (does not clear other process cells). */
export function applySunoToCreationProcess(input: {
  existingProcesses?: Artist2CreationProcess[];
  existingPrompts?: Artist2AiPromptEntry[];
  stylePrompt?: string | null;
  modelName?: string | null;
  modelBadge?: string | null;
}): {
  creationProcesses: Artist2CreationProcess[];
  aiPrompts: Artist2AiPromptEntry[];
} {
  let processes = [...(input.existingProcesses ?? [])];
  processes = setCreationProcessEnabled(processes, 'music_mix', 'ai_generation', true);
  const cell = findCreationProcess(processes, 'music_mix', 'ai_generation');
  if (cell) {
    const modelLabel = input.modelName?.trim() || input.modelBadge?.trim() || 'Suno';
    const version = input.modelBadge?.trim() || undefined;
    const models = ensureSinglePrimaryModel([
      {
        id: newAiModelId(),
        provider: 'Suno',
        modelName: modelLabel,
        version,
        primary: true,
      },
    ]);
    processes = updateCreationProcess(processes, cell.id, { aiModels: models });
  }

  let aiPrompts = [...(input.existingPrompts ?? [])];
  const style = input.stylePrompt?.trim();
  if (style) {
    const existingPrimary = aiPrompts.find((p) => p.promptType === 'prompt' && p.primary);
    if (existingPrimary) {
      aiPrompts = aiPrompts.map((p) =>
        p.id === existingPrimary.id ? { ...p, text: style, target: 'music_mix' } : p,
      );
    } else if (!aiPrompts.some((p) => p.text?.trim() === style)) {
      aiPrompts = [
        ...aiPrompts,
        {
          id: newAiPromptId(),
          promptType: 'prompt',
          text: style,
          primary: true,
          target: 'music_mix',
          sortOrder: (aiPrompts.length + 1) * 10,
        },
      ];
    }
    aiPrompts = ensureSinglePrimaryPrompt(aiPrompts);
  }

  return { creationProcesses: processes, aiPrompts };
}

/** Soft character guidance for prompts. */
export const AI_PROMPT_SOFT_MAX = 1000;
export const AI_NEGATIVE_PROMPT_SOFT_MAX = 500;

export function creationProcessFromSongPayload(payload: Artist2SongPayload): {
  processes: Artist2CreationProcess[];
  aiPrompts: Artist2AiPromptEntry[];
} {
  return normalizeCreationProcessState(payload);
}
