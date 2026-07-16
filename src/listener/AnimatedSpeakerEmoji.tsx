import { useEffect, useState } from 'react';

/** Frames for a soft volume pulse — off → mid → full. */
const SPEAKER_FRAMES = ['🔈', '🔉', '🔊'] as const;
/** Queued / paused current track — present but not actively outputting. */
const SPEAKER_PAUSED = '🔈';
const SPEAKER_PLAYING_STATIC = '🔊';
const FRAME_MS = 624;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type AnimatedSpeakerEmojiProps = {
  className?: string;
  /** When false, render nothing (caller may keep layout stable another way). */
  active?: boolean;
  /**
   * When true, cycle 🔈→🔉→🔊. When false (queued but paused), show static 🔈.
   * Defaults to true so callers that only mark “current” still get a glyph.
   */
  animating?: boolean;
};

/**
 * Prepend-friendly speaker glyph for the current queue item.
 * Playing: cycles 🔈 → 🔉 → 🔊 (or static 🔊 with reduced motion).
 * Paused / queued: static 🔈.
 */
export function AnimatedSpeakerEmoji({
  className,
  active = true,
  animating = true,
}: AnimatedSpeakerEmojiProps) {
  const [frame, setFrame] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(prefersReducedMotion);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduceMotion(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!active || !animating || reduceMotion) return;
    const id = window.setInterval(() => {
      setFrame((n) => (n + 1) % SPEAKER_FRAMES.length);
    }, FRAME_MS);
    return () => window.clearInterval(id);
  }, [active, animating, reduceMotion]);

  if (!active) return null;

  const glyph = !animating
    ? SPEAKER_PAUSED
    : reduceMotion
      ? SPEAKER_PLAYING_STATIC
      : SPEAKER_FRAMES[frame];

  return (
    <span className={className} aria-hidden="true">
      {glyph}
    </span>
  );
}

/** Compact static speaker for dense UI (collapsed sidebar rail). */
export function SpeakerIconGlyph({
  className,
  animating = true,
}: {
  className?: string;
  animating?: boolean;
}) {
  return (
    <span
      className={className}
      aria-hidden="true"
      title={animating ? 'Now playing from this playlist' : 'Queued from this playlist (paused)'}
    >
      {animating ? SPEAKER_PLAYING_STATIC : SPEAKER_PAUSED}
    </span>
  );
}
