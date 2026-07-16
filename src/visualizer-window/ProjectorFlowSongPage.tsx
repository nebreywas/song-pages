/**
 * Projector: Song Page — native Flow Music layout (cover, sound prompt, lyrics).
 * Lyrics display follows the player window settings streamed over IPC.
 */

import { useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_LISTENER_LYRICS_DISPLAY_SETTINGS,
  LISTENER_LYRICS_DISPLAY_SETTINGS_KEY,
  type ListenerLyricsDisplaySettings,
  type ListenerLyricsViewMode,
} from '@shared/listener/lyricsDisplaySettings';
import { FLOW_PLAYBACK_SCOPE } from '@shared/flow/flowFeature';
import type { SongPageFontIncreaseLevel } from '@shared/listener/playerSettings';

import { getApp } from '../lib/bridge';
import { FlowSongPage } from '../listener/FlowSongPage';
import type { SongRow } from '../types/app';

export type ProjectorFlowPagePayload = {
  kind: 'flow';
  songId: number;
  title: string;
  artist: string | null;
  coverUrl: string | null;
  caption: string | null;
  songManifestUrl: string | null;
};

type ProjectorFlowSongPageProps = {
  page: ProjectorFlowPagePayload;
  /** Live prefs from the player — keep Projector Pretty Lyrics / markdown in sync. */
  lyricsDisplay?: ListenerLyricsDisplaySettings | null;
  fontIncreaseLevel?: SongPageFontIncreaseLevel;
};

/** Build a SongRow-shaped object so we can reuse FlowSongPage unchanged. */
function songRowFromPayload(page: ProjectorFlowPagePayload): SongRow {
  return {
    id: page.songId,
    artist_id: 0,
    external_id: '',
    slug: '',
    title: page.title,
    album: null,
    year: null,
    caption: page.caption,
    cover_url: page.coverUrl,
    page_url: '',
    playback_url: '',
    song_manifest_url: page.songManifestUrl,
    playback_scope: FLOW_PLAYBACK_SCOPE,
    playback_quality: null,
    duration_seconds: null,
    sort_order: 0,
    artist_name: page.artist ?? undefined,
  };
}

export function ProjectorFlowSongPage({
  page,
  lyricsDisplay,
  fontIncreaseLevel = 0,
}: ProjectorFlowSongPageProps) {
  const song = useMemo(() => songRowFromPayload(page), [page]);
  const [lyricsSettings, setLyricsSettings] = useState<ListenerLyricsDisplaySettings>(
    () => lyricsDisplay ?? DEFAULT_LISTENER_LYRICS_DISPLAY_SETTINGS,
  );

  // Prefer the player stream; fall back if a config tick arrives without lyrics prefs.
  useEffect(() => {
    if (!lyricsDisplay) return;
    setLyricsSettings(lyricsDisplay);
  }, [lyricsDisplay]);

  const onRemoveBracketsChange = (value: boolean) => {
    setLyricsSettings((prev) => {
      const next = { ...prev, removeBrackets: value };
      void getApp()?.saveSettings(LISTENER_LYRICS_DISPLAY_SETTINGS_KEY, next);
      return next;
    });
  };

  const onViewModeChange = (value: ListenerLyricsViewMode) => {
    setLyricsSettings((prev) => {
      const next = { ...prev, viewMode: value };
      void getApp()?.saveSettings(LISTENER_LYRICS_DISPLAY_SETTINGS_KEY, next);
      return next;
    });
  };

  return (
    <div className="visualizer-window-shell visualizer-window-page visualizer-window-native-page">
      <FlowSongPage
        song={song}
        lyricsSettings={lyricsSettings}
        onRemoveBracketsChange={onRemoveBracketsChange}
        onViewModeChange={onViewModeChange}
        fontIncreaseLevel={fontIncreaseLevel}
      />
    </div>
  );
}
