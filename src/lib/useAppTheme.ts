import { useCallback, useEffect, useState } from 'react';
import { getApp } from './bridge';
import {
  applyAppTheme,
  isAppThemeId,
  THEME_SETTING_KEY,
  type AppThemeId,
} from './themes';

export function useAppTheme() {
  const [theme, setThemeState] = useState<AppThemeId>('midnight');

  useEffect(() => {
    const app = getApp();
    if (!app) {
      applyAppTheme('midnight');
      return;
    }

    void app.getSettings(THEME_SETTING_KEY).then((value) => {
      const nextTheme = isAppThemeId(value) ? value : 'midnight';
      applyAppTheme(nextTheme);
      setThemeState(nextTheme);
    });
  }, []);

  const setTheme = useCallback(async (nextTheme: AppThemeId) => {
    applyAppTheme(nextTheme);
    setThemeState(nextTheme);

    const app = getApp();
    if (!app) return;
    await app.saveSettings(THEME_SETTING_KEY, nextTheme);
  }, []);

  return { theme, setTheme };
}
