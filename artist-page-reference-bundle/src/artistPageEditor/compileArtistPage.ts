import { getAsset } from "./artistPageAssetDb";
import { buildCompileManifest } from "./artistPageDraftStore";
import { ARTIST_PHOTO_KEY, assetKey, type ArtistPageDraft } from "./types";

export type CompileApiResult =
  | {
      ok: true;
      slug: string;
      previewUrl: string;
      outputFolder: string;
      songCount: number;
    }
  | { ok: false; error: string };

/**
 * Compile using saved localPath pointers when available; fall back to IndexedDB blob upload.
 */
export async function requestArtistPageCompile(draft: ArtistPageDraft): Promise<CompileApiResult> {
  const manifest = await buildCompileManifest(draft, async (key) => (await getAsset(key)) !== undefined);

  const formData = new FormData();
  formData.append("manifest", JSON.stringify(manifest));

  for (const song of manifest.songs) {
    if (!song.hasAudio) continue;

    if (!song.audioLocalPath?.trim()) {
      const audio = await getAsset(assetKey("audio", song.id));
      if (audio) formData.append(`audio-${song.id}`, audio.blob, audio.fileName);
    }

    if (song.hasCover && !song.coverLocalPath?.trim()) {
      const cover = await getAsset(assetKey("cover", song.id));
      if (cover) formData.append(`cover-${song.id}`, cover.blob, cover.fileName);
    }

    if (song.hasExtraImage && !song.extraImageLocalPath?.trim()) {
      const extra = await getAsset(assetKey("extra", song.id));
      if (extra) formData.append(`extra-${song.id}`, extra.blob, extra.fileName);
    }
  }

  if (manifest.hasArtistPhoto && !manifest.artistPhotoLocalPath?.trim()) {
    const photo = await getAsset(ARTIST_PHOTO_KEY);
    if (photo) formData.append("artist-photo", photo.blob, photo.fileName);
  }

  const response = await fetch("/api/dev/artist-page-compile", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as CompileApiResult;
  if (!response.ok || !payload.ok) {
    return { ok: false, error: "error" in payload ? payload.error : `Compile failed (${response.status})` };
  }

  return payload;
}
