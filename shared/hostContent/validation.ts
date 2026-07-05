/**
 * Host media import validation — user-facing error strings from spec.
 */

import {
  HOST_GRAPHIC_EXTENSIONS,
  HOST_GRAPHIC_MAX_BYTES,
  HOST_MEDIA_MAX_PX,
  HOST_VIDEO_EXTENSIONS,
  HOST_VIDEO_MAX_BYTES,
} from './constants';

export function graphicExtensionError(): string {
  return 'File must be (.png/.jpg/.heic/.gif/.webp) format.';
}

export function videoExtensionError(): string {
  return 'File must be .mp4 format.';
}

export function mediaDimensionError(): string {
  return 'Image or video size can not exceed 2560 x 2560';
}

export function graphicSizeError(): string {
  return 'File size can not exceed 5mb';
}

export function videoSizeError(): string {
  return 'File size can not exceed 12mb';
}

export function extensionOf(filePath: string): string {
  const match = /\.([^.\\/]+)$/i.exec(filePath);
  return match ? match[1].toLowerCase() : '';
}

export function validateGraphicFile(
  filePath: string,
  fileSizeBytes: number,
  widthPx: number,
  heightPx: number,
): string | null {
  const ext = extensionOf(filePath);
  if (!HOST_GRAPHIC_EXTENSIONS.includes(ext as (typeof HOST_GRAPHIC_EXTENSIONS)[number])) {
    return graphicExtensionError();
  }
  if (fileSizeBytes > HOST_GRAPHIC_MAX_BYTES) return graphicSizeError();
  if (widthPx > HOST_MEDIA_MAX_PX || heightPx > HOST_MEDIA_MAX_PX) return mediaDimensionError();
  return null;
}

export function validateVideoFile(filePath: string, fileSizeBytes: number): string | null {
  const ext = extensionOf(filePath);
  if (!HOST_VIDEO_EXTENSIONS.includes(ext as (typeof HOST_VIDEO_EXTENSIONS)[number])) {
    return videoExtensionError();
  }
  if (fileSizeBytes > HOST_VIDEO_MAX_BYTES) return videoSizeError();
  return null;
}
