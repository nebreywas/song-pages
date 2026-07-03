type ButterchurnMirrorViewProps = {
  canvasFrame: string | null;
};

/** Projection/VC surface — displays Butterchurn frames mirrored from the main window. */
export function ButterchurnMirrorView({ canvasFrame }: ButterchurnMirrorViewProps) {
  if (!canvasFrame) {
    return (
      <div className="visualizer-host visualizer-host-empty">
        <p>Waiting for Butterchurn stream…</p>
      </div>
    );
  }

  return (
    <div className="visualizer-host visualizer-host-window visualizer-butterchurn-mirror-view">
      <img src={canvasFrame} alt="" className="visualizer-butterchurn-mirror-image" />
    </div>
  );
}
