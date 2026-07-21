/**
 * Web Voice Demo — Chromium speechSynthesis voice explorer.
 *
 * Port of demo-code/north-haven-radio-voice-demo. Goal: see which voices Electron's
 * Chromium exposes on this machine, then audition rate/pitch for calm radio-style
 * announcements. Weather scripts use Open-Meteo (North Haven, ME) as live copy.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const PLACE = {
  name: 'North Haven, Maine',
  lat: 44.1304,
  lon: -68.8742,
  tz: 'America/New_York',
} as const;

const WEATHER_API =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${PLACE.lat}&longitude=${PLACE.lon}` +
  `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
  `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=7`;

const WEATHER_CODES: Record<number, string> = {
  0: 'clear',
  1: 'mostly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'foggy',
  48: 'foggy with frost',
  51: 'light drizzle',
  53: 'drizzle',
  55: 'heavy drizzle',
  56: 'light freezing drizzle',
  57: 'freezing drizzle',
  61: 'light rain',
  63: 'rain',
  65: 'heavy rain',
  66: 'light freezing rain',
  67: 'freezing rain',
  71: 'light snow',
  73: 'snow',
  75: 'heavy snow',
  77: 'snow grains',
  80: 'light rain showers',
  81: 'rain showers',
  82: 'heavy rain showers',
  85: 'light snow showers',
  86: 'heavy snow showers',
  95: 'thunderstorms',
  96: 'thunderstorms with light hail',
  99: 'thunderstorms with hail',
};

type VoiceProfile = 'male' | 'female';
type ActivePresenter = VoiceProfile | 'alternate';

type OpenMeteoPayload = {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};

type ProfileSettings = {
  /**
   * Index into the live `voices` array from speechSynthesis.getVoices().
   * Chromium on macOS often gives compact + enhanced the *same* voiceURI
   * (e.g. "Samantha (English (United States))"), so URI lookup cannot tell
   * them apart — only the SpeechSynthesisVoice object at a given index can.
   */
  voiceIndex: number;
  /** Exact `say -v` voice name (e.g. "Samantha (Enhanced)") for native mode. */
  nativeVoiceName: string;
  rate: number;
  pitch: number;
};

/**
 * Which synthesis backend to use.
 *
 * 'web'    — Chromium speechSynthesis. Cannot reach Enhanced/Premium voices
 *            whose display name collides with a compact sibling, because
 *            Chromium resolves the utterance voice by name string.
 * 'native' — macOS `say` via the main process. Addresses voices by their full
 *            unambiguous name ("Samantha (Enhanced)"), so downloads work.
 */
type SpeechEngine = 'web' | 'native';

type NativeVoice = {
  name: string;
  lang: string;
  sample: string;
  enhanced: boolean;
  premium: boolean;
};

/** Indexed wrapper so menus can keep duplicate-URI voices distinct. */
type IndexedVoice = {
  index: number;
  voice: SpeechSynthesisVoice;
};

const MALE_HINTS = [
  'alex',
  'daniel',
  'aaron',
  'fred',
  'tom',
  'evan',
  'reed',
  'david',
  'nathan',
  'noel',
  'oliver',
  'rishi',
  'jamie',
  'male',
];
const FEMALE_HINTS = [
  'samantha',
  'victoria',
  'allison',
  'ava',
  'karen',
  'zira',
  'susan',
  'zoe',
  'nicky',
  'noelle',
  'joelle',
  'siri',
  'female',
];

/** Well-known macOS Siri / Premium voice names when Chromium omits a quality tag. */
const KNOWN_PREMIUM_NAMES = [
  'aaron',
  'allison',
  'ava',
  'evan',
  'joelle',
  'nicky',
  'noel',
  'noelle',
  'zoe',
  'nathan',
  'reed',
  'rishi',
  'stephanie',
  'superstar',
];

type VoiceQuality = 'premium' | 'enhanced' | 'standard';

function conditionLabel(code: number): string {
  return WEATHER_CODES[code] ?? 'mixed conditions';
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function formatTime(withSeconds = false): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: PLACE.tz,
    hour: 'numeric',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
  }).format(new Date());
}

/**
 * Infer quality for menu labels.
 *
 * Prefer Apple identifiers in voiceURI when Chromium exposes them
 * (com.apple.voice.enhanced… / .premium… / .compact…). On Electron/Chromium
 * macOS the URI is often just the display name for every variant of the same
 * voice — then we fall back to name tokens and same-name sibling heuristics.
 */
function voiceQuality(entry: IndexedVoice, siblingsByName: Map<string, number[]>): VoiceQuality {
  const { voice, index } = entry;
  const uri = voice.voiceURI.toLowerCase();
  if (uri.includes('.premium.') || uri.includes('-premium')) return 'premium';
  if (uri.includes('.enhanced.') || uri.includes('-enhanced')) return 'enhanced';
  // Explicit compact marker means the low-quality build — never promote.
  if (uri.includes('.compact.') || uri.includes('-compact')) return 'standard';

  const name = voice.name.toLowerCase();
  if (/\b(premium|neural|natural|online)\b/.test(name)) return 'premium';
  if (/\benhanced\b/.test(name)) return 'enhanced';

  // Chromium duplicate: same display name / URI for compact + enhanced.
  // Later siblings are usually the higher-quality download — surface them in
  // the Enhanced group so both stay visible and auditable.
  const baseName = normalizeVoiceBaseName(voice.name);
  const siblings = siblingsByName.get(baseName) ?? [index];
  if (siblings.length > 1) {
    const ordinal = siblings.indexOf(index);
    if (ordinal > 0) return 'enhanced';
  }

  const bare = baseName.split(/\s+/)[0] ?? '';
  if (KNOWN_PREMIUM_NAMES.includes(bare)) return 'premium';
  return 'standard';
}

/** Strip locale parentheticals: "Samantha (English (United States))" → "samantha". */
function normalizeVoiceBaseName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*/g, ' ').trim().toLowerCase();
}

function buildSiblingIndexMap(voices: SpeechSynthesisVoice[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  voices.forEach((voice, index) => {
    const key = normalizeVoiceBaseName(voice.name);
    const list = map.get(key);
    if (list) list.push(index);
    else map.set(key, [index]);
  });
  return map;
}

function qualityRank(quality: VoiceQuality): number {
  if (quality === 'premium') return 3;
  if (quality === 'enhanced') return 2;
  return 1;
}

/** Prefer US English, higher-quality downloads, and gender name hints. */
function scoreVoice(
  entry: IndexedVoice,
  kind: VoiceProfile,
  siblingsByName: Map<string, number[]>,
): number {
  const name = entry.voice.name.toLowerCase();
  let score = /^en[-_]?us/i.test(entry.voice.lang)
    ? 40
    : /^en/i.test(entry.voice.lang)
      ? 20
      : -60;
  if (entry.voice.localService) score += 8;
  score += qualityRank(voiceQuality(entry, siblingsByName)) * 12;
  for (const hint of kind === 'male' ? MALE_HINTS : FEMALE_HINTS) {
    if (name.includes(hint)) score += 18;
  }
  return score;
}

function pickBestVoiceIndex(
  voices: SpeechSynthesisVoice[],
  kind: VoiceProfile,
  siblingsByName: Map<string, number[]>,
): number {
  if (voices.length === 0) return -1;
  const ranked = voices
    .map((voice, index) => ({
      index,
      score: scoreVoice({ index, voice }, kind, siblingsByName),
    }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.index ?? 0;
}

/** Menu label: quality first; call out same-name Chromium duplicates explicitly. */
function formatVoiceOptionLabel(
  entry: IndexedVoice,
  siblingsByName: Map<string, number[]>,
): string {
  const quality = voiceQuality(entry, siblingsByName);
  const badge =
    quality === 'premium' ? '★ Premium' : quality === 'enhanced' ? '◆ Enhanced' : 'Standard';
  const locale = entry.voice.localService
    ? `${entry.voice.lang} · local`
    : entry.voice.lang;
  const baseName = normalizeVoiceBaseName(entry.voice.name);
  const siblings = siblingsByName.get(baseName) ?? [entry.index];
  const twinNote =
    siblings.length > 1
      ? ` · twin ${siblings.indexOf(entry.index) + 1}/${siblings.length}`
      : '';
  return `${badge} · ${entry.voice.name} — ${locale}${twinNote}`;
}

/**
 * Sort for a gender dropdown: quality first, then gender fit, then name.
 * Keeps newly downloaded / duplicate Enhanced entries at the top.
 */
function rankVoicesForMenu(
  voices: SpeechSynthesisVoice[],
  kind: VoiceProfile,
  siblingsByName: Map<string, number[]>,
): IndexedVoice[] {
  return voices
    .map((voice, index) => ({ index, voice }))
    .sort((a, b) => {
      const qualityDelta =
        qualityRank(voiceQuality(b, siblingsByName)) -
        qualityRank(voiceQuality(a, siblingsByName));
      if (qualityDelta !== 0) return qualityDelta;
      const scoreDelta =
        scoreVoice(b, kind, siblingsByName) - scoreVoice(a, kind, siblingsByName);
      if (scoreDelta !== 0) return scoreDelta;
      return a.voice.name.localeCompare(b.voice.name) || a.index - b.index;
    });
}

type VoiceMenuGroups = {
  premium: IndexedVoice[];
  enhanced: IndexedVoice[];
  standard: IndexedVoice[];
};

function groupVoicesForMenu(
  voices: SpeechSynthesisVoice[],
  kind: VoiceProfile,
  siblingsByName: Map<string, number[]>,
): VoiceMenuGroups {
  const ranked = rankVoicesForMenu(voices, kind, siblingsByName);
  return {
    premium: ranked.filter((entry) => voiceQuality(entry, siblingsByName) === 'premium'),
    enhanced: ranked.filter((entry) => voiceQuality(entry, siblingsByName) === 'enhanced'),
    standard: ranked.filter((entry) => voiceQuality(entry, siblingsByName) === 'standard'),
  };
}

function dayName(date: string, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: PLACE.tz,
  }).format(new Date(`${date}T12:00:00`));
}

const QUICK_LINES = [
  'You’re listening to Song Pages.',
  'A little room to breathe, before the next song.',
  'Here on North Haven, the music will return in just a moment.',
  'That was your moment between. Now, back to the music.',
  'No rush. The next song is ready when you are.',
] as const;

export function WebVoiceDemo() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechStatus, setSpeechStatus] = useState('Voice ready');
  const [weatherStatus, setWeatherStatus] = useState('Weather not loaded');
  const [weather, setWeather] = useState<OpenMeteoPayload | null>(null);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [clock, setClock] = useState(() => formatTime(true));
  const [scriptPreview, setScriptPreview] = useState('Choose an announcement above.');
  const [customText, setCustomText] = useState(
    'Good afternoon. You’re listening from North Haven, Maine. The next song begins in just a moment.',
  );
  const [activeProfile, setActiveProfile] = useState<ActivePresenter>('male');
  const [gentlePauses, setGentlePauses] = useState(true);
  const [engine, setEngine] = useState<SpeechEngine>('web');
  const [nativeVoices, setNativeVoices] = useState<NativeVoice[]>([]);
  const [male, setMale] = useState<ProfileSettings>({
    voiceIndex: -1,
    nativeVoiceName: '',
    rate: 0.88,
    pitch: 0.92,
  });
  const [female, setFemale] = useState<ProfileSettings>({
    voiceIndex: -1,
    nativeVoiceName: '',
    rate: 0.9,
    pitch: 1.0,
  });

  const lastScriptRef = useRef('');
  const alternateRef = useRef(0);
  const voicesBootstrappedRef = useRef(false);
  const nativeBootstrappedRef = useRef(false);

  const nativeAvailable =
    typeof window !== 'undefined' && typeof window.app?.webVoice?.listNativeVoices === 'function';

  /** Native (`say`) voices: English only, Enhanced/Premium floated to the top. */
  const refreshNativeVoices = useCallback(async () => {
    if (!nativeAvailable) return;
    try {
      const result = await window.app.webVoice.listNativeVoices();
      if (!result.ok || !result.data) return;
      const english = result.data
        .filter((voice) => /^en/i.test(voice.lang))
        .sort((a, b) => {
          const rank = (v: NativeVoice) => (v.premium ? 2 : v.enhanced ? 1 : 0);
          return rank(b) - rank(a) || a.name.localeCompare(b.name);
        });
      setNativeVoices(english);
      if (!nativeBootstrappedRef.current && english.length > 0) {
        nativeBootstrappedRef.current = true;
        const bestFor = (hints: readonly string[]) =>
          english.find(
            (voice) =>
              (voice.enhanced || voice.premium) &&
              hints.some((hint) => voice.name.toLowerCase().includes(hint)),
          ) ??
          english.find((voice) => voice.enhanced || voice.premium) ??
          english[0];
        setMale((prev) => ({ ...prev, nativeVoiceName: bestFor(MALE_HINTS).name }));
        setFemale((prev) => ({ ...prev, nativeVoiceName: bestFor(FEMALE_HINTS).name }));
      }
    } catch (error) {
      console.error('[web-voice] native voice list failed', error);
    }
  }, [nativeAvailable]);

  useEffect(() => {
    void refreshNativeVoices();
  }, [refreshNativeVoices]);

  const refreshVoices = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setSpeechStatus('speechSynthesis unavailable');
      setVoices([]);
      return;
    }
    const english = window.speechSynthesis
      .getVoices()
      .filter((voice) => /^en/i.test(voice.lang));
    setVoices(english);
    if (english.length === 0) {
      setSpeechStatus('No English voices found');
      return;
    }
    const siblingsByName = buildSiblingIndexMap(english);
    // Count Chromium same-name twins (compact+enhanced sharing a URI) plus
    // any voices whose URI/name already advertises Premium/Enhanced.
    let premiumCount = 0;
    let enhancedCount = 0;
    let twinGroups = 0;
    english.forEach((voice, index) => {
      const quality = voiceQuality({ index, voice }, siblingsByName);
      if (quality === 'premium') premiumCount += 1;
      if (quality === 'enhanced') enhancedCount += 1;
    });
    for (const indexes of siblingsByName.values()) {
      if (indexes.length > 1) twinGroups += 1;
    }
    const qualityBits = [
      premiumCount > 0 ? `${premiumCount} premium` : null,
      enhancedCount > 0 ? `${enhancedCount} enhanced/twin` : null,
      twinGroups > 0 ? `${twinGroups} duplicate-name groups` : null,
    ].filter(Boolean);
    setSpeechStatus(
      qualityBits.length > 0
        ? `${english.length} voices · ${qualityBits.join(' · ')}`
        : `${english.length} voices found`,
    );
    // Auto-pick defaults once. On later refreshes, only repair stale indexes
    // so the host's intentional voice choices survive.
    if (!voicesBootstrappedRef.current) {
      voicesBootstrappedRef.current = true;
      setMale((prev) => ({
        ...prev,
        voiceIndex: pickBestVoiceIndex(english, 'male', siblingsByName),
      }));
      setFemale((prev) => ({
        ...prev,
        voiceIndex: pickBestVoiceIndex(english, 'female', siblingsByName),
      }));
      return;
    }
    setMale((prev) =>
      prev.voiceIndex >= 0 && prev.voiceIndex < english.length
        ? prev
        : { ...prev, voiceIndex: pickBestVoiceIndex(english, 'male', siblingsByName) },
    );
    setFemale((prev) =>
      prev.voiceIndex >= 0 && prev.voiceIndex < english.length
        ? prev
        : { ...prev, voiceIndex: pickBestVoiceIndex(english, 'female', siblingsByName) },
    );
  }, []);

  useEffect(() => {
    refreshVoices();
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.onvoiceschanged = refreshVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, [refreshVoices]);

  useEffect(() => {
    const tick = () => setClock(formatTime(true));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const loadWeather = useCallback(async () => {
    setWeatherBusy(true);
    setWeatherStatus('Loading weather…');
    try {
      const response = await fetch(WEATHER_API, { cache: 'no-store' });
      if (!response.ok) throw new Error(String(response.status));
      const payload = (await response.json()) as OpenMeteoPayload;
      setWeather(payload);
      setWeatherStatus('Weather updated');
    } catch (error) {
      console.error('[web-voice] weather fetch failed', error);
      setWeather(null);
      setWeatherStatus('Weather error');
    } finally {
      setWeatherBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadWeather();
  }, [loadWeather]);

  const resolveSettings = useCallback(
    (force?: VoiceProfile) => {
      let profile: VoiceProfile =
        force ?? (activeProfile === 'alternate' ? 'male' : activeProfile);
      if (!force && activeProfile === 'alternate') {
        profile = alternateRef.current++ % 2 === 0 ? 'male' : 'female';
      }
      const settings = profile === 'male' ? male : female;
      // Index is authoritative — URI lookup would collapse compact/enhanced twins.
      const voice =
        settings.voiceIndex >= 0 && settings.voiceIndex < voices.length
          ? voices[settings.voiceIndex]
          : (voices[0] ?? null);
      return {
        profile,
        voice,
        voiceIndex: settings.voiceIndex,
        rate: settings.rate,
        pitch: settings.pitch,
      };
    },
    [activeProfile, female, male, voices],
  );

  /** Speak through macOS `say` — the only path that reaches Enhanced twins. */
  const speakNative = useCallback(
    (text: string, force?: VoiceProfile) => {
      let profile: VoiceProfile =
        force ?? (activeProfile === 'alternate' ? 'male' : activeProfile);
      if (!force && activeProfile === 'alternate') {
        profile = alternateRef.current++ % 2 === 0 ? 'male' : 'female';
      }
      const settings = profile === 'male' ? male : female;
      const voiceName =
        settings.nativeVoiceName || nativeVoices[0]?.name || '';
      setSpeechStatus(`Speaking · ${profile} · say · ${voiceName || 'system default'}`);
      window.app.webVoice
        .speakNative({ voice: voiceName, text, rate: settings.rate, pitch: settings.pitch })
        .then((result) => {
          if (!result.ok) {
            setSpeechStatus(`Speech error · ${result.error ?? 'say failed'}`);
            return;
          }
          setSpeechStatus(result.data?.stopped ? 'Stopped' : 'Voice ready');
        })
        .catch((error: unknown) => {
          setSpeechStatus(`Speech error · ${String(error)}`);
        });
    },
    [activeProfile, female, male, nativeVoices],
  );

  const speak = useCallback(
    (text: string, force?: VoiceProfile) => {
      if (!text || typeof window === 'undefined') return;
      const prepared = gentlePauses
        ? text.replace(/:\s+/g, '. ').replace(/;\s+/g, '. ')
        : text;
      if (engine === 'native' && nativeAvailable) {
        window.speechSynthesis?.cancel();
        speakNative(prepared, force);
        return;
      }
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      void window.app?.webVoice?.stopNative?.();
      const settings = resolveSettings(force);
      const utterance = new SpeechSynthesisUtterance(prepared);
      utterance.voice = settings.voice;
      utterance.lang = settings.voice?.lang || 'en-US';
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      // Report index + name + URI so twins with identical URIs are distinguishable.
      utterance.onstart = () =>
        setSpeechStatus(
          `Speaking · ${settings.profile} · [#${settings.voiceIndex}] ${settings.voice?.name ?? 'default'} · ${settings.voice?.voiceURI ?? ''}`,
        );
      utterance.onend = () => setSpeechStatus('Voice ready');
      utterance.onerror = (event) => {
        if (event.error === 'interrupted' || event.error === 'canceled') return;
        setSpeechStatus(`Speech error · ${event.error}`);
      };
      window.speechSynthesis.speak(utterance);
    },
    [engine, gentlePauses, nativeAvailable, resolveSettings, speakNative],
  );

  const say = useCallback(
    (text: string, force?: VoiceProfile) => {
      lastScriptRef.current = text;
      setScriptPreview(text);
      speak(text, force);
    },
    [speak],
  );

  const buildScript = useCallback(
    (action: string): string | null => {
      if (action === 'time') return `The time in North Haven is ${formatTime(false)}.`;
      if (action === 'return') return 'And now, back to the music.';
      if (!weather) {
        say('I could not retrieve the current weather for North Haven. Please refresh the forecast.');
        return null;
      }
      const current = weather.current;
      const daily = weather.daily;
      if (action === 'temperature') {
        const actual = Math.round(current.temperature_2m);
        const feels = Math.round(current.apparent_temperature);
        const feelsClause =
          Math.abs(actual - feels) >= 3 ? ` It feels like ${feels} degrees.` : '';
        return `Right now in North Haven, it is ${actual} degrees and ${conditionLabel(current.weather_code)}.${feelsClause}`;
      }
      if (action === 'today') {
        return (
          `Today in North Haven, expect ${conditionLabel(daily.weather_code[0])}, ` +
          `with a high near ${Math.round(daily.temperature_2m_max[0])} and a low near ${Math.round(daily.temperature_2m_min[0])}. ` +
          `The chance of precipitation is ${daily.precipitation_probability_max[0]} percent.`
        );
      }
      if (action === 'extended') {
        const parts: string[] = [];
        for (let i = 0; i < Math.min(4, daily.time.length); i += 1) {
          parts.push(
            `${dayName(daily.time[i], i)}: ${conditionLabel(daily.weather_code[i])}, ` +
              `with a high of ${Math.round(daily.temperature_2m_max[i])} and a low of ${Math.round(daily.temperature_2m_min[i])}.`,
          );
        }
        return `Here is the outlook for North Haven. ${parts.join(' ')}`;
      }
      if (action === 'full') {
        return (
          `It is ${formatTime(false)} in North Haven. The temperature is ${Math.round(current.temperature_2m)} degrees, ` +
          `with ${conditionLabel(current.weather_code)}. Today’s high will be near ${Math.round(daily.temperature_2m_max[0])}. ` +
          `Tomorrow, expect ${conditionLabel(daily.weather_code[1])}, with a high near ${Math.round(daily.temperature_2m_max[1])}. ` +
          `Now, back to the music.`
        );
      }
      return null;
    },
    [say, weather],
  );

  const temperatureLabel = useMemo(() => {
    if (!weather) return weatherStatus === 'Weather error' ? 'Unavailable' : '—';
    return `${Math.round(weather.current.temperature_2m)}°F`;
  }, [weather, weatherStatus]);

  const conditionsLabel = useMemo(() => {
    if (!weather) return weatherStatus === 'Weather error' ? 'Could not load' : '—';
    return titleCase(conditionLabel(weather.current.weather_code));
  }, [weather, weatherStatus]);

  // Sibling map lets the menus keep Chromium's duplicate-URI twins distinct.
  const siblingsByName = useMemo(() => buildSiblingIndexMap(voices), [voices]);
  const maleVoiceGroups = useMemo(
    () => groupVoicesForMenu(voices, 'male', siblingsByName),
    [siblingsByName, voices],
  );
  const femaleVoiceGroups = useMemo(
    () => groupVoicesForMenu(voices, 'female', siblingsByName),
    [siblingsByName, voices],
  );

  const maleSelectedVoice =
    male.voiceIndex >= 0 && male.voiceIndex < voices.length ? voices[male.voiceIndex] : null;
  const femaleSelectedVoice =
    female.voiceIndex >= 0 && female.voiceIndex < voices.length
      ? voices[female.voiceIndex]
      : null;

  // Same-name Chromium twins (e.g. two Samanthas sharing one voiceURI).
  const twinEntries = useMemo(() => {
    const rows: { name: string; indexes: number[] }[] = [];
    for (const [name, indexes] of siblingsByName) {
      if (indexes.length > 1) rows.push({ name, indexes });
    }
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }, [siblingsByName]);

  const stopSpeech = () => {
    window.speechSynthesis?.cancel();
    void window.app?.webVoice?.stopNative?.();
    setSpeechStatus('Stopped');
  };

  /** Native voice option list: Enhanced/Premium first with badges. */
  const renderNativeVoiceOptions = () => (
    <>
      {nativeVoices.some((voice) => voice.premium || voice.enhanced) ? (
        <optgroup label="★ Enhanced / Premium (downloaded)">
          {nativeVoices
            .filter((voice) => voice.premium || voice.enhanced)
            .map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.premium ? '★ ' : '◆ '}
                {voice.name} — {voice.lang}
              </option>
            ))}
        </optgroup>
      ) : null}
      <optgroup label="Standard">
        {nativeVoices
          .filter((voice) => !voice.premium && !voice.enhanced)
          .map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.name} — {voice.lang}
            </option>
          ))}
      </optgroup>
    </>
  );

  const renderVoiceOptions = (groups: VoiceMenuGroups) => {
    const renderGroup = (entries: IndexedVoice[]) =>
      entries.map((entry) => (
        // Index is the only stable unique key when voiceURI collides.
        <option key={entry.index} value={String(entry.index)}>
          {formatVoiceOptionLabel(entry, siblingsByName)}
        </option>
      ));

    return (
      <>
        {groups.premium.length > 0 ? (
          <optgroup label="★ Premium (downloaded)">{renderGroup(groups.premium)}</optgroup>
        ) : null}
        {groups.enhanced.length > 0 ? (
          <optgroup label="◆ Enhanced / same-name twins (audition both)">
            {renderGroup(groups.enhanced)}
          </optgroup>
        ) : null}
        <optgroup label="Standard">{renderGroup(groups.standard)}</optgroup>
      </>
    );
  };

  return (
    <div className="web-voice panel">
      <header className="web-voice-header">
        <div>
          <p className="web-voice-eyebrow">Song Pages · Between experiment</p>
          <h2>Web Voice Calibration</h2>
          <p className="web-voice-lede">
            Inspect Chromium <code>speechSynthesis</code> voices on this machine, then audition
            calm radio-style copy with live North Haven weather.
          </p>
        </div>
        <div className="web-voice-status">
          <span>{weatherStatus}</span>
          <span>{speechStatus}</span>
        </div>
      </header>

      <section className="web-voice-metrics" aria-label="Live conditions">
        <article>
          <small>North Haven time</small>
          <strong>{clock}</strong>
        </article>
        <article>
          <small>Current temperature</small>
          <strong>{temperatureLabel}</strong>
        </article>
        <article>
          <small>Conditions</small>
          <strong>{conditionsLabel}</strong>
        </article>
      </section>

      <section className="web-voice-panel">
        <div className="web-voice-section-head">
          <div>
            <h3>Voice setup</h3>
            <p>
              Chromium resolves utterance voices by name, so Enhanced downloads that share a name
              with a compact voice (like Samantha) are unreachable from web speech. Switch to the
              native macOS engine to actually use them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              refreshVoices();
              void refreshNativeVoices();
            }}
          >
            Refresh voices
          </button>
        </div>

        {nativeAvailable ? (
          <label className="web-voice-engine">
            Speech engine
            <select
              value={engine}
              onChange={(event) => {
                stopSpeech();
                setEngine(event.target.value as SpeechEngine);
              }}
            >
              <option value="web">Chromium speechSynthesis (web standard)</option>
              <option value="native">macOS native say — reaches Enhanced/Premium voices</option>
            </select>
          </label>
        ) : null}

        {twinEntries.length > 0 ? (
          <div className="web-voice-twins" role="status">
            <strong>Duplicate-name voices Chromium exposed</strong>
            <ul>
              {twinEntries.map((row) => (
                <li key={row.name}>
                  <code>{row.name}</code> — indexes {row.indexes.join(', ')}
                  {row.indexes.map((index) => (
                    <span key={index} className="web-voice-twin-chip">
                      #{index}: {voices[index]?.voiceURI}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="web-voice-voices">
          <article>
            <h4>Male voice</h4>
            <label>
              Installed voice
              {engine === 'native' ? (
                <select
                  value={male.nativeVoiceName}
                  onChange={(event) =>
                    setMale((prev) => ({ ...prev, nativeVoiceName: event.target.value }))
                  }
                >
                  {renderNativeVoiceOptions()}
                </select>
              ) : (
                <select
                  value={male.voiceIndex >= 0 ? String(male.voiceIndex) : ''}
                  onChange={(event) =>
                    setMale((prev) => ({
                      ...prev,
                      voiceIndex: Number(event.target.value),
                    }))
                  }
                >
                  {renderVoiceOptions(maleVoiceGroups)}
                </select>
              )}
            </label>
            {engine === 'native' ? (
              <p className="web-voice-uri" title={male.nativeVoiceName}>
                say voice: <code>{male.nativeVoiceName || 'system default'}</code>
              </p>
            ) : maleSelectedVoice ? (
              <p className="web-voice-uri" title={maleSelectedVoice.voiceURI}>
                index #{male.voiceIndex} · engine id: <code>{maleSelectedVoice.voiceURI}</code>
              </p>
            ) : null}
            <label>
              Rate
              <input
                type="range"
                min={0.72}
                max={1.12}
                step={0.01}
                value={male.rate}
                onChange={(event) => setMale((prev) => ({ ...prev, rate: Number(event.target.value) }))}
              />
              <output>{male.rate.toFixed(2)}</output>
            </label>
            <label>
              Pitch
              <input
                type="range"
                min={0.72}
                max={1.18}
                step={0.01}
                value={male.pitch}
                onChange={(event) =>
                  setMale((prev) => ({ ...prev, pitch: Number(event.target.value) }))
                }
              />
              <output>{male.pitch.toFixed(2)}</output>
            </label>
            <button
              type="button"
              className="web-voice-primary web-voice-audition"
              onClick={() =>
                say(
                  'Good evening. This is a voice calibration for Song Pages. The next song will begin in just a moment.',
                  'male',
                )
              }
            >
              Audition male voice
            </button>
          </article>

          <article>
            <h4>Female voice</h4>
            <label>
              Installed voice
              {engine === 'native' ? (
                <select
                  value={female.nativeVoiceName}
                  onChange={(event) =>
                    setFemale((prev) => ({ ...prev, nativeVoiceName: event.target.value }))
                  }
                >
                  {renderNativeVoiceOptions()}
                </select>
              ) : (
                <select
                  value={female.voiceIndex >= 0 ? String(female.voiceIndex) : ''}
                  onChange={(event) =>
                    setFemale((prev) => ({
                      ...prev,
                      voiceIndex: Number(event.target.value),
                    }))
                  }
                >
                  {renderVoiceOptions(femaleVoiceGroups)}
                </select>
              )}
            </label>
            {engine === 'native' ? (
              <p className="web-voice-uri" title={female.nativeVoiceName}>
                say voice: <code>{female.nativeVoiceName || 'system default'}</code>
              </p>
            ) : femaleSelectedVoice ? (
              <p className="web-voice-uri" title={femaleSelectedVoice.voiceURI}>
                index #{female.voiceIndex} · engine id: <code>{femaleSelectedVoice.voiceURI}</code>
              </p>
            ) : null}
            <label>
              Rate
              <input
                type="range"
                min={0.72}
                max={1.12}
                step={0.01}
                value={female.rate}
                onChange={(event) =>
                  setFemale((prev) => ({ ...prev, rate: Number(event.target.value) }))
                }
              />
              <output>{female.rate.toFixed(2)}</output>
            </label>
            <label>
              Pitch
              <input
                type="range"
                min={0.72}
                max={1.18}
                step={0.01}
                value={female.pitch}
                onChange={(event) =>
                  setFemale((prev) => ({ ...prev, pitch: Number(event.target.value) }))
                }
              />
              <output>{female.pitch.toFixed(2)}</output>
            </label>
            <button
              type="button"
              className="web-voice-primary web-voice-audition"
              onClick={() =>
                say(
                  'Good evening. You’re listening to Song Pages from North Haven, Maine. We’ll return to the music in just a moment.',
                  'female',
                )
              }
            >
              Audition female voice
            </button>
          </article>
        </div>

        <div className="web-voice-controls">
          <label>
            Active presenter
            <select
              value={activeProfile}
              onChange={(event) => setActiveProfile(event.target.value as ActivePresenter)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="alternate">Alternate voices</option>
            </select>
          </label>
          <label className="web-voice-check">
            <input
              type="checkbox"
              checked={gentlePauses}
              onChange={(event) => setGentlePauses(event.target.checked)}
            />
            Add gentle sentence pauses
          </label>
          <button type="button" className="web-voice-danger" onClick={stopSpeech}>
            Stop speech
          </button>
        </div>
      </section>

      <section className="web-voice-panel">
        <div className="web-voice-section-head">
          <div>
            <h3>Live announcements</h3>
            <p>Generated at the moment you press the button.</p>
          </div>
          <button type="button" disabled={weatherBusy} onClick={() => void loadWeather()}>
            Refresh weather
          </button>
        </div>
        <div className="web-voice-buttons">
          {(
            [
              ['time', 'Say the time'],
              ['temperature', 'Say current temperature'],
              ['today', 'Say today’s forecast'],
              ['extended', 'Say longer forecast'],
              ['full', 'Full radio break'],
              ['return', 'Now returning to music'],
            ] as const
          ).map(([action, label]) => (
            <button
              key={action}
              type="button"
              className={action === 'full' ? 'web-voice-primary' : undefined}
              onClick={() => {
                const text = buildScript(action);
                if (text) say(text);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="web-voice-preview">
          <div className="web-voice-section-head">
            <h4>Last generated script</h4>
            <button
              type="button"
              onClick={() => {
                if (lastScriptRef.current) speak(lastScriptRef.current);
              }}
            >
              Speak again
            </button>
          </div>
          <p>{scriptPreview}</p>
        </div>
      </section>

      <section className="web-voice-panel">
        <h3>Quick lines</h3>
        <div className="web-voice-quick">
          {QUICK_LINES.map((line) => (
            <button key={line} type="button" onClick={() => say(line)}>
              {line.length > 42 ? `${line.slice(0, 40)}…` : line}
            </button>
          ))}
        </div>
        <label>
          Custom line
          <textarea
            rows={3}
            value={customText}
            onChange={(event) => setCustomText(event.target.value)}
          />
        </label>
        <button type="button" className="web-voice-primary" onClick={() => say(customText)}>
          Speak custom line
        </button>
      </section>

      <footer className="web-voice-footer">
        Weather data: Open-Meteo. Voice quality depends on voices installed on this computer.
        Suggested starting points — male rate 0.84–0.92 / pitch 0.88–0.96; female rate 0.86–0.94 /
        pitch 0.96–1.03.
      </footer>
    </div>
  );
}
