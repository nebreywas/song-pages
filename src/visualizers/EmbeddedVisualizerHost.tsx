import { useRef } from 'react';

import { buildVisualizerContext } from './core/context/buildContext';
import { getExperience, resolveExperienceForTarget } from './registry';
import { useExperienceSettings } from './settings/useExperienceSettings';
import { useVisualizerFrameLoop, VisualizerCanvasHost } from './useVisualizerFrameLoop';
import type { SongRow } from '../types/app';

type EmbeddedVisualizerHostProps = {
  experienceId: string;
  playingSong: SongRow | null;
  analyser: AnalyserNode | null;
  butterchurnTap: GainNode | null;
  applyButterchurnAudioSettings: ((settings: import('../audio/types').ButterchurnAudioSettings) => void) | null;
  audioContext: AudioContext | null;
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  settingsDialogOpen: boolean;
};

/** Renders the active experience inside the listener content panel. */
export function EmbeddedVisualizerHost({
  experienceId,
  playingSong,
  analyser,
  butterchurnTap,
  applyButterchurnAudioSettings,
  audioContext,
  frequencyData,
  timeDomainData,
  isPlaying,
  currentTime,
  duration,
  settingsDialogOpen,
}: EmbeddedVisualizerHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const experience = resolveExperienceForTarget(experienceId, 'main-embedded');
  const settings = useExperienceSettings(experience.id, { settingsDialogOpen });
  const context = buildVisualizerContext(playingSong);

  const frame = useVisualizerFrameLoop({
    analyser,
    frequencyData,
    timeDomainData,
    enabled: Boolean(analyser),
  });

  if (!getExperience(experienceId) && !experience) {
    return (
      <div className="visualizer-host visualizer-host-empty">
        <p>Unknown visualizer.</p>
      </div>
    );
  }

  const Component = experience.component;

  return (
    <div ref={containerRef} className="visualizer-host">
      <VisualizerCanvasHost
        containerRef={containerRef}
        component={Component}
        analyser={analyser}
        butterchurnTap={butterchurnTap}
        applyButterchurnAudioSettings={applyButterchurnAudioSettings}
        audioContext={audioContext ?? analyser?.context ?? null}
        frequencyData={frequencyData}
        timeDomainData={timeDomainData}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        song={context.song}
        frame={frame}
        context={context}
        settings={settings}
      />
      <div className="visualizer-host-caption">
        <strong>{experience.name}</strong>
        <span>Panel mode</span>
      </div>
    </div>
  );
}
