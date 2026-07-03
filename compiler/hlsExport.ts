import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type SongPlaybackScope = "full" | "preview";
export type SongPlaybackPreviewSeconds = 30 | 45 | 60;

/** Legacy draft values — compile always uses the single Song Pages standard profile. */
export type SongPlaybackQuality = "standard" | "high" | "degraded";

export type SongPlaybackConfig = {
  quality?: SongPlaybackQuality;
  scope: SongPlaybackScope;
  previewSeconds: SongPlaybackPreviewSeconds;
};

/**
 * Song Pages default VOD HLS audio profile.
 * AAC-LC stereo @ 96 kbps, 6s MPEG-TS segments, independent segments, no loudness/EQ processing.
 */
export const SONG_PAGES_HLS_PROFILE = {
  codec: "aac",
  profile: "aac_low",
  bitrate: "96k",
  channels: 2,
  segmentSeconds: 6,
  playlistType: "vod",
  segmentType: "mpegts",
  hlsFlags: "independent_segments",
  supportedSampleRates: [44100, 48000] as const,
} as const;

/** Map legacy per-song quality settings to the single published profile label. */
export function normalizePlaybackQuality(_quality?: SongPlaybackQuality): "standard" {
  return "standard";
}

function buildHlsEncodeArgs(config: SongPlaybackConfig, sampleRate?: number): string[] {
  const args: string[] = ["-vn", "-sn", "-dn", "-map", "0:a:0"];

  if (config.scope === "preview") {
    args.push("-t", String(config.previewSeconds));
  }

  // Transcode only — no loudness normalization, EQ, or other audio filters.
  args.push(
    "-c:a",
    SONG_PAGES_HLS_PROFILE.codec,
    "-profile:a",
    SONG_PAGES_HLS_PROFILE.profile,
    "-b:a",
    SONG_PAGES_HLS_PROFILE.bitrate,
    "-ac",
    String(SONG_PAGES_HLS_PROFILE.channels),
  );

  if (sampleRate === 44100 || sampleRate === 48000) {
    args.push("-ar", String(sampleRate));
  }

  return args;
}

function buildHlsMuxArgs(songDir: string): { manifestPath: string; muxArgs: string[] } {
  const manifestPath = path.join(songDir, "manifest.m3u8");
  const segmentPattern = path.join(songDir, "seg_%03d.ts");

  const muxArgs = [
    "-f",
    "hls",
    "-hls_time",
    String(SONG_PAGES_HLS_PROFILE.segmentSeconds),
    "-hls_playlist_type",
    SONG_PAGES_HLS_PROFILE.playlistType,
    "-hls_list_size",
    "0",
    "-hls_flags",
    SONG_PAGES_HLS_PROFILE.hlsFlags,
    "-hls_segment_type",
    SONG_PAGES_HLS_PROFILE.segmentType,
    "-hls_segment_filename",
    segmentPattern,
    manifestPath,
  ];

  return { manifestPath, muxArgs };
}

async function resolveOutputSampleRate(sourcePath: string): Promise<number | undefined> {
  const rate = await probeAudioSampleRate(sourcePath);
  if (rate === 44100 || rate === 48000) {
    return rate;
  }
  return undefined;
}

/**
 * Slice mastered source audio into Song Pages standard HLS VOD segments under songDir.
 * Requires ffmpeg on PATH.
 */
export async function exportHlsToDirectory(
  sourcePath: string,
  songDir: string,
  config: SongPlaybackConfig,
): Promise<void> {
  await fs.mkdir(songDir, { recursive: true });

  const sampleRate = await resolveOutputSampleRate(sourcePath);
  const { muxArgs } = buildHlsMuxArgs(songDir);

  const ffmpegArgs = [
    "-y",
    "-i",
    sourcePath,
    ...buildHlsEncodeArgs(config, sampleRate),
    ...muxArgs,
  ];

  await execFileAsync("ffmpeg", ffmpegArgs, { maxBuffer: 20 * 1024 * 1024 });
}

/** Read the first audio stream sample rate (Hz) via ffprobe. */
export async function probeAudioSampleRate(sourcePath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=sample_rate",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        sourcePath,
      ],
      { maxBuffer: 1024 * 1024 },
    );
    const rate = Number.parseInt(String(stdout).trim(), 10);
    if (!Number.isFinite(rate) || rate <= 0) {
      return null;
    }
    return rate;
  } catch {
    return null;
  }
}

/** Read source audio duration in whole seconds via ffprobe (requires ffprobe on PATH). */
export async function probeAudioDurationSeconds(sourcePath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        sourcePath,
      ],
      { maxBuffer: 1024 * 1024 },
    );
    const seconds = Number.parseFloat(String(stdout).trim());
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return null;
    }
    return Math.round(seconds);
  } catch {
    return null;
  }
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

/** Center-crop to 1200×630 for social share cards (Open Graph / Twitter). */
export async function resizeShareCardWithFfmpeg(sourcePath: string, outputPath: string): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const vf = "scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630";
  await execFileAsync("ffmpeg", ["-y", "-i", sourcePath, "-vf", vf, "-q:v", "3", outputPath], {
    maxBuffer: 10 * 1024 * 1024,
  });
}

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
