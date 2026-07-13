import { useEffect, useState } from 'react';
import type { AppMode } from './types/app';
import { BridgeRequired } from './components/BridgeRequired';
import { SettingsModal } from './components/SettingsModal';
import { getApp } from './lib/bridge';
import { useAppTheme } from './lib/useAppTheme';
import { usePlaylistLengthSettings } from './listener/usePlaylistLengthSettings';
import { useAudioDebugHotkey } from './audio/debug/AudioDebugPanel';
import { useEffectsLabHotkey } from './audio/effectsLab/effectsLabStore';
import { ListenerMode } from './listener/ListenerMode';
import { ArtistMode } from './artist/ArtistMode';
import { DeveloperMode } from './developer/DeveloperMode';
import { AboutMode } from './about/AboutMode';

export default function App() {
  const [mode, setMode] = useState<AppMode>('listener');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, setTheme } = useAppTheme();
  const playlistLength = usePlaylistLengthSettings();

  useEffect(() => {
    const app = getApp();
    if (!app?.onNavigate) return;
    return app.onNavigate((nextMode) => setMode(nextMode));
  }, []);

  useEffect(() => {
    const app = getApp();
    if (!app?.onOpenSettings) return;
    return app.onOpenSettings(() => setSettingsOpen(true));
  }, []);

  useAudioDebugHotkey();
  useEffectsLabHotkey();

  return (
    <div className="app-root">
      {mode !== 'listener' ? (
        <header className="app-header">
          <h1 className="app-title">Song Pages</h1>
        </header>
      ) : null}

      <main className="app-main">
        <BridgeRequired>
          {mode === 'listener' ? <ListenerMode onOpenSettings={() => setSettingsOpen(true)} /> : null}
          {mode === 'artist' ? <ArtistMode /> : null}
          {mode === 'developer' ? <DeveloperMode /> : null}
          {mode === 'about' ? <AboutMode /> : null}
        </BridgeRequired>
      </main>

      <SettingsModal
        open={settingsOpen}
        theme={theme}
        onThemeChange={setTheme}
        playlistLengthSettings={playlistLength.settings}
        onPlaylistLengthSettingsChange={playlistLength.persist}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
