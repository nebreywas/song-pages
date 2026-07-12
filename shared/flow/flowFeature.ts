/**
 * Google Flow feature surface for renderer + shared code.
 * Intake/canonicalization lives in shared/providers/flow — this module re-exports
 * stable helpers used by ListenerMode, playlist snapshots, and manifests.
 */
import {
  FLOW_MANIFEST_PREFIX,
  FLOW_PAGE_PREFIX,
  FLOW_PLAYBACK_SCOPE,
  FLOW_CLIP_UUID_RE,
  FLOW_PUBLIC_SHARE_BASE,
} from '../providers/flow/constants.ts';
import { canonicalizeFlowInput, type FlowCanonicalRef } from '../providers/flow/canonicalize.ts';

export {
  FLOW_PLAYBACK_SCOPE,
  FLOW_PAGE_PREFIX,
  FLOW_MANIFEST_PREFIX,
  FLOW_PUBLIC_SHARE_BASE,
};

export type { FlowCanonicalRef };

export { canonicalizeFlowInput };

export function flowShareUrl(clipId: string): string {
  return `${FLOW_PUBLIC_SHARE_BASE}${clipId}`;
}

export function flowPageUrl(clipId: string): string {
  return `${FLOW_PAGE_PREFIX}${clipId}`;
}

export function flowManifestUrl(clipId: string): string {
  return `${FLOW_MANIFEST_PREFIX}${clipId}`;
}

export function isFlowSnapshot(pageUrl?: string | null): boolean {
  return String(pageUrl ?? '').startsWith(FLOW_PAGE_PREFIX);
}

export function isFlowSong(song: {
  playback_scope?: string | null;
  page_url?: string | null;
}): boolean {
  return song.playback_scope === FLOW_PLAYBACK_SCOPE || isFlowSnapshot(song.page_url);
}

export function flowClipIdFromSong(song: {
  external_id?: string | null;
  slug?: string | null;
  playback_url?: string | null;
  page_url?: string | null;
}): string | null {
  if (song.external_id && FLOW_CLIP_UUID_RE.test(song.external_id)) {
    return song.external_id.toLowerCase();
  }
  if (isFlowSnapshot(song.page_url)) {
    const id = song.page_url!.slice(FLOW_PAGE_PREFIX.length);
    return FLOW_CLIP_UUID_RE.test(id) ? id.toLowerCase() : null;
  }
  const intake = canonicalizeFlowInput(song.playback_url ?? '');
  return intake.ok ? intake.ref.clipId : null;
}

export function parseFlowManifestClipId(url: string): string | null {
  if (!url.startsWith(FLOW_MANIFEST_PREFIX)) return null;
  const id = url.slice(FLOW_MANIFEST_PREFIX.length);
  return FLOW_CLIP_UUID_RE.test(id) ? id.toLowerCase() : null;
}
