import type { PlaylistSongSourceId } from '@shared/listener/playlistSongSource';

import flowMusicLogo from '../../images/flow-music-round-logo.png';
import songPagesLogo from '../../images/song-pages-round-logo.png';
import soundcloudLogo from '../../images/soundcloud-round-logo.png';
import sunoLogo from '../../images/suno-round-logo.png';
import youtubeLogo from '../../images/youtube-round-logo.png';

/** Round service logos shared by playlist home pills and table source cells. */
export const PLAYLIST_SOURCE_LOGOS: Record<PlaylistSongSourceId, string> = {
  'song-pages': songPagesLogo,
  suno: sunoLogo,
  youtube: youtubeLogo,
  flow: flowMusicLogo,
  soundcloud: soundcloudLogo,
};
