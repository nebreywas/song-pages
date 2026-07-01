import { buildCompileManifest } from './artistPageDraftStore';
import type { ArtistPageDraft } from './types';

export type CompileApiResult =
  | {
      ok: true;
      slug: string;
      previewUrl: string;
      outputFolder: string;
      songCount: number;
      buildVersion?: string;
    }
  | { ok: false; error: string };

/** Compile via Electron main process (ffmpeg + templates + manifests). */
export async function requestArtistPageCompile(draft: ArtistPageDraft): Promise<CompileApiResult> {
  const manifest = buildCompileManifest(draft);

  const result = await window.app.artist.compile({ manifest });

  if (!result.ok || !result.data) {
    return { ok: false, error: result.error || 'Compile failed.' };
  }

  const data = result.data as {
    slug: string;
    previewUrl: string;
    outputFolder: string;
    songCount: number;
    buildVersion?: string;
  };

  return {
    ok: true,
    slug: data.slug,
    previewUrl: data.previewUrl,
    outputFolder: data.outputFolder,
    songCount: data.songCount,
    buildVersion: data.buildVersion,
  };
}
