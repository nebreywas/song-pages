import type { FC } from 'react';

import type { VisualizerSongInfo } from '@shared/visualizerMessages';

import type { ButterchurnAudioSettings } from '../../audio/types';
import type { VisualizerContext } from './context/types';
import type { VisualizerSettingField, VisualizerSettingsValues } from './settings/schema/types';
import type { PresentationTarget } from './runtime/types';

/** Legacy surface filter — experiences declare supported presentation targets. */
export type VisualizerSurface = 'embedded' | 'window' | 'both';

export type VisualizerFrameProps = {
  /** Live analyser — only set in embedded mode; remote surfaces use streamed buffers. */
  analyser: AnalyserNode | null;
  /** Butterchurn-only parallel tap — not in the speaker chain. */
  butterchurnTap?: GainNode | null;
  /** Apply visualizer-only gain/EQ when Butterchurn settings change. */
  applyButterchurnAudioSettings?: ((settings: ButterchurnAudioSettings) => void) | null;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  width: number;
  height: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  song: VisualizerSongInfo | null;
  /** Incremented each animation frame so canvas effects re-run. */
  frame: number;
  /** Song Pages application context for native visualizers. */
  context: VisualizerContext;
  /** User-adjusted settings for this experience. */
  settings: VisualizerSettingsValues;
  /** Shared Web Audio context when Butterchurn or other engine needs it. */
  audioContext?: AudioContext | null;
};

export type VisualizerImplementationKind = 'native-canvas' | 'native-three' | 'butterchurn';

export type VisualizerExperienceDefinition = {
  id: string;
  name: string;
  description: string;
  /** User-facing category for future catalog grouping. */
  category?: 'spectrum' | 'waveform' | 'ambient' | 'album' | 'classic';
  implementation: VisualizerImplementationKind;
  /** Presentation targets this experience supports. */
  targets: PresentationTarget[];
  /** Legacy surface compatibility for existing hosts. */
  surfaces: VisualizerSurface;
  settings: VisualizerSettingField[];
  creditRefs: string[];
  /** Primary React renderer. */
  component: FC<VisualizerFrameProps>;
  /** Optional fullscreen-optimized variant. */
  windowComponent?: FC<VisualizerFrameProps>;
  /** Designated safe fallback when initialization fails. */
  isSafeFallback?: boolean;
  /** Butterchurn-only — key into butterchurn-presets.getPresets(). */
  butterchurnPresetKey?: string;
};

/** Backward-compatible alias used by existing plugin hosts. */
export type VisualizerPlugin = VisualizerExperienceDefinition;

export function experienceSupportsTarget(
  experience: VisualizerExperienceDefinition,
  target: PresentationTarget,
): boolean {
  return experience.targets.includes(target);
}

export function experienceSupportsSurface(
  experience: VisualizerExperienceDefinition,
  surface: VisualizerSurface,
): boolean {
  return experience.surfaces === surface || experience.surfaces === 'both';
}

export function targetToSurface(target: PresentationTarget): VisualizerSurface {
  return target === 'main-embedded' ? 'embedded' : 'window';
}
