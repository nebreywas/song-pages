import { useMemo, useState } from 'react';

import { renderMarkdownPreview } from '../lib/markdownPreview';

type MarkdownFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
};

/** Markdown source editor with write / preview tabs — same renderer as compiled song pages. */
export function MarkdownField({
  label,
  value,
  onChange,
  maxLength,
  rows = 10,
  placeholder,
}: MarkdownFieldProps) {
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  const previewHtml = useMemo(() => {
    const html = renderMarkdownPreview(value);
    return html || '<p class="markdown-empty">Nothing to preview.</p>';
  }, [value]);

  return (
    <div className="editor-field markdown-field">
      <div className="markdown-field-header">
        <span>{label}</span>
        <div className="markdown-field-tabs" role="tablist" aria-label={`${label} mode`}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'write'}
            className={mode === 'write' ? 'active' : undefined}
            onClick={() => setMode('write')}
          >
            Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'preview'}
            className={mode === 'preview' ? 'active' : undefined}
            onClick={() => setMode('preview')}
          >
            Preview
          </button>
        </div>
      </div>
      <p className="markdown-field-hint">Markdown supported — **bold**, _italic_, headings, lists, links.</p>

      {mode === 'write' ? (
        <textarea
          value={value}
          maxLength={maxLength}
          rows={rows}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <div className="markdown-preview markdown-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      )}
    </div>
  );
}
