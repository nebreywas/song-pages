/** Serializable playback FX state mirrored into the VC window for stream capture. */

export type VcEffectsLabMirror = {
  enabled: boolean;
  effectId: string;
  outputTrimDb: number;
  abBypass: boolean;
  workletEnhance: boolean;
  /** Steady coupled speed+pitch (1 = normal). */
  playbackRateHold: number;
};

export type VcPlaybackEffectsMirror = {
  bassBoost: boolean;
  lofi: boolean;
  effectsLab: VcEffectsLabMirror;
};

export const DEFAULT_VC_PLAYBACK_EFFECTS_MIRROR: VcPlaybackEffectsMirror = {
  bassBoost: false,
  lofi: false,
  effectsLab: {
    enabled: false,
    effectId: 'warm',
    outputTrimDb: 0,
    abBypass: false,
    workletEnhance: false,
    playbackRateHold: 1,
  },
};

/** True when VC audio should run through the Web Audio FX chain (not native element output). */
export function isVcPlaybackEffectsAudible(effects: VcPlaybackEffectsMirror): boolean {
  if (effects.bassBoost || effects.lofi) return true;
  const lab = effects.effectsLab;
  if (lab.effectId === 'bypass') return false;
  // Match main-window isEffectsLabAudible: hold-to-remove vs hold-to-apply via abBypass.
  if (lab.enabled) return !lab.abBypass;
  return lab.abBypass;
}
