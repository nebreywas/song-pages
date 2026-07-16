import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applySunoToCreationProcess,
  anyAiGenerationAvailable,
  anyAiGenerationSelected,
  clearCreationProcess,
  ensureSinglePrimaryPrompt,
  findCreationProcess,
  hasCreationProcess,
  isCreationProcessAvailable,
  normalizeCreationProcessState,
  setAiVocalsSameAsMusic,
  setCreationProcessAvailable,
  setCreationProcessEnabled,
  updateCreationProcess,
} from './songCreationProcess.ts';

describe('creation process matrix', () => {
  it('toggles cells independently', () => {
    let processes = setCreationProcessEnabled([], 'music_mix', 'performed', true);
    processes = setCreationProcessEnabled(processes, 'vocals', 'ai_generation', true);
    assert.equal(hasCreationProcess(processes, 'music_mix', 'performed'), true);
    assert.equal(hasCreationProcess(processes, 'vocals', 'ai_generation'), true);
    assert.equal(hasCreationProcess(processes, 'music_mix', 'ai_generation'), false);
    processes = setCreationProcessEnabled(processes, 'music_mix', 'performed', false);
    assert.equal(hasCreationProcess(processes, 'music_mix', 'performed'), false);
  });
});

describe('creation process availability (non-destructive)', () => {
  it('unchecking keeps the cell + data, just marks it unavailable', () => {
    let processes = setCreationProcessAvailable([], 'music_mix', 'performed', true);
    processes = updateCreationProcess(processes, processes[0].id, {
      performedNotes: 'Recorded live at home',
    });
    assert.equal(isCreationProcessAvailable(processes, 'music_mix', 'performed'), true);

    // Turn it off — the cell and its notes must survive.
    processes = setCreationProcessAvailable(processes, 'music_mix', 'performed', false);
    assert.equal(isCreationProcessAvailable(processes, 'music_mix', 'performed'), false);
    assert.equal(hasCreationProcess(processes, 'music_mix', 'performed'), true);
    assert.equal(
      findCreationProcess(processes, 'music_mix', 'performed')?.performedNotes,
      'Recorded live at home',
    );

    // Turn it back on — same data, available again (no new cell).
    processes = setCreationProcessAvailable(processes, 'music_mix', 'performed', true);
    assert.equal(processes.length, 1);
    assert.equal(isCreationProcessAvailable(processes, 'music_mix', 'performed'), true);
    assert.equal(
      findCreationProcess(processes, 'music_mix', 'performed')?.performedNotes,
      'Recorded live at home',
    );
  });

  it('clear wipes the data but keeps the cell + availability', () => {
    let processes = setCreationProcessAvailable([], 'vocals', 'other', true);
    processes = updateCreationProcess(processes, processes[0].id, {
      otherProcessName: 'Tape loop',
      otherCommentary: 'Bounced to cassette',
    });
    processes = clearCreationProcess(processes, 'vocals', 'other');
    const cell = findCreationProcess(processes, 'vocals', 'other');
    assert.equal(cell?.otherProcessName, undefined);
    assert.equal(cell?.otherCommentary, undefined);
    // Still shown/available after clearing.
    assert.equal(isCreationProcessAvailable(processes, 'vocals', 'other'), true);
  });

  it('reports AI availability from the flag', () => {
    let processes = setCreationProcessAvailable([], 'music_mix', 'ai_generation', true);
    assert.equal(anyAiGenerationAvailable(processes), true);
    processes = setCreationProcessAvailable(processes, 'music_mix', 'ai_generation', false);
    assert.equal(anyAiGenerationAvailable(processes), false);
    // Cell still exists even though it's unavailable.
    assert.equal(anyAiGenerationSelected(processes), true);
  });
});

describe('normalizeCreationProcessState', () => {
  it('migrates legacy stylePrompt into a primary prompt when AI is selected', () => {
    const { processes, aiPrompts } = normalizeCreationProcessState({
      creationProcesses: [
        {
          id: '1',
          target: 'music_mix',
          processType: 'ai_generation',
        },
      ],
      stylePrompt: 'lofi boom bap',
    });
    assert.equal(anyAiGenerationSelected(processes), true);
    assert.equal(aiPrompts[0]?.text, 'lofi boom bap');
    assert.equal(aiPrompts[0]?.primary, true);
  });
});

describe('applySunoToCreationProcess', () => {
  it('enables AI music/mix and seeds model + prompt', () => {
    const result = applySunoToCreationProcess({
      stylePrompt: 'folk, cinematic',
      modelName: 'chirp-v4',
      modelBadge: 'v5',
    });
    assert.equal(hasCreationProcess(result.creationProcesses, 'music_mix', 'ai_generation'), true);
    const cell = result.creationProcesses.find(
      (p) => p.target === 'music_mix' && p.processType === 'ai_generation',
    );
    assert.equal(cell?.aiModels?.[0]?.provider, 'Suno');
    assert.equal(cell?.aiModels?.[0]?.modelName, 'chirp-v4');
    assert.equal(result.aiPrompts[0]?.text, 'folk, cinematic');
  });
});

describe('ensureSinglePrimaryPrompt', () => {
  it('allows any prompt type to be primary (single primary enforced)', () => {
    const next = ensureSinglePrimaryPrompt([
      {
        id: 'a',
        promptType: 'negative',
        text: 'no drums',
        primary: true,
        target: 'general',
        sortOrder: 0,
      },
      {
        id: 'b',
        promptType: 'prompt',
        text: 'warm folk',
        primary: true,
        target: 'music_mix',
        sortOrder: 10,
      },
    ]);
    // First-declared primary wins; negatives may be primary now.
    assert.equal(next.find((p) => p.id === 'a')?.primary, true);
    assert.equal(next.find((p) => p.id === 'b')?.primary, false);
  });

  it('defaults the first prompt to primary when none set', () => {
    const next = ensureSinglePrimaryPrompt([
      { id: 'a', promptType: 'prompt', text: 'x', primary: false, target: 'general', sortOrder: 0 },
      { id: 'b', promptType: 'prompt', text: 'y', primary: false, target: 'general', sortOrder: 10 },
    ]);
    assert.equal(next.find((p) => p.id === 'a')?.primary, true);
    assert.equal(next.find((p) => p.id === 'b')?.primary, false);
  });
});

describe('same as music (AI vocals)', () => {
  it('duplicates music models onto vocals and stays synced', () => {
    let processes = setCreationProcessEnabled([], 'music_mix', 'ai_generation', true);
    processes = setCreationProcessEnabled(processes, 'vocals', 'ai_generation', true);
    const music = findCreationProcess(processes, 'music_mix', 'ai_generation')!;
    processes = updateCreationProcess(processes, music.id, {
      aiModels: [
        {
          id: 'm1',
          provider: 'Suno',
          modelName: 'chirp',
          version: 'v5',
          primary: true,
        },
      ],
      aiCommentary: 'Picked the warm take',
    });

    processes = setAiVocalsSameAsMusic(processes, true);
    const vocals = findCreationProcess(processes, 'vocals', 'ai_generation')!;
    assert.equal(vocals.sameAsMusic, true);
    assert.equal(vocals.aiModels?.[0]?.provider, 'Suno');
    assert.equal(vocals.aiModels?.[0]?.modelName, 'chirp');
    assert.equal(vocals.aiCommentary, 'Picked the warm take');
    // New ids — not the same row identity as music.
    assert.notEqual(vocals.aiModels?.[0]?.id, 'm1');

    processes = updateCreationProcess(processes, music.id, {
      aiModels: [
        {
          id: 'm1',
          provider: 'Suno',
          modelName: 'chirp-v4',
          version: 'v5',
          primary: true,
        },
      ],
    });
    const synced = findCreationProcess(processes, 'vocals', 'ai_generation')!;
    assert.equal(synced.aiModels?.[0]?.modelName, 'chirp-v4');
  });
});
