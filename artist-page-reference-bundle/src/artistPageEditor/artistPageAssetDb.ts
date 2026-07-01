import Dexie, { type Table } from "dexie";

export type StoredBlob = {
  key: string;
  blob: Blob;
  fileName: string;
  updatedAt: number;
};

/** IndexedDB cache for MP3/images — survives refresh; not real filesystem paths. */
class ArtistPageAssetDb extends Dexie {
  blobs!: Table<StoredBlob, string>;

  constructor() {
    super("voluminous-artist-page-assets");
    this.version(1).stores({ blobs: "key" });
  }
}

const db = new ArtistPageAssetDb();

export async function saveAsset(key: string, blob: Blob, fileName: string): Promise<void> {
  await db.blobs.put({ key, blob, fileName, updatedAt: Date.now() });
}

export async function getAsset(key: string): Promise<StoredBlob | undefined> {
  return db.blobs.get(key);
}

export async function deleteAsset(key: string): Promise<void> {
  await db.blobs.delete(key);
}

export async function hasAsset(key: string): Promise<boolean> {
  return (await db.blobs.get(key)) !== undefined;
}
