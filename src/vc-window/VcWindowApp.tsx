import { VcOverlays } from './VcOverlays';
import { VcSurface } from './VcSurface';
import { useHostContentCatalog } from './useHostContentCatalog';
import { useVcPlaybackAudio } from './useVcPlaybackAudio';
import { useVcWindowState } from './useVcWindowState';

/** VC Mode display surface — template areas + floats + host hotkey overlays. */
export function VcWindowApp() {
  const { state, frequencyData, frame, canvasFrame, activeOverlay, praiseToken, debugOutlines } =
    useVcWindowState();
  const { catalog: hostCatalog } = useHostContentCatalog();
  const playbackAudioRef = useVcPlaybackAudio(state);

  return (
    <>
      {/* Always mounted so mirrored playback can start as soon as state arrives. */}
      <audio
        ref={playbackAudioRef}
        className="vc-playback-audio"
        preload="auto"
        aria-hidden="true"
      />
      {!state ? (
        <div className="vc-window-shell vc-window-waiting">
          <p>VC Mode — waiting for Song Pages…</p>
          <p className="vc-window-hint">Start VC Mode from the main window while a song is playing.</p>
        </div>
      ) : (
        <div className="vc-window-shell">
          <VcSurface
            state={state}
            hostCatalog={hostCatalog}
            frequencyData={frequencyData}
            frame={frame}
            canvasFrame={canvasFrame}
            debugOutlines={debugOutlines}
          />
          <VcOverlays state={state} activeOverlay={activeOverlay} praiseToken={praiseToken} />
        </div>
      )}
    </>
  );
}
