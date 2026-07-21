/**
 * Listener Radio Mode — between-song announcement breaks.
 *
 * Sequence (radio only):
 *   2.5s silence → announcement → 2.5s silence → next track
 *
 * When Radio and Zen both fire on the same natural end, the announcement is
 * inserted directly into the split Zen silence. Radio does not add its own
 * silence because the Zen halves already provide spacing:
 *   (zen/2) → announcement → (zen/2) → next track
 *
 * See documentation/web-voice-and-macos-tts.md for voice-engine notes.
 */

import {
  normalizeRadioVoiceId,
  type RadioVoiceId,
} from './radioVoices';

export const RADIO_PRE_SILENCE_SECONDS = 2.5;
export const RADIO_POST_SILENCE_SECONDS = 2.5;
/** Starter: coin-flip whether a completed song gets a radio break. */
export const RADIO_BREAK_PROBABILITY = 0.5;

/** Freeport, ME (ZIP 04032) — Open-Meteo coords for demo weather / sun times. */
export const RADIO_WEATHER_PLACE = {
  zip: '04032',
  name: 'Freeport, Maine',
  lat: 43.857,
  lon: -70.1031,
  tz: 'America/New_York',
} as const;

export type RadioAnnouncementKind =
  | 'time'
  | 'temperature'
  | 'listening'
  | 'sunset'
  | 'sunrise'
  | 'high'
  | 'date';

export const RADIO_ANNOUNCEMENT_KINDS: readonly RadioAnnouncementKind[] = [
  'time',
  'temperature',
  'listening',
  'sunset',
  'sunrise',
  'high',
  'date',
] as const;

export type RadioWeatherSnapshot = {
  currentTempF: number | null;
  highTempF: number | null;
  sunriseIso: string | null;
  sunsetIso: string | null;
};

export type RadioBreakSegment =
  | {
      kind: 'silence';
      durationSeconds: number;
      /** Now Playing title while this segment runs. */
      title: string;
    }
  | {
      kind: 'speak';
      text: string;
      title: string;
    };

/** Coin-flip whether this completed song should get a radio break. */
export function shouldStartRadioBreak(
  random: () => number = Math.random,
  probability: number = RADIO_BREAK_PROBABILITY,
): boolean {
  return random() < probability;
}

export function pickRadioAnnouncementKind(
  random: () => number = Math.random,
): RadioAnnouncementKind {
  const index = Math.min(
    RADIO_ANNOUNCEMENT_KINDS.length - 1,
    Math.floor(random() * RADIO_ANNOUNCEMENT_KINDS.length),
  );
  return RADIO_ANNOUNCEMENT_KINDS[index] ?? 'listening';
}

/**
 * Spoken clock: "3 oh 5 P M" — minutes use "oh" for a leading zero, never "zero".
 */
export function formatSpokenClock(
  date: Date = new Date(),
  timeZone: string = RADIO_WEATHER_PLACE.tz,
): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === 'hour')?.value ?? '12';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  const dayPeriod = (parts.find((part) => part.type === 'dayPeriod')?.value ?? 'PM').toUpperCase();
  const periodSpoken = dayPeriod.split('').join(' ');

  const minuteNum = Number(minute);
  let minuteSpoken: string;
  if (minuteNum === 0) {
    minuteSpoken = "o'clock";
  } else if (minuteNum < 10) {
    minuteSpoken = `oh ${minuteNum}`;
  } else {
    minuteSpoken = String(minuteNum);
  }

  if (minuteNum === 0) {
    return `${hour} ${minuteSpoken} ${periodSpoken}`;
  }
  return `${hour} ${minuteSpoken} ${periodSpoken}`;
}

/** "July 19" — month name + day, no year. */
export function formatSpokenDate(
  date: Date = new Date(),
  timeZone: string = RADIO_WEATHER_PLACE.tz,
): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/** Speakable sun time from an Open-Meteo ISO timestamp. */
export function formatSpokenSunTime(
  iso: string | null | undefined,
  timeZone: string = RADIO_WEATHER_PLACE.tz,
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return formatSpokenClock(date, timeZone);
}

export function buildRadioAnnouncementText(
  kind: RadioAnnouncementKind,
  weather: RadioWeatherSnapshot | null,
  now: Date = new Date(),
): string {
  switch (kind) {
    case 'time':
      return `The time is ${formatSpokenClock(now)}.`;
    case 'temperature': {
      const temp = weather?.currentTempF;
      if (temp == null || !Number.isFinite(temp)) {
        return 'The current temperature is unavailable right now.';
      }
      return `The current temperature is ${Math.round(temp)} degrees.`;
    }
    case 'listening':
      return "You're listening to your music using Song Pages. And now, back to your music.";
    case 'sunset': {
      const spoken = formatSpokenSunTime(weather?.sunsetIso);
      if (!spoken) return 'Sunset time is unavailable right now.';
      // Short pause via sentence break — native/web TTS naturally breathes here.
      return `Sunset today. ${spoken}.`;
    }
    case 'sunrise': {
      const spoken = formatSpokenSunTime(weather?.sunriseIso);
      if (!spoken) return 'Sunrise time is unavailable right now.';
      return `Sunrise today. ${spoken}.`;
    }
    case 'high': {
      const high = weather?.highTempF;
      if (high == null || !Number.isFinite(high)) {
        return "Today's high temperature is unavailable right now.";
      }
      return `Today's high temperature will be ${Math.round(high)} degrees.`;
    }
    case 'date':
      return `Today is ${formatSpokenDate(now)}.`;
    default:
      return "You're listening to your music using Song Pages. And now, back to your music.";
  }
}

/** Keep the complete interlude represented as one pseudo-track in Now Playing. */
export function radioAnnouncementTitle(_kind: RadioAnnouncementKind): string {
  return 'Radio Break';
}

/**
 * Build a radio-only break, or splice its announcement into split Zen silence.
 * In a combined break, omitting Radio's own silence preserves the selected
 * total Zen duration instead of unexpectedly extending it.
 */
export function buildRadioBreakSegments(options: {
  announcementText: string;
  announcementKind: RadioAnnouncementKind;
  /** When set, Zen silence is split before/after the radio break. */
  zenSilenceSeconds?: number | null;
}): RadioBreakSegment[] {
  const speakTitle = radioAnnouncementTitle(options.announcementKind);
  const radioCore: RadioBreakSegment[] = [
    {
      kind: 'silence',
      durationSeconds: RADIO_PRE_SILENCE_SECONDS,
      // Radio-only padding belongs to the Radio Break pseudo-track. Only Zen
      // silence should expose its duration as the Now Playing title.
      title: speakTitle,
    },
    {
      kind: 'speak',
      text: options.announcementText,
      title: speakTitle,
    },
    {
      kind: 'silence',
      durationSeconds: RADIO_POST_SILENCE_SECONDS,
      title: speakTitle,
    },
  ];

  const zenTotal = options.zenSilenceSeconds;
  if (zenTotal == null || !(zenTotal > 0)) {
    return radioCore;
  }

  const firstHalf = Math.max(1, Math.floor(zenTotal / 2));
  const secondHalf = Math.max(1, Math.ceil(zenTotal / 2));
  return [
    {
      kind: 'silence',
      durationSeconds: firstHalf,
      title: `${firstHalf} seconds of Silence…`,
    },
    {
      kind: 'speak',
      text: options.announcementText,
      title: speakTitle,
    },
    {
      kind: 'silence',
      durationSeconds: secondHalf,
      title: `${secondHalf} seconds of Silence…`,
    },
  ];
}

export function normalizeRadioVoiceSetting(raw: unknown): RadioVoiceId {
  return normalizeRadioVoiceId(raw);
}
