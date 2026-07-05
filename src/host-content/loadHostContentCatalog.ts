/**
 * Load and normalize the host content catalog from app settings.
 */

import {
  createDefaultHostContentCatalog,
  HOST_CONTENT_SETTINGS_KEY,
  migrateHostContentCatalog,
  type HostContentCatalog,
} from '@shared/hostContent';

import { getApp } from '../lib/bridge';

/** Fetch persisted host content, migrating to the current catalog shape. */
export async function loadHostContentCatalog(): Promise<HostContentCatalog> {
  const app = getApp();
  if (!app?.getSettings) {
    return createDefaultHostContentCatalog();
  }

  try {
    const raw = await app.getSettings(HOST_CONTENT_SETTINGS_KEY);
    return migrateHostContentCatalog(raw);
  } catch {
    return createDefaultHostContentCatalog();
  }
}
