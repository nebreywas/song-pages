import { buildPlaylistExportModel } from './buildExportModel';
import { renderPlaylistExportMarkdown } from './renderMarkdown';
import { renderPlaylistExportPlainText } from './renderPlainText';
import type { PlaylistExportOptions, PlaylistExportSongInput } from './types';

export {
  buildPlaylistExportModel,
  DEFAULT_PLAYLIST_EXPORT_INTRODUCTION,
  PLAYLIST_EXPORT_ATTRIBUTION,
} from './buildExportModel';
export { orderSongsForPlaylistExport } from './orderForExport';
export { renderPlaylistExportMarkdown } from './renderMarkdown';
export { renderPlaylistExportPlainText } from './renderPlainText';
export type {
  PlaylistExportLinkStyle,
  PlaylistExportModel,
  PlaylistExportOptions,
  PlaylistExportOutputFormat,
  PlaylistExportSongInput,
  PlaylistExportTrack,
} from './types';

type RenderPlaylistExportInput = {
  playlistName: string;
  introduction: string;
  createdAt: string | null | undefined;
  songs: PlaylistExportSongInput[];
  customOrderIds?: number[] | null;
  options: PlaylistExportOptions;
};

/** Build export model and render for the selected output format. */
export function renderPlaylistExport(input: RenderPlaylistExportInput): string {
  const linkStyle = normalizePlaylistExportLinkStyle(input.options.outputFormat, input.options.linkStyle);
  const options = { ...input.options, linkStyle };

  const model = buildPlaylistExportModel({
    playlistName: options.playlistName,
    introduction: input.introduction,
    createdAt: input.createdAt,
    songs: input.songs,
    customOrderIds: input.customOrderIds,
  });

  if (options.outputFormat === 'markdown') {
    return renderPlaylistExportMarkdown(model, options);
  }
  return renderPlaylistExportPlainText(model, options);
}

/** Masked links require markdown — coerce link style for plain text output. */
export function normalizePlaylistExportLinkStyle(
  outputFormat: PlaylistExportOptions['outputFormat'],
  linkStyle: PlaylistExportOptions['linkStyle'],
): PlaylistExportOptions['linkStyle'] {
  if (outputFormat === 'plainText' && linkStyle === 'maskedLinks') {
    return 'fullUrls';
  }
  return linkStyle;
}
