/** Link a selected file once on the dev server; returns a persistent local path pointer. */
export async function linkLocalFile(
  key: string,
  file: File,
): Promise<{ ok: true; localPath: string; fileName: string } | { ok: false; error: string }> {
  const formData = new FormData();
  formData.append("key", key);
  formData.append("file", file, file.name);

  const response = await fetch("/api/dev/artist-page-link-file", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as {
    ok: boolean;
    localPath?: string;
    fileName?: string;
    error?: string;
  };

  if (!response.ok || !payload.ok || !payload.localPath) {
    return { ok: false, error: payload.error ?? `Link failed (${response.status})` };
  }

  return { ok: true, localPath: payload.localPath, fileName: payload.fileName ?? file.name };
}
