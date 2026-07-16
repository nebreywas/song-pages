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
  visualizerAlsoClickToChange: boolean;
  showVisualizerName: boolean;
  visualizers: VisualizerPluginOption[];
  onChange: (
    patch: Partial<
      Pick<
        VcModeConfig,
        | 'visualizerId'
        | 'visualizerChangeRule'
        | 'visualizerSequence'
        | 'visualizerAlsoClickToChange'
        | 'showVisualizerName'
      >
    >,
  ) => void;
};

/** Global VC visualizer plugin + rotation controls (shown on the slot that owns visualizer). */
export function VisualizerAssignmentSettings({
  visualizerId,
  visualizerChangeRule,
  visualizerSequence,
  visualizerAlsoClickToChange,
  showVisualizerName,
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

      <label className="vc-field vc-field-inline">
        <input
          type="checkbox"
          checked={visualizerAlsoClickToChange}
          onChange={(e) => onChange({ visualizerAlsoClickToChange: e.target.checked })}
        />
        <span>Also click to change?</span>
      </label>
      <p className="vc-assignment-hint">
        When checked, clicking the visualizer on the live surface randomizes the plugin even if the change
        rule is Never. Use the Change Visualizer command for the same effect from the controller or a hotkey.
      </p>

      <label className="vc-field vc-field-inline">
        <input
          type="checkbox"
          checked={showVisualizerName}
          onChange={(e) => onChange({ showVisualizerName: e.target.checked })}
        />
        <span>Show visualizer name</span>
      </label>
      <p className="vc-assignment-hint">
        When checked, a bottom bar shows the visualizer name for the first 10 seconds after it becomes
        active. You can also bind the Show Visualizer Name command to reveal it on demand.
      </p>

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
