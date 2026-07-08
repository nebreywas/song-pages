import {
  VC_VISUALIZER_CHANGE_RULE_OPTIONS,
  VC_VISUALIZER_SEQUENCE_OPTIONS,
  type VcModeConfig,
} from '@shared/vcModeTypes';

export type VisualizerPluginOption = {
  id: string;
  name: string;
};

type VisualizerAssignmentSettingsProps = {
  visualizerId: string;
  visualizerChangeRule: VcModeConfig['visualizerChangeRule'];
  visualizerSequence: VcModeConfig['visualizerSequence'];
  visualizers: VisualizerPluginOption[];
  onChange: (
    patch: Partial<Pick<VcModeConfig, 'visualizerId' | 'visualizerChangeRule' | 'visualizerSequence'>>,
  ) => void;
};

/** Global VC visualizer plugin + rotation controls (shown on the slot that owns visualizer). */
export function VisualizerAssignmentSettings({
  visualizerId,
  visualizerChangeRule,
  visualizerSequence,
  visualizers,
  onChange,
}: VisualizerAssignmentSettingsProps) {
  return (
    <section className="vc-host-assignment-settings vc-visualizer-assignment-settings">
      <p className="vc-assignment-orientation">
        Choose the visualizer plugin and how it changes while VC Mode is live.
      </p>

      <label className="vc-field">
        <span>Visualizer plugin</span>
        <select value={visualizerId} onChange={(e) => onChange({ visualizerId: e.target.value })}>
          {visualizers.map((plugin) => (
            <option key={plugin.id} value={plugin.id}>
              {plugin.name}
            </option>
          ))}
        </select>
      </label>

      <label className="vc-field">
        <span>Change rule</span>
        <select
          value={visualizerChangeRule}
          onChange={(e) =>
            onChange({ visualizerChangeRule: e.target.value as VcModeConfig['visualizerChangeRule'] })
          }
        >
          {VC_VISUALIZER_CHANGE_RULE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="vc-field">
        <span>Sequence</span>
        <select
          value={visualizerSequence}
          onChange={(e) =>
            onChange({ visualizerSequence: e.target.value as VcModeConfig['visualizerSequence'] })
          }
        >
          {VC_VISUALIZER_SEQUENCE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
