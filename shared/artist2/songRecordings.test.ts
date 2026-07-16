import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ensureSinglePrimary,
  legacyRecordingFromList,
  normalizeSongRecordings,
  publishedSongAudioPath,
} from './songRecordings.ts';

describe('songRecordings', () => {
  it('migrates legacy single recording into a published + primary list entry', () => {
    const list = normalizeSongRecordings({
      recording: { audioPath: '/tmp/after-light.mp3', label: 'Main' },
    });
    assert.equal(list.length, 1);
    assert.equal(list[0].audioPath, '/tmp/after-light.mp3');
    assert.equal(list[0].published, true);
    assert.equal(list[0].primary, true);
    assert.equal(publishedSongAudioPath({ recordings: list }), '/tmp/after-light.mp3');
  });

  it('prefers the primary recording when multiple exist', () => {
    const path = publishedSongAudioPath({
      recordings: [
        { id: 'a', audioPath: '/tmp/a.wav', published: true, primary: false },
        { id: 'b', audioPath: '/tmp/b.mp3', published: false, primary: true },
      ],
    });
    assert.equal(path, '/tmp/b.mp3');
  });

  it('leaves published untouched but keeps published independent per recording', () => {
    const list = normalizeSongRecordings({
      recordings: [
        { id: 'a', audioPath: '/tmp/a.mp3', published: true, primary: true },
        { id: 'b', audioPath: '/tmp/b.wav', published: true, primary: false },
      ],
    });
    // Both remain published — publish is a free per-recording flag.
    assert.equal(list.filter((r) => r.published).length, 2);
  });

  it('ensures exactly one primary flag', () => {
    const ensured = ensureSinglePrimary([
      { id: 'a', audioPath: '/tmp/a.mp3', primary: true },
      { id: 'b', audioPath: '/tmp/b.wav', primary: true },
    ]);
    assert.equal(ensured.filter((r) => r.primary).length, 1);
    assert.equal(ensured[0].primary, true);
  });

  it('mirrors the primary entry into the legacy recording field', () => {
    const legacy = legacyRecordingFromList([
      { id: 'a', audioPath: '/tmp/a.wav', label: 'WAV', published: true, primary: false },
      { id: 'b', audioPath: '/tmp/b.mp3', label: 'MP3', published: false, primary: true },
    ]);
    assert.equal(legacy.audioPath, '/tmp/b.mp3');
    assert.equal(legacy.label, 'MP3');
  });
});
