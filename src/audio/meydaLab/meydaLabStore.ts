/**
 * Meyda Lab visibility — mirror of Effects Lab store.
 * Read-only analysis playground; does not mutate DSP.
 */

import { useEffect } from 'react';

const PANEL_KEY = 'songpages:meyda-lab-panel';

export const meydaLabStore = {
  isPanelVisible(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(PANEL_KEY) === '1';
  },

  setPanelVisible(visible: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PANEL_KEY, visible ? '1' : '0');
    window.dispatchEvent(new Event('songpages-meyda-lab-changed'));
  },

  togglePanelVisible(): boolean {
    const next = !this.isPanelVisible();
    this.setPanelVisible(next);
    return next;
  },
};

/** ⌘⌃⌥M / Ctrl+Alt+M — Debug menu when installed. */
export function useMeydaLabHotkey(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const mod = event.metaKey || event.ctrlKey;
      // Match Effects Lab style: require Ctrl+Alt (and Meta on Mac often doubles as mod).
      if (!mod || !event.altKey || !event.ctrlKey || event.shiftKey) return;
      if (event.code !== 'KeyM') return;
      event.preventDefault();
      meydaLabStore.togglePanelVisible();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
