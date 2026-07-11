import {
  formatTrackLengthSuffix,
  formatTrackMetadataParenthetical,
} from './formatTrackLine';
import type { PlaylistExportModel, PlaylistExportOptions } from './types';

function renderPlainTrackLine(track: PlaylistExportModel['tracks'][number], options: PlaylistExportOptions): string {
  const meta = formatTrackMetadataParenthetical(track, options);
  const length = formatTrackLengthSuffix(track, options.includeLength);
  return `${track.title} - ${track.artistName}${meta}${length}`;
}

/** Join export sections with a single blank line between blocks. */
function joinPlainTextBlocks(blocks: string[]): string {
  return blocks
    .map((block) => block.trimEnd())
    .filter((block) => block.length > 0)
    .join('\n\n');
}

/** Plain-text clipboard output for playlist sharing. */
export function renderPlaylistExportPlainText(
  model: PlaylistExportModel,
  options: PlaylistExportOptions,
): string {
  const blocks: string[] = [];

  if (model.introduction.trim()) {
    blocks.push(model.introduction.trimEnd());
  }

  const headerLines = [options.playlistName.trim() || model.playlistName];
  if (model.createdDateLabel) {
    headerLines.push(model.createdDateLabel);
  }
  const countLabel = model.trackCount === 1 ? '1 track' : `${model.trackCount} tracks`;
  headerLines.push(countLabel);
  blocks.push(headerLines.join('\n'));

  for (const track of model.tracks) {
    const trackLines = [renderPlainTrackLine(track, options)];
    if (options.linkStyle === 'fullUrls' && track.url) {
      trackLines.push(track.url);
    }
    blocks.push(trackLines.join('\n'));
  }

  blocks.push(model.attribution);

  return joinPlainTextBlocks(blocks);
}
