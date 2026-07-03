/** Where a visualizer rendering session may attach. */
export type PresentationTarget = 'main-embedded' | 'external-projection' | 'vc-region';

/** Owner of the single external presentation surface in Song Pages 1.0. */
export type ExternalPresentationOwner = 'none' | 'projected-visualizer' | 'vc-mode';

/** Active visualizer rendering session — at most one in Song Pages 1.0. */
export type VisualizerSessionTarget = 'none' | PresentationTarget;

/** Saved visualizer preference per presentation context. */
export type PresentationContextId = 'main-player' | 'vc-mode';
