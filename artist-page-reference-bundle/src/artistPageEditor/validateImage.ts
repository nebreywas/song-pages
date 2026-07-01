const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/jpg"]);

export type ImageValidationResult =
  | { ok: true; width: number; height: number }
  | { ok: false; error: string };

/** Validate PNG/JPG dimensions before accepting an upload. */
export function validateImageFile(file: File, maxEdge: number): Promise<ImageValidationResult> {
  if (!ALLOWED_MIME.has(file.type)) {
    return Promise.resolve({ ok: false, error: "Only PNG or JPG images are allowed." });
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width > maxEdge || img.height > maxEdge) {
        resolve({
          ok: false,
          error: `Image must be at most ${maxEdge}×${maxEdge}px (got ${img.width}×${img.height}).`,
        });
        return;
      }
      resolve({ ok: true, width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ok: false, error: "Could not read image file." });
    };

    img.src = url;
  });
}
