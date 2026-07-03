import type { VisualizerSessionTarget } from '../runtime/types';

/** Song Pages 1.0 — only one active visualizer rendering session at a time. */
export type VisualizerLifecycleState = {
  activeExperienceId: string | null;
  activeSession: VisualizerSessionTarget;
  externalOwner: 'none' | 'projected-visualizer' | 'vc-mode';
};

export function createInitialLifecycleState(): VisualizerLifecycleState {
  return {
    activeExperienceId: null,
    activeSession: 'none',
    externalOwner: 'none',
  };
}

/** Whether starting `nextSession` requires stopping the current session first. */
export function requiresSessionHandoff(
  current: VisualizerSessionTarget,
  next: VisualizerSessionTarget,
): boolean {
  if (current === 'none') return false;
  return current !== next;
}
