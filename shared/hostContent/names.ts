/**
 * Host content naming rules — normalize, validate, default names.
 */

import { HOST_CONTENT_NAME_MAX_LEN } from './constants';
import type { HostContentType } from './types';

const NAME_PATTERN = /^[a-z0-9_-]+$/;

export function normalizeHostContentName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, HOST_CONTENT_NAME_MAX_LEN);
}

export function isValidHostContentName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= HOST_CONTENT_NAME_MAX_LEN &&
    NAME_PATTERN.test(name)
  );
}

export function validateHostContentName(raw: string): string | null {
  const normalized = normalizeHostContentName(raw);
  if (!normalized) return 'Name is required.';
  if (!isValidHostContentName(normalized)) {
    return `Name must be ${HOST_CONTENT_NAME_MAX_LEN} characters or fewer (letters, numbers, _ and - only).`;
  }
  return null;
}

const DEFAULT_PREFIX: Record<Exclude<HostContentType, 'fallback'>, string> = {
  graphic: 'graphic',
  'title-text': 'title',
  'area-text': 'text',
  video: 'video',
  'graphics-group': 'group',
};

export function defaultNameForType(
  type: Exclude<HostContentType, 'fallback'>,
  existingNames: Set<string>,
): string {
  const prefix = DEFAULT_PREFIX[type];
  let n = 1;
  while (existingNames.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}
