import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR,
  isVcPlaybackEffectsAudible,
} from './playbackEffectsMirror.ts';

test('isVcPlaybackEffectsAudible is false for default mirror state', () => {
  assert.equal(isVcPlaybackEffectsAudible(DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR), false);
});

test('isVcPlaybackEffectsAudible detects legacy toggles', () => {
  assert.equal(
    isVcPlaybackEffectsAudible({ ...DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR, bassBoost: true }),
    true,
  );
  assert.equal(
    isVcPlaybackEffectsAudible({ ...DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR, lofi: true }),
    true,
  );
});

test('isVcPlaybackEffectsAudible detects enabled lab preset', () => {
  const withLab = {
    ...DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR,
    effectsLab: { ...DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR.effectsLab, enabled: true, effectId: 'warm' },
  };
  assert.equal(isVcPlaybackEffectsAudible(withLab), true);
  assert.equal(
    isVcPlaybackEffectsAudible({
      ...withLab,
      effectsLab: { ...withLab.effectsLab, abBypass: true },
    }),
    false,
  );
});

test('isVcPlaybackEffectsAudible hold-to-apply while Activate is off', () => {
  assert.equal(
    isVcPlaybackEffectsAudible({
      ...DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR,
      effectsLab: {
        ...DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR.effectsLab,
        enabled: false,
        effectId: 'air',
        abBypass: true,
      },
    }),
    true,
  );
});
