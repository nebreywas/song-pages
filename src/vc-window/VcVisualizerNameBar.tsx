type VcVisualizerNameBarProps = {
  name: string;
  visible: boolean;
};

/**
 * Bottom bar for the active visualizer name — sized to the visualizer cell/float,
 * not the full VC window.
 */
export function VcVisualizerNameBar({ name, visible }: VcVisualizerNameBarProps) {
  if (!visible || !name.trim()) return null;

  return (
    <div className="vc-visualizer-name-bar" role="status" aria-live="polite">
      <span className="vc-visualizer-name-bar-label">Visualizer</span>
      <span className="vc-visualizer-name-bar-title">{name}</span>
    </div>
  );
}
