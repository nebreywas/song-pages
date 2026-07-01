import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type SongPlaybackQuality = "high" | "degraded";
export type SongPlaybackScope = "full" | "preview";
export type SongPlaybackPreviewSeconds = 30 | 45 | 60;

export type SongPlaybackConfig = {
  quality: SongPlaybackQuality;
  scope: SongPlaybackScope;
  previewSeconds: SongPlaybackPreviewSeconds;
};

function ffmpegAudioArgs(config: SongPlaybackConfig): string[] {
  const args: string[] = [
    "-vn",
    "-sn",
    "-dn",
    "-map",
    "0:a:0",
  ];

  if (config.scope === "preview") {
    args.push("-t", String(config.previewSeconds));
  }

  if (config.quality === "high") {
    args.push("-codec:a", "aac", "-b:a", "192k", "-ac", "2");
  } else {
    args.push("-codec:a", "aac", "-b:a", "96k", "-ac", "1");
  }

  return args;
}

/**
 * Slice a source audio file into 4s HLS segments (AAC-in-MPEG-TS) under songDir.
 * Requires ffmpeg on PATH.
 */
export async function exportHlsToDirectory(
  sourcePath: string,
  songDir: string,
  config: SongPlaybackConfig,
): Promise<void> {
  await fs.mkdir(songDir, { recursive: true });

  const manifestPath = path.join(songDir, "manifest.m3u8");
  const segmentPattern = path.join(songDir, "seg_%03d.ts");

  const ffmpegArgs = [
    "-y",
    "-i",
    sourcePath,
    ...ffmpegAudioArgs(config),
    "-f",
    "hls",
    "-hls_time",
    "4",
    "-hls_playlist_type",
    "vod",
    "-hls_segment_filename",
    segmentPattern,
    manifestPath,
  ];

  await execFileAsync("ffmpeg", ffmpegArgs, { maxBuffer: 20 * 1024 * 1024 });
}

/** Resize/compress a cover image with ffmpeg (max edge length). */
export async function resizeImageWithFfmpeg(
  sourcePath: string,
  outputPath: string,
  maxEdge: number,
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const scale = `scale='min(${maxEdge},iw)':'min(${maxEdge},ih)':force_original_aspect_ratio=decrease`;
  await execFileAsync("ffmpeg", ["-y", "-i", sourcePath, "-vf", scale, "-q:v", "3", outputPath], {
    maxBuffer: 10 * 1024 * 1024,
  });
}

/**
 * Center-crop to a square, then scale to exact pixel dimensions.
 * Used for artist avatars so circular CSS display is not lopsided.
 */
export async function resizeImageSquareWithFfmpeg(
  sourcePath: string,
  outputPath: string,
  size: number,
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const cropAndScale = `crop='min(iw\\,ih)':'min(iw\\,ih)':'(iw-min(iw\\,ih))/2':'(ih-min(iw\\,ih))/2',scale=${size}:${size}`;
  await execFileAsync("ffmpeg", ["-y", "-i", sourcePath, "-vf", cropAndScale, "-q:v", "3", outputPath], {
    maxBuffer: 10 * 1024 * 1024,
  });
}
