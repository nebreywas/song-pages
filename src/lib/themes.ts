export type AppThemeId =
  | 'midnight'
  | 'slate'
  | 'ocean'
  | 'forest'
  | 'burgundy'
  | 'light'
  | 'hotpink';

export const THEME_SETTING_KEY = 'ui.theme';

export type AppThemeOption = {
  id: AppThemeId;
  emoji: string;
  label: string;
  description: string;
};

export const APP_THEME_OPTIONS: AppThemeOption[] = [
  { id: 'midnight', emoji: '🌑', label: 'Midnight', description: 'Deep charcoal and blue accents' },
  { id: 'slate', emoji: '🌙', label: 'Slate', description: 'Softer blues and grays' },
  { id: 'ocean', emoji: '🌊', label: 'Ocean', description: 'Teals and deep blues' },
  { id: 'forest', emoji: '🌲', label: 'Forest', description: 'Greens and charcoal' },
  { id: 'burgundy', emoji: '🍷', label: 'Burgundy', description: 'Wine reds and dusk' },
  { id: 'light', emoji: '☀️', label: 'Light', description: 'For people who hate dark mode' },
  { id: 'hotpink', emoji: '💗', label: 'Hotpink', description: 'Bold pink on dark plum' },
];

const VALID_THEME_IDS = new Set<string>(APP_THEME_OPTIONS.map((theme) => theme.id));

export function isAppThemeId(value: unknown): value is AppThemeId {
  return typeof value === 'string' && VALID_THEME_IDS.has(value);
}

/** Apply theme tokens to the document root. */
export function applyAppTheme(themeId: AppThemeId): void {
  document.documentElement.setAttribute('data-theme', themeId);
  document.documentElement.style.colorScheme = themeId === 'light' ? 'light' : 'dark';
}
