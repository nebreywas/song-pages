/** Serializable playback FX state mirrored into the VC window for stream capture. */

export type VcEffectsLabMirror = {
  enabled: boolean;
  effectId: string;
  outputTrimDb: number;
  abBypass: boolean;
  workletEnhance: boolean;
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
  },
};

/** True when VC audio should run through the Web Audio FX chain (not native element output). */
export function isVcPlaybackEffectsAudible(effects: VcPlaybackEffectsMirror): boolean {
  if (effects.bassBoost || effects.lofi) return true;
  const lab = effects.effectsLab;
  if (!lab.enabled || lab.abBypass) return false;
  return lab.effectId !== 'bypass';
}
