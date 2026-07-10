/**
 * Live VC cell content resolution — song data, host catalog items, fallback chain, assignment overrides.
 */

import { formatPlaybackTime } from '../formatPlaybackTime';
import {
  findHostContentItem,
  hostContentTypeForSlot,
  resolveMultiFieldFallback,
  SYSTEM_FALLBACK_ASSETS,
  SYSTEM_FALLBACK_TEXT,
  type HostContentCatalog,
  type HostContentItem,
  type HostFallbackItem,
  type HostFallbackSlotId,
  type HostFontSizeId,
  type HostFontStyleId,
  type HostGraphicsGroupItem,
} from '../hostContent';
import {
  resolveEffectiveAreaTextPresentation,
  resolveEffectiveGraphicPresentation,
  resolveEffectiveGroupPresentation,
  resolveEffectiveTitleTextPresentation,
  resolveEffectiveVideoPresentation,
  resolvePlayerControlsPresentation,
  resolveSeekBarPresentation,
  resolveSongAreaTextPresentation,
  resolveLyricsEdgeFade,
  resolveLyricsRemoveBracketed,
  resolveLyricTracking,
  resolveAlareFadeEnabled,
  resolveAlareTargetVisibleLines,
  type VcLyricTracking,
  resolveSongGraphicPresentation,
  resolveSongTitleTextPresentation,
  resolveSongVideoPresentation,
  resolveUpcomingCoversPresentation,
  type EffectiveGraphicPresentation,
  type EffectiveGroupPresentation,
  type EffectivePlayerControlsPresentation,
  type EffectiveSeekBarPresentation,
  type EffectiveUpcomingCoversPresentation,
  type EffectiveVideoPresentation,
  type VcAssignmentOverrides,
  type VcTextAlign,
  type VcTitleOverflow,
} from './assignmentSettings';
import {
  isHostContentKind,
  SONG_CONTENT_SETTINGS_RULE,
  type VcCellContent,
  type VcHostSlotBinding,
  type VcPlaybackState,
  type VcSongPayload,
  type VcUpcomingSong,
} from '../vcModeTypes';
import type { VcGridDefaultTypography, VcGridDesignSettings } from './gridDesign';
import { DEFAULT_VC_GRID_DESIGN } from './gridDesign';
import { normalizeAlareLyricsText, stripBracketedLyricsText } from '../lyricsText';

export type VcResolutionContext = {
  song: VcSongPayload | null;
  artistName: string | null;
  artistBio: string | null;
  artistPhotoUrl: string | null;
  playback: VcPlaybackState;
  upcoming: VcUpcomingSong[];
  catalog: HostContentCatalog;
  useFallbacks: boolean;
  gridDesign?: VcGridDesignSettings;
  random?: () => number;
};

export type ResolvedGraphic = {
  kind: 'graphic';
  remoteUrl?: string | null;
  mediaPath?: string | null;
  systemAsset?: keyof typeof SYSTEM_FALLBACK_ASSETS;
  presentation?: EffectiveGraphicPresentation;
};

export type ResolvedVideo = {
  kind: 'video';
  remoteUrl?: string | null;
  mediaPath?: string | null;
  systemAsset?: 'video-cover';
  presentation?: EffectiveVideoPresentation;
};

export type ResolvedText = {
  kind: 'text';
  text: string;
  fontStyle: HostFontStyleId;
  fontSize: HostFontSizeId;
  color: string;
  allCaps?: boolean;
  markdownSource?: boolean;
  textAlign?: VcTextAlign;
  /** Host title + song title — always single line in VC Mode. */
  titleLine?: boolean;
  lineOverflow?: VcTitleOverflow;
};

export type ResolvedLyrics = {
  kind: 'lyrics';
  text: string;
  fontStyle?: HostFontStyleId;
  fontSize?: HostFontSizeId;
  color?: string;
  markdownSource?: boolean;
  textAlign?: VcTextAlign;
  lyricsEdgeFade?: boolean;
  lyricTracking?: VcLyricTracking;
  alareFadeEnabled?: boolean;
  alareTargetVisibleLines?: number;
  /** For ALARE timeline — manifest/catalog duration when available. */
  manifestDurationSeconds?: number | null;
  songId?: string | null;
};

export type ResolvedMarqueeLyrics = {
  kind: 'marquee-lyrics';
  /** Normalized multiline lyrics — flattened to one marquee line at render time. */
  text: string;
  fontStyle?: HostFontStyleId;
  fontSize?: HostFontSizeId;
  color?: string;
  textAlign?: VcTextAlign;
  lyricTracking?: VcLyricTracking;
  manifestDurationSeconds?: number | null;
  songId?: string | null;
};

export type ResolvedAbout = {
  kind: 'about';
  coverUrl: string | null;
  caption: string | null;
  about: string;
  markdownSource?: boolean;
  fontStyle?: HostFontStyleId;
  fontSize?: HostFontSizeId;
  color?: string;
  allCaps?: boolean;
  textAlign?: VcTextAlign;
};

export type ResolvedGraphicsGroup = {
  kind: 'graphics-group';
  presentation: EffectiveGroupPresentation;
};

export type ResolvedArtistBioName = {
  kind: 'artist-bio-name';
  artistName: string;
  bio: string;
  fontStyle: HostFontStyleId;
  fontSize: HostFontSizeId;
  color: string;
  markdownSource?: boolean;
  textAlign?: VcTextAlign;
};

export type ResolvedSeekBar = {
  kind: 'seek-bar';
  presentation: EffectiveSeekBarPresentation;
};

export type ResolvedPlayerControls = {
  kind: 'player-controls';
  presentation: EffectivePlayerControlsPresentation;
};

export type ResolvedUpcomingCovers = {
  kind: 'upcoming-covers';
  presentation: EffectiveUpcomingCoversPresentation;
  songs: VcUpcomingSong[];
};

export type ResolvedVcContent =
  | { kind: 'empty' }
  | { kind: 'visualizer' }
  | ResolvedGraphic
  | ResolvedVideo
  | ResolvedText
  | ResolvedLyrics
  | ResolvedMarqueeLyrics
  | ResolvedAbout
  | ResolvedArtistBioName
  | ResolvedSeekBar
  | ResolvedPlayerControls
  | ResolvedUpcomingCovers
  | ResolvedGraphicsGroup;

const SONG_TO_FALLBACK: Partial<Record<VcCellContent, HostFallbackSlotId>> = {
  cover: 'cover',
  'video-cover': 'video-cover',
  lyrics: 'lyrics',
  'marquee-lyrics': 'lyrics',
  about: 'about-song',
  'artist-name': 'artist-name',
  'artist-image': 'artist-image',
  'song-title': 'song-title',
  'main-genre': 'main-genre',
  'additional-genres': 'additional-genres',
};

const TEXT_FALLBACK_SLOTS = new Set<HostFallbackSlotId>([
  'artist-name',
  'song-title',
  'main-genre',
  'additional-genres',
]);

function fallbackForSlot(
  catalog: HostContentCatalog,
  slotId: HostFallbackSlotId,
): HostFallbackItem | undefined {
  return catalog.items.find(
    (item): item is HostFallbackItem => item.type === 'fallback' && item.slotId === slotId,
  );
}

function gridTypography(ctx: VcResolutionContext): VcGridDefaultTypography {
  return ctx.gridDesign?.defaultTypography ?? DEFAULT_VC_GRID_DESIGN.defaultTypography;
}

function defaultTextStyle(text: string, typography: VcGridDefaultTypography): ResolvedText {
  return {
    kind: 'text',
    text,
    fontStyle: typography.fontStyle,
    fontSize: typography.fontSize,
    color: typography.color,
  };
}

function textFromTitleItem(
  item: Extract<HostContentItem, { type: 'title-text' }>,
  binding: VcHostSlotBinding | null,
): ResolvedText {
  const presentation = resolveEffectiveTitleTextPresentation(item, binding?.overrides ?? {});
  const text = presentation.allCaps ? item.text.toUpperCase() : item.text;
  return {
    kind: 'text',
    text,
    fontStyle: presentation.fontStyle,
    fontSize: presentation.fontSize,
    color: presentation.color,
    allCaps: presentation.allCaps,
    textAlign: presentation.textAlign,
    titleLine: true,
    lineOverflow: presentation.lineOverflow,
  };
}

function textFromAreaItem(
  item: Extract<HostContentItem, { type: 'area-text' }>,
  binding: VcHostSlotBinding | null,
): ResolvedText {
  const presentation = resolveEffectiveAreaTextPresentation(item, binding?.overrides ?? {});
  return {
    kind: 'text',
    text: item.text,
    fontStyle: presentation.fontStyle,
    fontSize: presentation.fontSize,
    color: presentation.color,
    markdownSource: presentation.markdownSource,
    textAlign: presentation.textAlign,
  };
}

function hostItemToResolved(
  item: HostContentItem,
  catalog: HostContentCatalog,
  binding: VcHostSlotBinding | null,
): ResolvedVcContent | null {
  if (item.type === 'graphic') {
    if (!item.mediaPath) return null;
    return {
      kind: 'graphic',
      mediaPath: item.mediaPath,
      presentation: resolveEffectiveGraphicPresentation(item, binding?.overrides ?? {}),
    };
  }
  if (item.type === 'video') {
    if (!item.mediaPath) return null;
    return {
      kind: 'video',
      mediaPath: item.mediaPath,
      presentation: resolveEffectiveVideoPresentation(item, binding?.overrides ?? {}),
    };
  }
  if (item.type === 'title-text') {
    return textFromTitleItem(item, binding);
  }
  if (item.type === 'area-text') {
    return textFromAreaItem(item, binding);
  }
  if (item.type === 'graphics-group') {
    return {
      kind: 'graphics-group',
      presentation: resolveEffectiveGroupPresentation(item, catalog, binding?.overrides ?? {}),
    };
  }
  return null;
}

function resolveSystemFallback(slotId: HostFallbackSlotId, typography: VcGridDefaultTypography): ResolvedVcContent {
  if (slotId === 'cover') {
    return { kind: 'graphic', systemAsset: 'cover' };
  }
  if (slotId === 'artist-image') {
    return { kind: 'graphic', systemAsset: 'artist-image' };
  }
  if (slotId === 'video-cover') {
    return { kind: 'video', systemAsset: 'video-cover' };
  }
  if (slotId === 'lyrics') {
    return { kind: 'lyrics', text: SYSTEM_FALLBACK_TEXT.lyrics };
  }
  if (slotId === 'about-song') {
    return {
      kind: 'about',
      coverUrl: null,
      caption: null,
      about: SYSTEM_FALLBACK_TEXT['about-song'],
    };
  }
  if (TEXT_FALLBACK_SLOTS.has(slotId)) {
    return defaultTextStyle(SYSTEM_FALLBACK_TEXT[slotId as keyof typeof SYSTEM_FALLBACK_TEXT], typography);
  }
  return { kind: 'empty' };
}

function resolveHostFallback(
  slot: HostFallbackItem,
  catalog: HostContentCatalog,
  random: () => number,
  typography: VcGridDefaultTypography,
): ResolvedVcContent | null {
  if (!slot.enabled) return null;

  if (TEXT_FALLBACK_SLOTS.has(slot.slotId)) {
    const text = resolveMultiFieldFallback(slot.textFields, random);
    if (text) return defaultTextStyle(text, typography);
  }

  if (slot.slotId === 'lyrics') {
    const text = resolveMultiFieldFallback(slot.textFields, random);
    if (text) return { kind: 'lyrics', text };
  }

  if (slot.slotId === 'about-song') {
    const text = resolveMultiFieldFallback(slot.textFields, random);
    if (text) {
      return { kind: 'about', coverUrl: null, caption: null, about: text };
    }
  }

  if (slot.linkedContentId) {
    const linked = findHostContentItem(catalog, slot.linkedContentId);
    if (!linked) return null;

    if (slot.slotId === 'lyrics') {
      if (linked.type === 'area-text' || linked.type === 'title-text') {
        return { kind: 'lyrics', text: linked.text };
      }
    }

    if (slot.slotId === 'about-song' && linked.type === 'area-text') {
      return {
        kind: 'about',
        coverUrl: null,
        caption: null,
        about: linked.text,
        markdownSource: linked.markdownSource,
        fontStyle: linked.fontStyle,
        fontSize: linked.fontSize,
        color: linked.color,
      };
    }

    return hostItemToResolved(linked, catalog, null);
  }

  return null;
}

function resolveWithFallbackChain(
  slotId: HostFallbackSlotId,
  ctx: VcResolutionContext,
): ResolvedVcContent {
  const fallback = fallbackForSlot(ctx.catalog, slotId);
  const random = ctx.random ?? Math.random;
  const typography = gridTypography(ctx);

  if (fallback && !fallback.resetToSystemDefault) {
    const hostResolved = resolveHostFallback(fallback, ctx.catalog, random, typography);
    if (hostResolved) return hostResolved;
  }

  return resolveSystemFallback(slotId, typography);
}

function songDurationSeconds(ctx: VcResolutionContext): number | null {
  const song = ctx.song;
  if (!song) return null;
  if (song.durationSeconds != null && song.durationSeconds > 0) return song.durationSeconds;
  if (ctx.playback.duration > 0) return ctx.playback.duration;
  return null;
}

function resolveSongPrimary(content: VcCellContent, ctx: VcResolutionContext): ResolvedVcContent | null {
  const song = ctx.song;
  if (!song) return null;

  if (content === 'cover' && song.coverUrl) {
    return { kind: 'graphic', remoteUrl: song.coverUrl };
  }

  if (content === 'video-cover' && song.videoCoverUrl) {
    return { kind: 'video', remoteUrl: song.videoCoverUrl };
  }

  if (content === 'lyrics' && song.lyrics.trim()) {
    return { kind: 'lyrics', text: song.lyrics };
  }

  if (content === 'marquee-lyrics' && song.lyrics.trim()) {
    return { kind: 'marquee-lyrics', text: song.lyrics };
  }

  if (content === 'about' && (song.about.trim() || song.caption || song.coverUrl)) {
    return {
      kind: 'about',
      coverUrl: song.coverUrl,
      caption: song.caption,
      about: song.about,
    };
  }

  if (content === 'artist-name') {
    const name = (song.artist.trim() || ctx.artistName?.trim() || '').trim();
    if (name) return defaultTextStyle(name, gridTypography(ctx));
  }

  if (content === 'artist-bio') {
    const bio = (ctx.artistBio ?? '').trim();
    if (bio) return defaultTextStyle(bio, gridTypography(ctx));
  }

  if (content === 'artist-bio-name') {
    const name = (song.artist.trim() || ctx.artistName?.trim() || '').trim();
    const bio = (ctx.artistBio ?? '').trim();
    if (name || bio) {
      const typography = gridTypography(ctx);
      return {
        kind: 'artist-bio-name',
        artistName: name,
        bio,
        fontStyle: typography.fontStyle,
        fontSize: typography.fontSize,
        color: typography.color,
      };
    }
  }

  if (content === 'artist-image' && ctx.artistPhotoUrl) {
    return { kind: 'graphic', remoteUrl: ctx.artistPhotoUrl };
  }

  if (content === 'song-title' && song.title.trim()) {
    return defaultTextStyle(song.title, gridTypography(ctx));
  }

  if (content === 'song-year' && song.year?.trim()) {
    return defaultTextStyle(song.year.trim(), gridTypography(ctx));
  }

  if (content === 'song-length') {
    const total = songDurationSeconds(ctx);
    if (total != null) return defaultTextStyle(formatPlaybackTime(total), gridTypography(ctx));
  }

  if (content === 'elapsed-remaining' && ctx.playback.duration > 0) {
    const elapsed = formatPlaybackTime(ctx.playback.currentTime);
    const remaining = formatPlaybackTime(Math.max(0, ctx.playback.duration - ctx.playback.currentTime));
    return defaultTextStyle(`${elapsed} / ${remaining}`, gridTypography(ctx));
  }

  if (content === 'main-genre' && song.mainGenre?.trim()) {
    return defaultTextStyle(song.mainGenre.trim(), gridTypography(ctx));
  }

  if (content === 'additional-genres' && song.additionalGenres?.trim()) {
    return defaultTextStyle(song.additionalGenres.trim(), gridTypography(ctx));
  }

  if (content === 'seek-bar') {
    return { kind: 'seek-bar', presentation: resolveSeekBarPresentation({}, gridTypography(ctx)) };
  }

  if (content === 'player-controls') {
    return { kind: 'player-controls', presentation: resolvePlayerControlsPresentation({}) };
  }

  if (content === 'upcoming-covers' && ctx.upcoming.length > 0) {
    return {
      kind: 'upcoming-covers',
      presentation: resolveUpcomingCoversPresentation({}),
      songs: ctx.upcoming,
    };
  }

  return null;
}

function applySongPresentation(
  content: VcCellContent,
  resolved: ResolvedVcContent,
  overrides: VcAssignmentOverrides,
  ctx: VcResolutionContext,
): ResolvedVcContent {
  const typography = gridTypography(ctx);

  // Interactive slots have no typography rule entry — apply dedicated presentation first.
  if (content === 'seek-bar' && resolved.kind === 'seek-bar') {
    return { ...resolved, presentation: resolveSeekBarPresentation(overrides, typography) };
  }

  if (content === 'player-controls' && resolved.kind === 'player-controls') {
    return { ...resolved, presentation: resolvePlayerControlsPresentation(overrides) };
  }

  if (content === 'upcoming-covers' && resolved.kind === 'upcoming-covers') {
    return { ...resolved, presentation: resolveUpcomingCoversPresentation(overrides, typography) };
  }

  const rule = SONG_CONTENT_SETTINGS_RULE[content];
  if (!rule) return resolved;

  if (rule === 'graphic' && resolved.kind === 'graphic') {
    return { ...resolved, presentation: resolveSongGraphicPresentation(overrides) };
  }

  if (rule === 'video' && resolved.kind === 'video') {
    return { ...resolved, presentation: resolveSongVideoPresentation(overrides) };
  }

  if (rule === 'title-text') {
    const isSongTitle = content === 'song-title';
    const presentation = resolveSongTitleTextPresentation(overrides, typography, {
      titleLine: isSongTitle,
    });
    if (resolved.kind === 'text') {
      const text = presentation.allCaps ? resolved.text.toUpperCase() : resolved.text;
      return {
        ...resolved,
        text,
        fontStyle: presentation.fontStyle,
        fontSize: presentation.fontSize,
        color: presentation.color,
        allCaps: presentation.allCaps,
        textAlign: presentation.textAlign,
        ...(isSongTitle
          ? { titleLine: true, lineOverflow: presentation.lineOverflow }
          : {}),
      };
    }
    if (resolved.kind === 'about') {
      return {
        ...resolved,
        fontStyle: presentation.fontStyle,
        fontSize: presentation.fontSize,
        color: presentation.color,
        allCaps: presentation.allCaps,
        textAlign: presentation.textAlign,
      };
    }
  }

  if (rule === 'area-text') {
    const presentation = resolveSongAreaTextPresentation(overrides, typography);
    const manifestDuration = songDurationSeconds(ctx);
    const songId = ctx.song?.id != null ? String(ctx.song.id) : null;

    if (resolved.kind === 'marquee-lyrics' || (content === 'marquee-lyrics' && resolved.kind === 'lyrics')) {
      const rawText = resolved.text;
      const tracking = resolveLyricTracking(overrides);
      const normalizedText = normalizeAlareLyricsText(rawText);

      return {
        kind: 'marquee-lyrics',
        text: normalizedText,
        fontStyle: presentation.fontStyle,
        fontSize: presentation.fontSize,
        color: presentation.color,
        textAlign: presentation.textAlign,
        lyricTracking: tracking,
        manifestDurationSeconds: manifestDuration,
        songId,
      };
    }

    if (resolved.kind === 'lyrics') {
      const tracking = resolveLyricTracking(overrides);
      const manifestDuration = songDurationSeconds(ctx);
      const songId = ctx.song?.id != null ? String(ctx.song.id) : null;

      if (tracking === 'alare') {
        return {
          ...resolved,
          text: normalizeAlareLyricsText(resolved.text),
          fontStyle: presentation.fontStyle,
          fontSize: presentation.fontSize,
          color: presentation.color,
          markdownSource: false,
          textAlign: presentation.textAlign,
          lyricTracking: 'alare',
          alareFadeEnabled: resolveAlareFadeEnabled(overrides),
          alareTargetVisibleLines: resolveAlareTargetVisibleLines(overrides),
          manifestDurationSeconds: manifestDuration,
          songId,
        };
      }

      const removeBracketed = resolveLyricsRemoveBracketed(overrides);
      const text = removeBracketed ? stripBracketedLyricsText(resolved.text) : resolved.text;
      return {
        ...resolved,
        text,
        fontStyle: presentation.fontStyle,
        fontSize: presentation.fontSize,
        color: presentation.color,
        markdownSource: presentation.markdownSource,
        textAlign: presentation.textAlign,
        lyricTracking: 'simple-scroll',
        lyricsEdgeFade: resolveLyricsEdgeFade(overrides),
        manifestDurationSeconds: manifestDuration,
        songId,
      };
    }
    if (resolved.kind === 'text') {
      return {
        ...resolved,
        fontStyle: presentation.fontStyle,
        fontSize: presentation.fontSize,
        color: presentation.color,
        markdownSource: presentation.markdownSource,
        textAlign: presentation.textAlign,
      };
    }
    if (resolved.kind === 'artist-bio-name') {
      return {
        ...resolved,
        fontStyle: presentation.fontStyle,
        fontSize: presentation.fontSize,
        color: presentation.color,
        markdownSource: presentation.markdownSource,
        textAlign: presentation.textAlign,
      };
    }
  }

  return resolved;
}

function resolveSongContent(
  content: VcCellContent,
  ctx: VcResolutionContext,
  songOverrides: VcAssignmentOverrides = {},
): ResolvedVcContent {
  const primary = resolveSongPrimary(content, ctx);
  if (primary) return applySongPresentation(content, primary, songOverrides, ctx);

  if (!ctx.useFallbacks) return { kind: 'empty' };

  const slotId = SONG_TO_FALLBACK[content];
  if (!slotId) return { kind: 'empty' };

  return applySongPresentation(content, resolveWithFallbackChain(slotId, ctx), songOverrides, ctx);
}

export function resolveHostAssignment(
  content: VcCellContent,
  binding: VcHostSlotBinding | null,
  catalog: HostContentCatalog,
): ResolvedVcContent {
  if (!isHostContentKind(content) || !binding?.itemId) {
    return { kind: 'empty' };
  }

  const item = findHostContentItem(catalog, binding.itemId);
  if (!item) return { kind: 'empty' };

  const expectedType = hostContentTypeForSlot(content);
  if (expectedType && item.type !== expectedType) {
    return { kind: 'empty' };
  }

  return hostItemToResolved(item, catalog, binding) ?? { kind: 'empty' };
}

/** Resolve a cell slot content kind into renderable VC output. */
export function resolveVcCellContent(
  content: VcCellContent,
  hostBinding: VcHostSlotBinding | null,
  ctx: VcResolutionContext,
  songOverrides?: VcAssignmentOverrides | null,
): ResolvedVcContent {
  if (!content) return { kind: 'empty' };
  if (content === 'visualizer') return { kind: 'visualizer' };
  if (isHostContentKind(content)) {
    return resolveHostAssignment(content, hostBinding, ctx.catalog);
  }
  return resolveSongContent(content, ctx, songOverrides ?? {});
}
