/**
 * Load Host Content catalog in the VC window for live content resolution.
 */

import { useEffect, useState } from 'react';

import {
  createDefaultHostContentCatalog,
  HOST_CONTENT_SETTINGS_KEY,
  migrateHostContentCatalog,
  type HostContentCatalog,
} from '@shared/hostContent';

import { getApp } from '../lib/bridge';

export function useHostContentCatalog() {
  const [catalog, setCatalog] = useState<HostContentCatalog>(() => createDefaultHostContentCatalog());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const app = getApp();
    if (!app?.getSettings) {
      setReady(true);
      return;
    }

    void app
      .getSettings(HOST_CONTENT_SETTINGS_KEY)
      .then((raw) => {
        setCatalog(migrateHostContentCatalog(raw));
        setReady(true);
      })
      .catch(() => {
        setReady(true);
      });
  }, []);

  return { catalog, ready };
}
