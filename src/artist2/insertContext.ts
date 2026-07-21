/**
 * Context-aware insert rules for the catalog sidebar.
 * Song containers accept tracks; Playlists also accept albums; Songs / Albums
 * accept related links; artwork accepts images.
 */

import type {
  Artist2AlbumRelationKind,
  Artist2CatalogObject,
  Artist2SongRelationKind,
} from '@shared/artist2';
import {
  isSongContainerKind,
  normalizeAlbumRelations,
  normalizeSongArtwork,
  normalizeSongRelations,
} from '@shared/artist2';

export type InsertContext = {
  /** Album or Playlist currently open for member inserts. */
  containerTracks: {
    containerId: string;
    containerKind: 'album' | 'playlist';
    existingMemberIds: Set<string>;
    /** Albums: songs only. Playlists: songs + albums. */
    allowedMemberKinds: Set<'song' | 'album'>;
  } | null;
  /**
   * Songs, Albums, and Playlists append to the multi-image artworkEntries list.
   * existingContentIds blocks duplicates.
   */
  artwork: {
    objectId: string;
    targetKind: 'multi-image';
    existingContentIds: Set<string>;
  } | null;
  /** Selected Song can receive → related Song links. */
  relatedSongs: {
    songId: string;
    existingRelatedIds: Set<string>;
    defaultRelation: Artist2SongRelationKind;
  } | null;
  /** Selected Album can receive → related Album links. */
  relatedAlbums: {
    albumId: string;
    existingRelatedIds: Set<string>;
    defaultRelation: Artist2AlbumRelationKind;
  } | null;
};

export const EMPTY_INSERT_CONTEXT: InsertContext = {
  containerTracks: null,
  artwork: null,
  relatedSongs: null,
  relatedAlbums: null,
};

export function buildInsertContext(input: {
  selected: Artist2CatalogObject | null;
  albumDetail: { id: string; kind: string; tracks: Artist2CatalogObject[] } | null;
}): InsertContext {
  const { selected, albumDetail } = input;
  if (!selected) return EMPTY_INSERT_CONTEXT;

  let containerTracks: InsertContext['containerTracks'] = null;
  let artwork: InsertContext['artwork'] = null;
  let relatedSongs: InsertContext['relatedSongs'] = null;
  let relatedAlbums: InsertContext['relatedAlbums'] = null;

  if (isSongContainerKind(selected.kind) && albumDetail && albumDetail.id === selected.id) {
    containerTracks = {
      containerId: albumDetail.id,
      containerKind: selected.kind,
      existingMemberIds: new Set(albumDetail.tracks.map((track) => track.id)),
      allowedMemberKinds:
        selected.kind === 'playlist'
          ? new Set(['song', 'album'])
          : new Set(['song']),
    };
  }

  if (selected.kind === 'song' || selected.kind === 'album' || selected.kind === 'playlist') {
    // Multi-image list — every Content image already linked is off-limits.
    const entries = normalizeSongArtwork(
      selected.payload as Parameters<typeof normalizeSongArtwork>[0],
    );
    const existingContentIds = new Set<string>();
    for (const entry of entries) {
      if (entry.source.mode === 'contentRef') existingContentIds.add(entry.source.contentId);
    }
    artwork = { objectId: selected.id, targetKind: 'multi-image', existingContentIds };
  }

  if (selected.kind === 'song') {
    const related = normalizeSongRelations(
      (selected.payload as { relatedSongs?: unknown }).relatedSongs,
    );
    relatedSongs = {
      songId: selected.id,
      existingRelatedIds: new Set(related.map((row) => row.songId)),
      defaultRelation: 'sister',
    };
  }

  if (selected.kind === 'album') {
    const related = normalizeAlbumRelations(
      (selected.payload as { relatedAlbums?: unknown }).relatedAlbums,
    );
    relatedAlbums = {
      albumId: selected.id,
      existingRelatedIds: new Set(related.map((row) => row.albumId)),
      defaultRelation: 'sister',
    };
  }

  return { containerTracks, artwork, relatedSongs, relatedAlbums };
}

function isAllowedContainerMember(
  object: Artist2CatalogObject,
  context: InsertContext,
): boolean {
  if (!context.containerTracks) return false;
  if (context.containerTracks.existingMemberIds.has(object.id)) return false;
  if (object.id === context.containerTracks.containerId) return false;
  if (object.kind === 'song') {
    return context.containerTracks.allowedMemberKinds.has('song');
  }
  if (object.kind === 'album') {
    return context.containerTracks.allowedMemberKinds.has('album');
  }
  return false;
}

export function canInsertObject(object: Artist2CatalogObject, context: InsertContext): boolean {
  if (isAllowedContainerMember(object, context)) {
    return true;
  }
  if (
    context.relatedSongs &&
    object.kind === 'song' &&
    object.id !== context.relatedSongs.songId &&
    !context.relatedSongs.existingRelatedIds.has(object.id)
  ) {
    return true;
  }
  if (
    context.relatedAlbums &&
    object.kind === 'album' &&
    object.id !== context.relatedAlbums.albumId &&
    !context.relatedAlbums.existingRelatedIds.has(object.id)
  ) {
    return true;
  }
  if (
    context.artwork &&
    object.kind === 'content' &&
    object.contentType === 'image' &&
    !context.artwork.existingContentIds.has(object.id)
  ) {
    return true;
  }
  return false;
}

export function insertActionLabel(
  object: Artist2CatalogObject,
  context: InsertContext,
): string {
  if (isAllowedContainerMember(object, context) && context.containerTracks) {
    const label = context.containerTracks.containerKind === 'playlist' ? 'playlist' : 'album';
    const slot = context.containerTracks.containerKind === 'playlist' ? 'music' : 'tracks';
    return `Insert “${object.name}” into ${label} ${slot}`;
  }
  if (
    context.relatedSongs &&
    object.kind === 'song' &&
    object.id !== context.relatedSongs.songId &&
    !context.relatedSongs.existingRelatedIds.has(object.id)
  ) {
    return `Relate “${object.name}” as Sister Song`;
  }
  if (
    context.relatedAlbums &&
    object.kind === 'album' &&
    object.id !== context.relatedAlbums.albumId &&
    !context.relatedAlbums.existingRelatedIds.has(object.id)
  ) {
    return `Relate “${object.name}” as Sister Album`;
  }
  if (
    context.artwork &&
    object.kind === 'content' &&
    object.contentType === 'image'
  ) {
    return `Add “${object.name}” to artwork`;
  }
  return `Insert “${object.name}”`;
}

export function resolveInsertAction(
  object: Artist2CatalogObject,
  context: InsertContext,
): 'container-track' | 'related-song' | 'related-album' | 'artwork' | null {
  // Prefer container member insert when an album/playlist is open.
  if (isAllowedContainerMember(object, context)) {
    return 'container-track';
  }
  if (
    context.relatedSongs &&
    object.kind === 'song' &&
    object.id !== context.relatedSongs.songId &&
    !context.relatedSongs.existingRelatedIds.has(object.id)
  ) {
    return 'related-song';
  }
  if (
    context.relatedAlbums &&
    object.kind === 'album' &&
    object.id !== context.relatedAlbums.albumId &&
    !context.relatedAlbums.existingRelatedIds.has(object.id)
  ) {
    return 'related-album';
  }
  if (
    context.artwork &&
    object.kind === 'content' &&
    object.contentType === 'image' &&
    !context.artwork.existingContentIds.has(object.id)
  ) {
    return 'artwork';
  }
  return null;
}
