/**
 * Projector: Song Page — native Suno layout (cover, Studio metadata, lyrics).
 * Lyrics display follows the player window settings streamed over IPC.
 */

import { useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_LISTENER_LYRICS_DISPLAY_SETTINGS,
  LISTENER_LYRICS_DISPLAY_SETTINGS_KEY,
  type ListenerLyricsDisplaySettings,
  type ListenerLyricsViewMode,
} from '@shared/listener/lyricsDisplaySettings';
import {
  DEFAULT_LISTENER_PLAYER_SETTINGS,
  LISTENER_PLAYER_SETTINGS_KEY,
  normalizeListenerPlayerSettings,
  type SongPageFontIncreaseLevel,
} from '@shared/listener/playerSettings';
import { SUNO_DEMO_PLAYBACK_SCOPE } from '@shared/demo/sunoDemoFeature';

import { getApp } from '../lib/bridge';
import { SunoDemoSongPage } from '../listener/SunoDemoSongPage';
import type { SongRow } from '../types/app';

export type ProjectorSunoPagePayload = {
  kind: 'suno';
  songId: number;
  title: string;
  artist: string | null;
  coverUrl: string | null;
  year: string | null;
  caption: string | null;
  pageUrl: string | null;
  songManifestUrl: string | null;
  externalId: string | null;
  playbackScope: string | null;
  providerMetadataJson: string | null;
};

type ProjectorSunoSongPageProps = {
  page: ProjectorSunoPagePayload;
  /** Live prefs from the player — keep Projector Pretty Lyrics / markdown in sync. */
  lyricsDisplay?: ListenerLyricsDisplaySettings | null;
  fontIncreaseLevel?: SongPageFontIncreaseLevel;
};

/** Rebuild enough of SongRow for SunoDemoSongPage + manifest resolution. */
function songRowFromPayload(page: ProjectorSunoPagePayload): SongRow {
  return {
    id: page.songId,
    artist_id: 0,
    external_id: page.externalId ?? '',
    slug: '',
    title: page.title,
    album: null,
    year: page.year,
    caption: page.caption,
    cover_url: page.coverUrl,
    page_url: page.pageUrl ?? '',
    playback_url: '',
    song_manifest_url: page.songManifestUrl,
    playback_scope: page.playbackScope ?? SUNO_DEMO_PLAYBACK_SCOPE,
    playback_quality: null,
    duration_seconds: null,
    sort_order: 0,
    artist_name: page.artist ?? undefined,
    provider_metadata_json: page.providerMetadataJson,
  };
}

export function ProjectorSunoSongPage({
  page,
  lyricsDisplay,
  fontIncreaseLevel = 0,
}: ProjectorSunoSongPageProps) {
  const song = useMemo(() => songRowFromPayload(page), [page]);
  const [lyricsSettings, setLyricsSettings] = useState<ListenerLyricsDisplaySettings>(
    () => lyricsDisplay ?? DEFAULT_LISTENER_LYRICS_DISPLAY_SETTINGS,
  );
  const [showPromptInformation, setShowPromptInformation] = useState(
    DEFAULT_LISTENER_PLAYER_SETTINGS.showSunoPromptInformation,
  );

  useEffect(() => {
    if (!lyricsDisplay) return;
    setLyricsSettings(lyricsDisplay);
  }, [lyricsDisplay]);

  useEffect(() => {
    const app = getApp();
    if (!app?.getSettings) return;
    void app.getSettings(LISTENER_PLAYER_SETTINGS_KEY).then((raw) => {
      setShowPromptInformation(normalizeListenerPlayerSettings(raw).showSunoPromptInformation);
    });
  }, []);

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
      <SunoDemoSongPage
        song={song}
        lyricsSettings={lyricsSettings}
        onRemoveBracketsChange={onRemoveBracketsChange}
        onViewModeChange={onViewModeChange}
        showPromptInformation={showPromptInformation}
        fontIncreaseLevel={fontIncreaseLevel}
      />
    </div>
  );
}
