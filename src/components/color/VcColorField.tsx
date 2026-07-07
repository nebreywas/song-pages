/**
 * VC / Host designer color field — Coloris picker (HEX, dark theme, VC swatches).
 */

import { useEffect, useId, useRef } from 'react';

import '@melloware/coloris/dist/coloris.css';
import './vcColorField.css';

import { bindVcColorField, closeVcColorPicker, readColorFieldValue } from './colorisConfig';
import { isValidHexColor, normalizeHexColor } from './normalizeHex';

/** Coloris paints the swatch from the wrapper's CSS `color` — keep it in sync with the value. */
function syncColorisPreview(input: HTMLInputElement, color: string): void {
  const wrapper = input.parentElement;
  if (wrapper?.classList.contains('clr-field')) {
    wrapper.style.color = color;
  }
}

export type VcColorFieldProps = {
  value: string;
  onChange: (color: string) => void;
  className?: string;
  /** Compact: swatch button only (font row). Default shows hex input too. */
  variant?: 'compact' | 'default';
  id?: string;
  'aria-label'?: string;
};

export function VcColorField({
  value,
  onChange,
  className,
  variant = 'default',
  id,
  'aria-label': ariaLabel,
}: VcColorFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  onChangeRef.current = onChange;
  valueRef.current = value;

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    bindVcColorField(input);
    syncColorisPreview(input, valueRef.current);

    const commit = (raw: string) => {
      const normalized = normalizeHexColor(raw);
      if (!isValidHexColor(normalized)) return;
      if (normalized !== valueRef.current) {
        onChangeRef.current(normalized);
      }
      if (input.value !== normalized) {
        input.value = normalized;
      }
      syncColorisPreview(input, normalized);
    };

    const onInput = () => commit(readColorFieldValue(input));
    const onPick = (event: Event) => {
      const detail = (event as CustomEvent<{ color?: string; currentEl?: HTMLInputElement }>).detail;
      // Coloris broadcasts one pick to the document — ignore picks for other fields.
      if (detail?.currentEl !== input) return;
      if (detail?.color) commit(detail.color);
    };

    input.addEventListener('input', onInput);
    input.addEventListener('change', onInput);
    document.addEventListener('coloris:pick', onPick);

    return () => {
      input.removeEventListener('input', onInput);
      input.removeEventListener('change', onInput);
      document.removeEventListener('coloris:pick', onPick);
      closeVcColorPicker();
    };
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const normalized = isValidHexColor(value) ? value.toLowerCase() : value;
    if (input.value !== normalized) {
      input.value = normalized;
    }
    syncColorisPreview(input, normalized);
  }, [value]);

  return (
    <span
      className={`vc-color-field vc-color-field--${variant}${className ? ` ${className}` : ''}`}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        className="vc-color-field-input"
        data-coloris
        value={value}
        onChange={(event) => {
          const normalized = normalizeHexColor(event.target.value);
          if (isValidHexColor(normalized)) {
            onChangeRef.current(normalized);
          }
        }}
        aria-label={ariaLabel ?? 'Color'}
        spellCheck={false}
        autoComplete="off"
      />
    </span>
  );
}
