export type PlaylistExportLinkStyle = 'fullUrls' | 'maskedLinks' | 'noLinks';
export type PlaylistExportOutputFormat = 'plainText' | 'markdown';

export type PlaylistExportOptions = {
  playlistName: string;
  introduction: string;
  includeAlbum: boolean;
  includeYear: boolean;
  includeLength: boolean;
  linkStyle: PlaylistExportLinkStyle;
  outputFormat: PlaylistExportOutputFormat;
};

export type PlaylistExportTrack = {
  title: string;
  artistName: string;
  album: string | null;
  year: string | null;
  length: string | null;
  url: string | null;
};

export type PlaylistExportModel = {
  playlistName: string;
  introduction: string;
  createdDateLabel: string | null;
  trackCount: number;
  tracks: PlaylistExportTrack[];
  attribution: string;
};

export type PlaylistExportSongInput = {
  id: number;
  sort_order: number;
  title: string;
  artist_name?: string | null;
  album?: string | null;
  year?: string | null;
  duration_seconds?: number | null;
  page_url: string;
  external_id: string;
  slug: string;
  playback_scope?: string | null;
  skipped?: number | boolean | null;
};
