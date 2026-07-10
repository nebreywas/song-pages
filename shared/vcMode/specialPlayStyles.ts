/** VC Mode playback pacing — pause between songs for host commentary. */

export type VcSpecialPlayStyle = 'normal' | 'pause-end' | 'pause-30' | 'pause-60' | 'pause-90';

export type VcSpecialPlayStyleSettings = {
  style: VcSpecialPlayStyle;
  /** Red countdown badge on the VC projection surface. */
  showCountdownOnSurface: boolean;
  /** Large counter in the VC Controller dynamic footer. */
  showCountdownOnController: boolean;
};

export type VcSpecialPlayPauseState = {
  active: boolean;
  /** Epoch ms when timed pause ends; null = host must press Play Next. */
  endsAt: number | null;
  secondsRemaining: number | null;
};

export const VC_SPECIAL_PLAY_STYLE_OPTIONS: Array<{ value: VcSpecialPlayStyle; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'pause-end', label: 'Pause after each song' },
  { value: 'pause-30', label: 'Pause for 30 seconds after each song' },
  { value: 'pause-60', label: 'Pause for 60 seconds after each song' },
  { value: 'pause-90', label: 'Pause for 90 seconds after each song' },
];

export const DEFAULT_SPECIAL_PLAY_STYLE_SETTINGS: VcSpecialPlayStyleSettings = {
  style: 'normal',
  showCountdownOnSurface: false,
  showCountdownOnController: true,
};

const STYLE_SET = new Set<string>(VC_SPECIAL_PLAY_STYLE_OPTIONS.map((row) => row.value));

export function sanitizeSpecialPlayStyleSettings(raw: unknown): VcSpecialPlayStyleSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SPECIAL_PLAY_STYLE_SETTINGS };
  const value = raw as Record<string, unknown>;
  const style =
    typeof value.style === 'string' && STYLE_SET.has(value.style)
      ? (value.style as VcSpecialPlayStyle)
      : DEFAULT_SPECIAL_PLAY_STYLE_SETTINGS.style;
  return {
    style,
    showCountdownOnSurface: value.showCountdownOnSurface === true,
    showCountdownOnController: value.showCountdownOnController !== false,
  };
}

/** Seconds for timed pause styles; null when host-controlled or normal playback. */
export function specialPlayPauseSeconds(style: VcSpecialPlayStyle): number | null {
  switch (style) {
    case 'pause-30':
      return 30;
    case 'pause-60':
      return 60;
    case 'pause-90':
      return 90;
    default:
      return null;
  }
}

export function isSpecialPlayStyleActive(style: VcSpecialPlayStyle): boolean {
  return style !== 'normal';
}
