import type { PlaylistExportOptions, PlaylistExportTrack } from './types';

type MetadataOptions = Pick<PlaylistExportOptions, 'includeAlbum' | 'includeYear'>;

/** Parenthetical album/year segment — omitted entirely when nothing to show. */
export function formatTrackMetadataParenthetical(
  track: Pick<PlaylistExportTrack, 'album' | 'year'>,
  options: MetadataOptions,
): string {
  const album = options.includeAlbum ? track.album : null;
  const year = options.includeYear ? track.year : null;
  if (!album && !year) return '';

  if (album && year) return ` (${album}, ${year})`;
  if (year) return ` (${year})`;
  return ` (${album})`;
}

export function formatTrackLengthSuffix(
  track: Pick<PlaylistExportTrack, 'length'>,
  includeLength: boolean,
): string {
  if (!includeLength || !track.length) return '';
  return ` - ${track.length}`;
}
