import { socialIconSvg } from "./socialIcons";

/** Escape user text before inserting into exported HTML. */
export function escapeHtmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Filesystem-safe slug for directory and file names. */
export function slugifySiteText(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "untitled";
}

export function stripUrlOrHandle(value: string): string {
  return value.trim().replace(/^@/, "");
}

export function buildSocialUrl(
  platform: "instagram" | "tiktok" | "youtube" | "spotify" | "soundcloud",
  handle: string,
): string | null {
  const id = stripUrlOrHandle(handle);
  if (!id) return null;

  if (id.startsWith("http://") || id.startsWith("https://")) return id;

  switch (platform) {
    case "instagram":
      return `https://instagram.com/${id}`;
    case "tiktok":
      return `https://www.tiktok.com/@${id}`;
    case "youtube":
      return id.startsWith("UC") ? `https://www.youtube.com/channel/${id}` : `https://www.youtube.com/@${id}`;
    case "spotify":
      return `https://open.spotify.com/artist/${id}`;
    case "soundcloud":
      return `https://soundcloud.com/${id}`;
    default:
      return null;
  }
}

const SOCIAL_PLATFORMS = ["instagram", "tiktok", "youtube", "spotify", "soundcloud"] as const;

export function socialLinksHtml(social: Record<string, string>): string {
  const parts: string[] = [];

  for (const platform of SOCIAL_PLATFORMS) {
    const url = buildSocialUrl(platform, social[platform] ?? "");
    if (!url) continue;
    const label = platform.charAt(0).toUpperCase() + platform.slice(1);
    parts.push(
      `<a class="social-icon-btn" data-platform="${platform}" href="${escapeHtmlText(url)}" rel="noopener noreferrer" target="_blank" aria-label="${escapeHtmlText(label)}">${socialIconSvg(platform)}</a>`,
    );
  }

  return parts.length ? `<nav class="social-links" aria-label="Social">${parts.join("")}</nav>` : "";
}

export function streamLinksHtml(links: {
  youtube?: string;
  spotify?: string;
  soundcloud?: string;
}): string {
  const items: string[] = [];
  if (links.youtube?.trim()) {
    items.push(
      `<a href="${escapeHtmlText(links.youtube.trim())}" rel="noopener noreferrer" target="_blank">YouTube</a>`,
    );
  }
  if (links.spotify?.trim()) {
    items.push(
      `<a href="${escapeHtmlText(links.spotify.trim())}" rel="noopener noreferrer" target="_blank">Spotify</a>`,
    );
  }
  if (links.soundcloud?.trim()) {
    items.push(
      `<a href="${escapeHtmlText(links.soundcloud.trim())}" rel="noopener noreferrer" target="_blank">SoundCloud</a>`,
    );
  }
  return items.length ? `<div class="stream-links">${items.join(" · ")}</div>` : "";
}
