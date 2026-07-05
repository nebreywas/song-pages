import { useEffect, useRef } from 'react';

import { ButterchurnMirrorView } from './butterchurn/adapter/ButterchurnMirrorView';
import { buildVisualizerContext } from './core/context/buildContext';
import { getExperience, resolveExperienceForTarget, visualizerSupportsSurface } from './registry';
import type { VisualizerContext } from './core/context/types';
import type { VisualizerFrameProps, VisualizerSurface } from './types';
import { useExperienceSettings } from './settings/useExperienceSettings';
import { useVisualizerFrameLoop, VisualizerCanvasHost } from './useVisualizerFrameLoop';

type VisualizerPluginHostProps = Omit<VisualizerFrameProps, 'width' | 'height' | 'context' | 'settings'> & {
  surface: VisualizerSurface;
  experienceId: string;
  context?: VisualizerContext;
  canvasFrame?: string | null;
  audioContext?: AudioContext | null;
};

/** Shared host for embedded, projection, or VC surfaces. */
export function VisualizerPluginHost({
  surface,
  experienceId,
  analyser,
  audioContext,
  frequencyData,
  timeDomainData,
  isPlaying,
  currentTime,
  duration,
  song,
  frame: externalFrame,
  context,
  canvasFrame,
}: VisualizerPluginHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const target = surface === 'embedded' ? 'main-embedded' : 'external-projection';
  const experience = resolveExperienceForTarget(experienceId, target);
  const settings = useExperienceSettings(experience.id);
  const resolvedContext = context ?? buildVisualizerContext(null);
  if (resolvedContext.song == null && song) {
    resolvedContext.song = song;
  }

  const internalFrame = useVisualizerFrameLoop({
    analyser,
    frequencyData,
    timeDomainData,
    enabled: Boolean(analyser),
  });
  const frame = analyser ? internalFrame : externalFrame;

  useEffect(() => {
    if (!experience) return;
    if (!visualizerSupportsSurface(experience, surface)) {
      // Remote surfaces may receive a brief incompatible id during handoff.
    }
  }, [experience, surface]);

  if (!getExperience(experienceId) && !experience) {
    return (
      <div className="visualizer-host visualizer-host-empty">
        <p>Unknown visualizer: {experienceId}</p>
      </div>
    );
  }

  if (!visualizerSupportsSurface(experience, surface)) {
    return (
      <div className="visualizer-host visualizer-host-empty">
        <p>{experience.name} is not available in this surface.</p>
      </div>
    );
  }

  if (experience.implementation === 'butterchurn' && !analyser) {
    return <ButterchurnMirrorView canvasFrame={canvasFrame ?? null} />;
  }

  const Component =
    surface === 'window'
      ? (experience.windowComponent ?? experience.component)
      : experience.component;

  return (
    <div ref={containerRef} className="visualizer-host visualizer-host-window">
      <VisualizerCanvasHost
        containerRef={containerRef}
        component={Component}
        analyser={analyser}
        audioContext={audioContext ?? analyser?.context ?? null}
        frequencyData={frequencyData}
        timeDomainData={timeDomainData}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        song={song}
        frame={frame}
        context={resolvedContext}
        settings={settings}
      />
    </div>
  );
}
