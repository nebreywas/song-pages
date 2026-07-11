import {
  formatTrackLengthSuffix,
  formatTrackMetadataParenthetical,
} from './formatTrackLine';
import type { PlaylistExportModel, PlaylistExportOptions, PlaylistExportTrack } from './types';

function renderMarkdownTitle(
  track: PlaylistExportTrack,
  options: PlaylistExportOptions,
): string {
  const boldTitle = `**${track.title}**`;
  if (options.linkStyle === 'maskedLinks' && track.url) {
    return `[${boldTitle}](${track.url})`;
  }
  return boldTitle;
}

function renderMarkdownAlbumYear(
  track: PlaylistExportTrack,
  options: Pick<PlaylistExportOptions, 'includeAlbum' | 'includeYear'>,
): string {
  const album = options.includeAlbum ? track.album : null;
  const year = options.includeYear ? track.year : null;
  if (!album && !year) return '';

  if (album && year) return ` (*${album}*, ${year})`;
  if (year) return ` (${year})`;
  return ` (*${album}*)`;
}

function renderMarkdownTrackLine(track: PlaylistExportTrack, options: PlaylistExportOptions): string {
  const title = renderMarkdownTitle(track, options);
  const meta = renderMarkdownAlbumYear(track, options);
  const length = formatTrackLengthSuffix(track, options.includeLength);
  return `${title} - ${track.artistName}${meta}${length}`;
}

/** Join export sections with a single blank line — no doubled carriage returns. */
function joinMarkdownBlocks(blocks: string[]): string {
  return blocks
    .map((block) => block.trimEnd())
    .filter((block) => block.length > 0)
    .join('\n\n');
}

/** Markdown clipboard output — Discord-safe subset from the share spec. */
export function renderPlaylistExportMarkdown(
  model: PlaylistExportModel,
  options: PlaylistExportOptions,
): string {
  const blocks: string[] = [];

  if (model.introduction.trim()) {
    blocks.push(model.introduction.trimEnd());
  }

  const headerLines = [`# ${options.playlistName.trim() || model.playlistName}`];
  if (model.createdDateLabel) {
    headerLines.push(`## ${model.createdDateLabel}`);
  }
  const countHeading = model.trackCount === 1 ? '1 Track' : `${model.trackCount} Tracks`;
  headerLines.push(`### ${countHeading}`);
  blocks.push(headerLines.join('\n'));

  for (const track of model.tracks) {
    const trackLines = [renderMarkdownTrackLine(track, options)];
    // Full URLs sit directly under the track line — no extra blank line before the link.
    if (options.linkStyle === 'fullUrls' && track.url) {
      trackLines.push(track.url);
    }
    blocks.push(trackLines.join('\n'));
  }

  blocks.push(`-# ${model.attribution}`);

  return joinMarkdownBlocks(blocks);
}
