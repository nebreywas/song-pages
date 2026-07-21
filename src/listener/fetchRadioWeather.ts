/**
 * Fetches Open-Meteo conditions for Radio Mode announcements (ZIP 04032 demo).
 */

import {
  RADIO_WEATHER_PLACE,
  type RadioWeatherSnapshot,
} from '@shared/listener/radioMode';

type OpenMeteoRadioPayload = {
  current?: { temperature_2m?: number };
  daily?: {
    temperature_2m_max?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
};

const WEATHER_API =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${RADIO_WEATHER_PLACE.lat}&longitude=${RADIO_WEATHER_PLACE.lon}` +
  `&current=temperature_2m` +
  `&daily=temperature_2m_max,sunrise,sunset` +
  `&temperature_unit=fahrenheit&timezone=${encodeURIComponent(RADIO_WEATHER_PLACE.tz)}` +
  `&forecast_days=1`;

let cached: { at: number; snapshot: RadioWeatherSnapshot } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

/** Cached weather snapshot for announcer copy (refreshes about every 10 minutes). */
export async function fetchRadioWeatherSnapshot(): Promise<RadioWeatherSnapshot | null> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.snapshot;
  }

  try {
    const response = await fetch(WEATHER_API, { cache: 'no-store' });
    if (!response.ok) return cached?.snapshot ?? null;
    const payload = (await response.json()) as OpenMeteoRadioPayload;
    const snapshot: RadioWeatherSnapshot = {
      currentTempF:
        typeof payload.current?.temperature_2m === 'number'
          ? payload.current.temperature_2m
          : null,
      highTempF:
        typeof payload.daily?.temperature_2m_max?.[0] === 'number'
          ? payload.daily.temperature_2m_max[0]
          : null,
      sunriseIso: payload.daily?.sunrise?.[0] ?? null,
      sunsetIso: payload.daily?.sunset?.[0] ?? null,
    };
    cached = { at: Date.now(), snapshot };
    return snapshot;
  } catch (error) {
    console.error('[radio] weather fetch failed', error);
    return cached?.snapshot ?? null;
  }
}
