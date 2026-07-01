// Package "main" is broken for Vite — import the browser bundle directly.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error untyped UMD bundle
import jsmediatags from "jsmediatags/dist/jsmediatags.min.js";

export type Mp3Metadata = {
  title: string;
  artist: string;
  album: string;
  year: string;
  coverBlob: Blob | null;
  coverFileName: string | null;
};

const emptyMeta = (): Mp3Metadata => ({
  title: "",
  artist: "",
  album: "",
  year: "",
  coverBlob: null,
  coverFileName: null,
});

/** Read ID3 tags and embedded cover art from a local MP3 file. */
export function readMp3Metadata(file: File): Promise<Mp3Metadata> {
  return new Promise((resolve) => {
    const fallback = emptyMeta();

    jsmediatags.read(file, {
      onSuccess: (tag: { tags: Record<string, unknown> }) => {
        const tags = tag.tags ?? {};
        const title = String(tags.title ?? "");
        const artist = String(tags.artist ?? "");
        const album = String(tags.album ?? "");
        const year = String(tags.year ?? tags.date ?? "").slice(0, 4);

        let coverBlob: Blob | null = null;
        let coverFileName: string | null = null;

        const picture = tags.picture as
          | { data: number[] | Int8Array | Uint8Array; format: string }
          | undefined;

        if (picture?.data) {
          const bytes =
            picture.data instanceof Uint8Array ? picture.data : new Uint8Array(picture.data);
          const mime = picture.format?.includes("png") ? "image/png" : "image/jpeg";
          coverBlob = new Blob([bytes], { type: mime });
          coverFileName = mime === "image/png" ? "cover-from-mp3.png" : "cover-from-mp3.jpg";
        }

        resolve({ title, artist, album, year, coverBlob, coverFileName });
      },
      onError: () => resolve(fallback),
    });
  });
}
