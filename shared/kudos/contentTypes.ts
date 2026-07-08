import type { KudoContentType } from './types';

/** Designer-facing labels for each Kudo content type. */
export const KUDO_CONTENT_TYPE_OPTIONS: { value: KudoContentType; label: string }[] = [
  { value: 'builtin-assets', label: 'Built-in icons' },
  { value: 'emoji', label: 'OS emoji' },
  { value: 'text', label: 'Text' },
  { value: 'text-emoji', label: 'Words + emoji' },
  { value: 'hybrid', label: 'Hybrid' },
];

const LABEL_BY_VALUE = Object.fromEntries(
  KUDO_CONTENT_TYPE_OPTIONS.map((row) => [row.value, row.label]),
) as Record<KudoContentType, string>;

export function kudoContentTypeLabel(contentType: KudoContentType): string {
  return LABEL_BY_VALUE[contentType] ?? contentType;
}
