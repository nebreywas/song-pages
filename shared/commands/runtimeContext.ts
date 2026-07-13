import type { VcStatePayload } from '../vcModeTypes';
import type { CommandAvailability, CommandDefinition } from './types';

/** Live host context used to gray gate rows and block unavailable dispatches. */
export type CommandRuntimeContext = {
  vcModeActive: boolean;
  playerActive?: boolean;
  projectionActive?: boolean;
  hasNextSong?: boolean;
  hasUpcomingSongs?: boolean;
  hasCurrentSong?: boolean;
  hasCoverArt?: boolean;
  hasHostGraphic?: boolean;
  hasPlaybackTiming?: boolean;
  specialPlayPauseActive?: boolean;
  playLockActive?: boolean;
};

export const DEFAULT_COMMAND_RUNTIME_CONTEXT: CommandRuntimeContext = {
  vcModeActive: false,
};

/** Build command runtime flags from the same VC payload the projection window receives. */
export function deriveCommandRuntimeContextFromVcState(
  payload: VcStatePayload | null,
  options: { vcModeActive: boolean },
): CommandRuntimeContext {
  if (!payload) {
    return { vcModeActive: options.vcModeActive };
  }

  return {
    vcModeActive: options.vcModeActive,
    hasNextSong: payload.nextSong != null,
    hasUpcomingSongs: payload.upcoming.length > 0,
    hasCurrentSong: payload.currentSong != null,
    hasCoverArt: Boolean(payload.currentSong?.coverUrl),
    hasHostGraphic: Boolean(payload.hostGraphicUrl) || Boolean(payload.config.hostGraphicPopupId),
    hasPlaybackTiming: payload.playback.duration > 0,
    specialPlayPauseActive: payload.specialPlayPause?.active === true,
    playLockActive: payload.playLockEnabled === true,
  };
}

export function isCommandAvailable(
  command: CommandDefinition,
  context: CommandRuntimeContext,
): boolean {
  const availability = command.availability;
  if (!availability) return true;
  if (availability.vcMode && context.vcModeActive === false) return false;
  if (availability.player && context.playerActive === false) return false;
  if (availability.projection && context.projectionActive === false) return false;
  return passesContextualAvailability(availability, context);
}

function passesContextualAvailability(
  availability: CommandAvailability,
  context: CommandRuntimeContext,
): boolean {
  if (availability.requiresNextSong && context.hasNextSong === false) return false;
  if (availability.requiresUpcomingSongs && context.hasUpcomingSongs === false) return false;
  if (availability.requiresCurrentSong && context.hasCurrentSong === false) return false;
  if (availability.requiresCoverArt && context.hasCoverArt === false) return false;
  if (availability.requiresHostGraphic && context.hasHostGraphic === false) return false;
  if (availability.requiresPlaybackTiming && context.hasPlaybackTiming === false) return false;
  if (availability.requiresSpecialPlayPause && context.specialPlayPauseActive === false) return false;
  if (availability.blockedWhilePlayLock && context.playLockActive === true) return false;
  return true;
}
