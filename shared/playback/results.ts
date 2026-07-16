/** Why a playback command was not applied — structured, not silent. */

export type PlaybackRejectReason =
  | 'play-lock'
  | 'no-track'
  | 'invalid-target'
  | 'not-implemented'
  | 'waiting-for-host'
  | 'not-waiting-for-host';

export type PlaybackCommandResult =
  | { ok: true }
  | { ok: false; reason: PlaybackRejectReason };

export function playbackCommandOk(): PlaybackCommandResult {
  return { ok: true };
}

export function playbackCommandRejected(reason: PlaybackRejectReason): PlaybackCommandResult {
  return { ok: false, reason };
}
