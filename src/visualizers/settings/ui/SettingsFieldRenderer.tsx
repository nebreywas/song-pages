import type { VisualizerSettingField } from '../../core/settings/schema/types';

type SettingsFieldRendererProps = {
  field: VisualizerSettingField;
  value: boolean | number | string;
  onChange: (key: string, value: boolean | number | string) => void;
};

/** Renders one schema-defined setting control. */
export function SettingsFieldRenderer({ field, value, onChange }: SettingsFieldRendererProps) {
  if (field.type === 'boolean') {
    return (
      <label className="viz-settings-field viz-settings-field-boolean">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(field.key, event.target.checked)}
        />
        <span>{field.label}</span>
        {field.description ? <span className="viz-settings-field-hint">{field.description}</span> : null}
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className="viz-settings-field">
        <span className="viz-settings-field-label">{field.label}</span>
        {field.description ? <span className="viz-settings-field-hint">{field.description}</span> : null}
        <select
          value={String(value)}
          onChange={(event) => onChange(field.key, event.target.value)}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="viz-settings-field">
      <span className="viz-settings-field-label">
        {field.label}: {typeof value === 'number' ? value.toFixed(1) : value}
      </span>
      {field.description ? <span className="viz-settings-field-hint">{field.description}</span> : null}
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={typeof value === 'number' ? value : field.default}
        onChange={(event) => onChange(field.key, Number(event.target.value))}
      />
    </label>
  );
}
