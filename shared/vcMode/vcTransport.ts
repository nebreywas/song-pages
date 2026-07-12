/** Playback commands from the VC projection surface → main listener window. */

export type VcTransportCommand =
  | { type: 'playPause' }
  | { type: 'prev' }
  | { type: 'next' }
  | { type: 'seek'; seconds: number }
  | { type: 'playSong'; songId: number }
  | { type: 'playNextSong' }
  /** VC visualizer-slot YouTube player finished — main runs queue advance / repeat. */
  | { type: 'youtubeEnded' }
  /** VC-owned YouTube timing — main player bar follows the embed. */
  | { type: 'youtubeTiming'; currentTime: number; duration: number }
  /** First duration read from the VC embed — persisted like the main listener player. */
  | { type: 'youtubeDuration'; seconds: number }
  /** VC visualizer-slot SoundCloud widget finished. */
  | { type: 'soundcloudEnded' }
  /** VC-owned SoundCloud timing — main player bar follows the widget. */
  | { type: 'soundcloudTiming'; currentTime: number; duration: number }
  /** First duration read from the VC SoundCloud widget. */
  | { type: 'soundcloudDuration'; seconds: number };
