import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { VcModeConfig } from '@shared/vcModeTypes';
import {
  changeRuleIntervalMs,
  pickNextVisualizerId,
  shouldRotateVisualizerOnClick,
  shouldRotateVisualizerOnSongChange,
  type VcVisualizerChangeRule,
  type VcVisualizerSequence,
} from '@shared/vcMode/visualizerSettings';

import { listVcVisualizerPool } from '../visualizers/vcVisualizerPool';
import { normalizeExperienceId } from '../visualizers/native/registry';
import { getApp } from '../lib/bridge';

type UseVcVisualizerRotationOptions = {
  vcOpen: boolean;
  config: VcModeConfig;
  /** Prefer audioMirror.songId — updates as soon as transport changes the active track. */
  playingSongId: number | null;
  /** When true, notify the main window so Butterchurn mirroring stays in sync. */
  reportToMain?: boolean;
};

function rotationSessionKey(
  vcOpen: boolean,
  configuredId: string,
  changeRule: VcVisualizerChangeRule,
  sequence: VcVisualizerSequence,
): string {
  return `${vcOpen ? 'live' : 'idle'}|${configuredId}|${changeRule}|${sequence}`;
}

/** Live visualizer id — may differ from config.visualizerId when rotation rules are active. */
export function useVcVisualizerRotation({
  vcOpen,
  config,
  playingSongId,
  reportToMain = false,
}: UseVcVisualizerRotationOptions) {
  const configuredId = normalizeExperienceId(config.visualizerId);
  const changeRule = config.visualizerChangeRule;
  const alsoClickToChange = config.visualizerAlsoClickToChange === true;
  const sequence = config.visualizerSequence;
  const sessionKey = rotationSessionKey(vcOpen, configuredId, changeRule, sequence);

  const [rotatingId, setRotatingId] = useState(configuredId);
  const sessionKeyRef = useRef(sessionKey);
  const prevSongIdRef = useRef<number | null>(null);

  const pool = useMemo(() => listVcVisualizerPool(sequence), [sequence]);

  const pickRandom = useCallback(() => {
    setRotatingId((current) => {
      const candidates = pool.length > 0 ? pool : [configuredId];
      return normalizeExperienceId(pickNextVisualizerId(candidates, current));
    });
  }, [configuredId, pool]);

  const rotate = useCallback(() => {
    if (changeRule === 'never') return;
    pickRandom();
  }, [changeRule, pickRandom]);

  const rotateVisualizerRandom = useCallback(() => {
    pickRandom();
  }, [pickRandom]);

  useEffect(() => {
    if (sessionKeyRef.current === sessionKey) return;
    sessionKeyRef.current = sessionKey;
    setRotatingId(configuredId);
    prevSongIdRef.current = playingSongId;
  }, [sessionKey, configuredId, playingSongId]);

  useEffect(() => {
    if (!vcOpen || !shouldRotateVisualizerOnSongChange(changeRule)) return;

    if (
      prevSongIdRef.current != null &&
      playingSongId != null &&
      playingSongId !== prevSongIdRef.current
    ) {
      rotate();
    }
    prevSongIdRef.current = playingSongId;
  }, [changeRule, playingSongId, rotate, vcOpen]);

  useEffect(() => {
    if (!vcOpen) return;
    const intervalMs = changeRuleIntervalMs(changeRule);
    if (intervalMs == null) return;

    const timerId = window.setInterval(rotate, intervalMs);
    return () => window.clearInterval(timerId);
  }, [changeRule, rotate, vcOpen]);

  const effectiveVisualizerId =
    changeRule === 'never' && !alsoClickToChange ? configuredId : rotatingId;

  useEffect(() => {
    if (!vcOpen || !reportToMain) return;
    getApp()?.vc?.reportActiveVisualizer?.(effectiveVisualizerId);
  }, [effectiveVisualizerId, reportToMain, vcOpen]);

  return {
    effectiveVisualizerId,
    rotateVisualizer: rotate,
    rotateVisualizerRandom,
    visualizerClickEnabled: vcOpen && shouldRotateVisualizerOnClick(changeRule, alsoClickToChange),
  };
}
