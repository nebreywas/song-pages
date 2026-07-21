import { useEffect, useState } from 'react';
import type { AppMode } from './types/app';
import { BridgeRequired } from './components/BridgeRequired';
import { SettingsModal } from './components/SettingsModal';
import { getApp } from './lib/bridge';
import { useAppTheme } from './lib/useAppTheme';
import { usePlaylistLengthSettings } from './listener/usePlaylistLengthSettings';
import { useListenerPlayerSettings } from './listener/useListenerPlayerSettings';
import { useLiveDebugSettings } from './live-debug/useLiveDebugSettings';
import { useAudioDebugHotkey } from './audio/debug/AudioDebugPanel';
import { useEffectsLabHotkey } from './audio/effectsLab/effectsLabStore';
import { useMeydaLabHotkey } from './audio/meydaLab/meydaLabStore';
import { ListenerMode } from './listener/ListenerMode';
import { ArtistMode } from './artist/ArtistMode';
import { Artist2Mode } from './artist2/Artist2Mode';
import { DeveloperMode } from './developer/DeveloperMode';
import { AboutMode } from './about/AboutMode';
import { PrettyLyricsLab } from './pretty-lyrics/PrettyLyricsLab';
import { WebVoiceDemo } from './web-voice/WebVoiceDemo';

function appHeaderTitle(mode: AppMode): string {
  if (mode === 'artist2') return 'Song Pages: Artist 2.0';
  if (mode === 'web-voice') return 'Song Pages: Web Voice Demo';
  return 'Song Pages';
}

export default function App() {
  const [mode, setMode] = useState<AppMode>('listener');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, setTheme } = useAppTheme();
  const playlistLength = usePlaylistLengthSettings();
  const playerSettings = useListenerPlayerSettings();
  const liveDebug = useLiveDebugSettings();

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

  useEffect(() => {
    document.title = appHeaderTitle(mode);
  }, [mode]);

  useAudioDebugHotkey();
  useEffectsLabHotkey();
  useMeydaLabHotkey();

  return (
    <div className="app-root">
      {/* Artist 2.0 owns its own title row (artist switcher / compile sit flush right). */}
      {mode !== 'listener' && mode !== 'artist2' ? (
        <header className="app-header">
          <h1 className="app-title">{appHeaderTitle(mode)}</h1>
        </header>
      ) : null}

      <main className="app-main">
        <BridgeRequired>
          {mode === 'listener' ? <ListenerMode onOpenSettings={() => setSettingsOpen(true)} /> : null}
          {mode === 'artist' ? <ArtistMode /> : null}
          {mode === 'artist2' ? <Artist2Mode /> : null}
          {mode === 'developer' ? <DeveloperMode /> : null}
          {mode === 'pretty-lyrics' ? <PrettyLyricsLab /> : null}
          {mode === 'web-voice' ? <WebVoiceDemo /> : null}
          {mode === 'about' ? <AboutMode /> : null}
        </BridgeRequired>
      </main>

      <SettingsModal
        open={settingsOpen}
        theme={theme}
        onThemeChange={setTheme}
        playlistLengthSettings={playlistLength.settings}
        onPlaylistLengthSettingsChange={playlistLength.persist}
        playerSettings={playerSettings.settings}
        onPlayerSettingsChange={playerSettings.persist}
        liveDebugSettings={liveDebug.settings}
        onLiveDebugSettingsChange={liveDebug.persist}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
