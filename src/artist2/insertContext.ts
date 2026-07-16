/**
 * Context-aware insert rules for the catalog sidebar.
 * Song containers accept tracks; Songs accept related-song links; artwork accepts images.
 */

import type { Artist2CatalogObject, Artist2SongRelationKind } from '@shared/artist2';
import { isSongContainerKind, normalizeSongRelations } from '@shared/artist2';

export type InsertContext = {
  /** Album or Playlist currently open for track inserts. */
  containerTracks: {
    containerId: string;
    containerKind: 'album' | 'playlist';
    existingMemberIds: Set<string>;
  } | null;
  artwork: { objectId: string; currentContentId: string | null } | null;
  /** Selected Song can receive → related Song links. */
  relatedSongs: {
    songId: string;
    existingRelatedIds: Set<string>;
    defaultRelation: Artist2SongRelationKind;
  } | null;
};

export const EMPTY_INSERT_CONTEXT: InsertContext = {
  containerTracks: null,
  artwork: null,
  relatedSongs: null,
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

  if (isSongContainerKind(selected.kind) && albumDetail && albumDetail.id === selected.id) {
    containerTracks = {
      containerId: albumDetail.id,
      containerKind: selected.kind,
      existingMemberIds: new Set(albumDetail.tracks.map((track) => track.id)),
    };
  }

  if (selected.kind === 'song' || isSongContainerKind(selected.kind)) {
    const art = (selected.payload as { artwork?: { mode: string; contentId?: string } }).artwork;
    artwork = {
      objectId: selected.id,
      currentContentId: art?.mode === 'contentRef' ? art.contentId ?? null : null,
    };
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

  return { containerTracks, artwork, relatedSongs };
}

export function canInsertObject(object: Artist2CatalogObject, context: InsertContext): boolean {
  if (
    context.containerTracks &&
    object.kind === 'song' &&
    !context.containerTracks.existingMemberIds.has(object.id)
  ) {
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
    context.artwork &&
    object.kind === 'content' &&
    object.contentType === 'image' &&
    object.id !== context.artwork.currentContentId
  ) {
    return true;
  }
  return false;
}

export function insertActionLabel(
  object: Artist2CatalogObject,
  context: InsertContext,
): string {
  if (
    context.containerTracks &&
    object.kind === 'song' &&
    !context.containerTracks.existingMemberIds.has(object.id)
  ) {
    const label = context.containerTracks.containerKind === 'playlist' ? 'playlist' : 'album';
    return `Insert “${object.name}” into ${label} tracks`;
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
    context.artwork &&
    object.kind === 'content' &&
    object.contentType === 'image'
  ) {
    return `Use “${object.name}” as cover artwork`;
  }
  return `Insert “${object.name}”`;
}

export function resolveInsertAction(
  object: Artist2CatalogObject,
  context: InsertContext,
): 'container-track' | 'related-song' | 'artwork' | null {
  // Prefer container track insert when an album/playlist is open.
  if (
    context.containerTracks &&
    object.kind === 'song' &&
    !context.containerTracks.existingMemberIds.has(object.id)
  ) {
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
    context.artwork &&
    object.kind === 'content' &&
    object.contentType === 'image' &&
    object.id !== context.artwork.currentContentId
  ) {
    return 'artwork';
  }
  return null;
}
