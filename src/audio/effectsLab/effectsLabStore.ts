import { useEffect } from 'react';

const PANEL_KEY = 'songpages:effects-lab-panel';

export const effectsLabStore = {
  isPanelVisible(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(PANEL_KEY) === '1';
  },

  setPanelVisible(visible: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PANEL_KEY, visible ? '1' : '0');
    window.dispatchEvent(new Event('songpages-effects-lab-changed'));
  },

  togglePanelVisible(): boolean {
    const next = !this.isPanelVisible();
    this.setPanelVisible(next);
    return next;
  },
};

/** ⌘⌃⌥E / Ctrl+Alt+E — matches Debug menu when dev menu is installed. */
export function useEffectsLabHotkey(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || !event.altKey || !event.ctrlKey || event.shiftKey) return;
      if (event.code !== 'KeyE') return;
      event.preventDefault();
      effectsLabStore.togglePanelVisible();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
