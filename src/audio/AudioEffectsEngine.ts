/**
 * Routes Effects Lab / legacy toggles to the correct audible element:
 * main mirror (VC closed) vs VC window `<audio>` (VC open, screen capture).
 *
 * @see documentation/audio-pipeline.md
 */
import { isVcPlaybackEffectsAudible } from '@shared/vcMode/playbackEffectsMirror';
import type { VcPlaybackEffectsMirror } from '@shared/vcModeTypes';

import {
  configureMirrorPlaybackEffectsGraph,
  isMirrorPlaybackAudible,
  resetMirrorToTapGraph,
  type MirrorPlaybackEffectsInput,
} from './graph/configureMirrorPlaybackEffects';
import { getAudioGraphIfExists } from './graph/registry';

export type MainMirrorRoutingInput = MirrorPlaybackEffectsInput & {
  mainAudio: HTMLAudioElement;
  mirrorAudio: HTMLAudioElement;
  volume: number;
  isPlaying: boolean;
  vcMirrorPlaybackActive: boolean;
  /**
   * Momentary performance FX (filter sweep, reverb throw, …) currently need the dry
   * mirror path while no whole-song preset is active.
   */
  performanceFxActive?: boolean;
};

/** Route Effects Lab / legacy toggles on the hidden mirror while main stays capturable. */
export function applyMainMirrorRouting(input: MainMirrorRoutingInput): void {
  const {
    mainAudio,
    mirrorAudio,
    volume,
    isPlaying,
    vcMirrorPlaybackActive,
    performanceFxActive = false,
    ...effects
  } = input;
  const mirrorAudible = isMirrorPlaybackAudible(effects);

  // VC window plays the track for capture with FX — main mirror stays analyser-only.
  if (mirrorAudible && vcMirrorPlaybackActive) {
    mainAudio.volume = 0;
    resetMirrorToTapGraph(mirrorAudio, 0);
    return;
  }

  if (mirrorAudible) {
    mainAudio.volume = 0;
    configureMirrorPlaybackEffectsGraph(mirrorAudio, effects, { speakerGain: 1, isPlaying });
    return;
  }

  // Performance FX without a whole-song preset: keep dry mirror audible on main speakers.
  // Never raise main-mirror speakers while VC owns capture — that creates a double stream.
  if (performanceFxActive && !vcMirrorPlaybackActive) {
    mainAudio.volume = 0;
    configureMirrorPlaybackEffectsGraph(
      mirrorAudio,
      { bassBoost: false, lofi: false },
      { speakerGain: 1, isPlaying },
    );
    return;
  }

  if (vcMirrorPlaybackActive) {
    mainAudio.volume = 0;
  } else {
    // Always clear HTML mute when returning audible control to the native player.
    mainAudio.muted = false;
    mainAudio.volume = volume;
  }
  if (!getAudioGraphIfExists(mirrorAudio)) return;
  resetMirrorToTapGraph(mirrorAudio, 0);
}

export type VcAudibleRoutingInput = {
  audio: HTMLAudioElement;
  volume: number;
  isPlaying: boolean;
  effects: VcPlaybackEffectsMirror | null | undefined;
};

/** Apply bass / lo-fi / Effects Lab on the VC window `<audio>` for screen capture. */
export function applyVcAudibleRouting({
  audio,
  volume,
  isPlaying,
  effects,
}: VcAudibleRoutingInput): void {
  const bassBoost = effects?.bassBoost ?? false;
  const lofi = effects?.lofi ?? false;
  const effectsLab = effects?.effectsLab;
  const mirrorAudible = effects ? isVcPlaybackEffectsAudible(effects) : false;

  if (mirrorAudible) {
    // Web Audio pulls from the element — keep full-scale decode; loudness via speakerGain.
    audio.volume = 1;
    configureMirrorPlaybackEffectsGraph(
      audio,
      { bassBoost, lofi, effectsLab },
      { speakerGain: volume, isPlaying },
    );
    return;
  }

  audio.volume = volume;
  audio.muted = false;
  resetMirrorToTapGraph(audio, volume);
}
