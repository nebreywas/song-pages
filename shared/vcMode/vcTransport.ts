/** Playback commands from the VC projection surface → main listener window. */

export type VcTransportCommand =
  | { type: 'playPause' }
  | { type: 'prev' }
  | { type: 'next' }
  | { type: 'seek'; seconds: number }
  | { type: 'playSong'; songId: number }
  | { type: 'playNextSong' };
