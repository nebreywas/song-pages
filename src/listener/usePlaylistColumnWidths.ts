import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

import {
  activeWidthsToRatios,
  DEFAULT_PLAYLIST_COLUMN_LAYOUT,
  normalizePlaylistColumnLayoutSettings,
  PLAYLIST_COLUMN_LAYOUT_KEY,
  playlistColumnOrder,
  playlistDataAreaWidth,
  playlistLayoutProfile,
  ratiosToColumnWidths,
  resolvePlaylistColumnRatios,
  fitColumnWidthsToPanel,
  scaleColumnWidthsToPanel,
  type PlaylistColumnId,
  type PlaylistColumnLayoutSettings,
  type PlaylistLayoutProfile,
} from '@shared/listener/playlistColumnLayout';
import { applyPairResizeToSizing } from '@shared/listener/playlistColumnPairResize';
import { getApp } from '../lib/bridge';

type Options = {
  hasArtist: boolean;
  hasSourceCol: boolean;
};

function dataAreaWidth(panelWidth: number, profile: PlaylistLayoutProfile): number {
  return playlistDataAreaWidth(panelWidth, playlistColumnOrder(profile).length);
}

/**
 * Playlist column pixel widths with pairwise drag resize.
 * Pixel widths are the source of truth after the user drags; ratios are for persistence only.
 */
export function usePlaylistColumnWidths(
  panelRef: RefObject<HTMLElement | null>,
  { hasArtist, hasSourceCol }: Options,
) {
  const [layoutSettings, setLayoutSettings] = useState<PlaylistColumnLayoutSettings>(
    DEFAULT_PLAYLIST_COLUMN_LAYOUT,
  );
  const [profile, setProfile] = useState<PlaylistLayoutProfile>(() =>
    playlistLayoutProfile(hasArtist, hasSourceCol, 0),
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const bootstrapProfile = playlistLayoutProfile(hasArtist, hasSourceCol, 960);
    const area = dataAreaWidth(960, bootstrapProfile);
    const widths = ratiosToColumnWidths(
      area,
      resolvePlaylistColumnRatios(null, bootstrapProfile),
      bootstrapProfile,
    );
    const next: Record<string, number> = {};
    for (const id of playlistColumnOrder(bootstrapProfile)) {
      next[id] = widths[id];
    }
    return fitColumnWidthsToPanel(next, 960, bootstrapProfile);
  });
  const [isResizing, setIsResizing] = useState(false);

  const layoutSettingsRef = useRef(layoutSettings);
  const profileRef = useRef(profile);
  const widthsRef = useRef(columnWidths);
  const isResizingRef = useRef(false);
  /** After a drag, keep pixel widths — do not rebuild from ratios on every layout tick. */
  const hasLocalWidthEditsRef = useRef(false);
  const settingsGenerationRef = useRef(0);
  layoutSettingsRef.current = layoutSettings;
  profileRef.current = profile;
  widthsRef.current = columnWidths;

  const applyRatiosToWidths = useCallback(
    (panelWidth: number, activeProfile: PlaylistLayoutProfile, settings: PlaylistColumnLayoutSettings) => {
      const area = dataAreaWidth(panelWidth, activeProfile);
      const ratios = resolvePlaylistColumnRatios(settings, activeProfile);
      const widths = ratiosToColumnWidths(area, ratios, activeProfile);
      const next: Record<string, number> = {};
      for (const id of playlistColumnOrder(activeProfile)) {
        next[id] = widths[id];
      }
      const synced = fitColumnWidthsToPanel(next, panelWidth, activeProfile);
      widthsRef.current = synced;
      setColumnWidths(synced);
    },
    [],
  );

  useEffect(() => {
    hasLocalWidthEditsRef.current = false;
  }, [hasArtist, hasSourceCol]);

  useEffect(() => {
    const app = getApp();
    if (!app) return;

    const generation = ++settingsGenerationRef.current;
    void app.getSettings(PLAYLIST_COLUMN_LAYOUT_KEY).then((value) => {
      if (generation !== settingsGenerationRef.current) return;

      const normalized = normalizePlaylistColumnLayoutSettings(value);
      layoutSettingsRef.current = normalized;
      setLayoutSettings(normalized);
      const panel = panelRef.current;
      if (!panel) return;
      const width = panel.clientWidth;
      const activeProfile = playlistLayoutProfile(hasArtist, hasSourceCol, width);
      profileRef.current = activeProfile;
      setProfile(activeProfile);
      if (!hasLocalWidthEditsRef.current) {
        applyRatiosToWidths(width, activeProfile, normalized);
      }
    });
  }, [applyRatiosToWidths, hasArtist, hasSourceCol, panelRef]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const update = () => {
      if (isResizingRef.current) return;
      const width = panel.clientWidth;
      const nextProfile = playlistLayoutProfile(hasArtist, hasSourceCol, width);
      profileRef.current = nextProfile;
      setProfile(nextProfile);

      if (hasLocalWidthEditsRef.current) {
        const scaled = scaleColumnWidthsToPanel(widthsRef.current, width, nextProfile);
        widthsRef.current = scaled;
        setColumnWidths(scaled);
        return;
      }

      applyRatiosToWidths(width, nextProfile, layoutSettingsRef.current);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [applyRatiosToWidths, hasArtist, hasSourceCol, panelRef]);

  const persistWidths = useCallback(
    (widths: Record<string, number>, activeProfile: PlaylistLayoutProfile) => {
      const order = playlistColumnOrder(activeProfile);
      const fullWidths = { ...widths };
      for (const id of order) {
        fullWidths[id] = widths[id] ?? 0;
      }
      const normalized = activeWidthsToRatios(fullWidths as Record<PlaylistColumnId, number>, activeProfile);
      const next: PlaylistColumnLayoutSettings = {
        ...layoutSettingsRef.current,
        [activeProfile]: normalized,
      };
      layoutSettingsRef.current = next;
      setLayoutSettings(next);
      void getApp()?.saveSettings(PLAYLIST_COLUMN_LAYOUT_KEY, next);
    },
    [],
  );

  const resizeBetween = useCallback(
    (leftId: PlaylistColumnId, rightId: PlaylistColumnId) =>
      (event: React.PointerEvent<HTMLDivElement>) => {
        const handle = event.currentTarget;
        handle.setPointerCapture(event.pointerId);
        isResizingRef.current = true;
        hasLocalWidthEditsRef.current = true;
        setIsResizing(true);

        const activeProfile = profileRef.current;
        const panelWidth = panelRef.current?.clientWidth ?? 0;
        const startX = event.clientX;
        const start = fitColumnWidthsToPanel(widthsRef.current, panelWidth, activeProfile);
        widthsRef.current = start;
        setColumnWidths(start);

        const onMove = (moveEvent: PointerEvent) => {
          if (moveEvent.pointerId !== event.pointerId) return;
          const delta = moveEvent.clientX - startX;
          const resized = applyPairResizeToSizing(start, leftId, delta, activeProfile);
          const next = fitColumnWidthsToPanel(resized, panelRef.current?.clientWidth ?? panelWidth, activeProfile);
          widthsRef.current = next;
          setColumnWidths(next);
        };

        const onUp = (upEvent: PointerEvent) => {
          if (upEvent.pointerId !== event.pointerId) return;
          handle.releasePointerCapture(event.pointerId);
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
          persistWidths(widthsRef.current, activeProfile);
          isResizingRef.current = false;
          setIsResizing(false);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      },
    [persistWidths, panelRef],
  );

  return {
    columnOrder: playlistColumnOrder(profile),
    columnWidths,
    isResizing,
    profile,
    resizeBetween,
  };
}
