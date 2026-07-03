import { VcGrid } from './VcGrid';
import { VcOverlays } from './VcOverlays';
import { useVcWindowState } from './useVcWindowState';

/** VC Mode display surface — grid mixer + host hotkey overlays. */
export function VcWindowApp() {
  const { state, frequencyData, frame, canvasFrame, activeOverlay, praiseToken } = useVcWindowState();

  if (!state) {
    return (
      <div className="vc-window-shell vc-window-waiting">
        <p>VC Mode — waiting for Song Pages…</p>
        <p className="vc-window-hint">Start VC Mode from the main window while a song is playing.</p>
      </div>
    );
  }

  return (
    <div className="vc-window-shell">
      <VcGrid state={state} frequencyData={frequencyData} frame={frame} canvasFrame={canvasFrame} />
      <VcOverlays state={state} activeOverlay={activeOverlay} praiseToken={praiseToken} />
    </div>
  );
}
