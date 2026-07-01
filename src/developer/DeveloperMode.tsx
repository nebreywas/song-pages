import { useCallback, useEffect, useMemo, useState } from 'react';

import { getApp } from '../lib/bridge';
import type { CacheEventRow } from '../types/app';

const CACHE_EVENT_TYPES = [
  'all',
  'resolve_hit',
  'resolve_miss',
  'invalidate_stale',
  'populate_scheduled',
  'populate_start',
  'populate_skip',
  'populate_complete',
  'populate_failed',
  'cache_remove',
  'invalidate_artist',
] as const;

type CacheEventFilter = (typeof CACHE_EVENT_TYPES)[number];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

function eventSummary(event: CacheEventRow): string {
  const parts: string[] = [];

  if (event.source) parts.push(`via ${event.source}`);
  if (event.songTitle) parts.push(event.songTitle);
  else if (event.songId != null) parts.push(`song #${event.songId}`);
  if (event.cacheId) parts.push(`cache ${String(event.cacheId).slice(0, 8)}…`);
  if (event.reason) parts.push(`reason=${event.reason}`);
  if (event.totalBytes != null) parts.push(formatBytes(event.totalBytes));
  if (event.segmentCount != null) parts.push(`${event.segmentCount} segments`);
  if (event.durationMs != null) parts.push(`${event.durationMs}ms`);
  if (event.entryCount != null) parts.push(`${event.entryCount} entries`);
  if (event.cachedRevision && event.currentRevision) {
    parts.push(`${event.cachedRevision} → ${event.currentRevision}`);
  }
  if (event.error) parts.push(event.error);

  return parts.join(' · ') || '—';
}

function eventTypeClass(type: string): string {
  if (type === 'resolve_hit' || type === 'populate_complete' || type === 'populate_skip') {
    return 'cache-event-type cache-event-type--ok';
  }
  if (type === 'resolve_miss' || type === 'populate_scheduled' || type === 'populate_start') {
    return 'cache-event-type cache-event-type--pending';
  }
  if (type.endsWith('_failed')) {
    return 'cache-event-type cache-event-type--error';
  }
  if (type.startsWith('invalidate') || type === 'cache_remove') {
    return 'cache-event-type cache-event-type--warn';
  }
  return 'cache-event-type';
}

export function DeveloperMode() {
  const [version, setVersion] = useState('');
  const [ffmpeg, setFfmpeg] = useState<string>('checking…');
  const [stats, setStats] = useState<{ entryCount: number; totalBytes: number; maxEntries: number } | null>(
    null,
  );
  const [events, setEvents] = useState<CacheEventRow[]>([]);
  const [filter, setFilter] = useState<CacheEventFilter>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refreshCacheDiagnostics = useCallback(async () => {
    const app = getApp();
    if (!app?.listener.cacheStats || !app.listener.cacheEvents) {
      setRefreshError('Cache diagnostics API unavailable — restart Electron after updating main process.');
      return;
    }

    try {
      const [statsResult, eventsResult] = await Promise.all([
        app.listener.cacheStats(),
        app.listener.cacheEvents(200),
      ]);

      if (!statsResult.ok) {
        setRefreshError(statsResult.error || 'Failed to load cache stats.');
        return;
      }
      if (!eventsResult.ok) {
        setRefreshError(eventsResult.error || 'Failed to load cache events.');
        return;
      }

      if (statsResult.data) {
        setStats(statsResult.data);
      }
      if (eventsResult.data) {
        setEvents(eventsResult.data);
      }
      setRefreshError(null);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    const app = getApp();
    if (!app) return;
    void app.getVersion().then(setVersion);
    void app.artist.checkFfmpeg().then((result) => {
      setFfmpeg(result.ok ? 'Available on PATH' : result.error || 'Not found');
    });
    void refreshCacheDiagnostics();
  }, [refreshCacheDiagnostics]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      void refreshCacheDiagnostics();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, refreshCacheDiagnostics]);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((event) => event.type === filter);
  }, [events, filter]);

  const clearEvents = async () => {
    const app = getApp();
    if (!app?.listener.cacheClearEvents) return;
    await app.listener.cacheClearEvents();
    await refreshCacheDiagnostics();
  };

  return (
    <div className="simple-page panel developer-page">
      <h2>Developer</h2>
      <p>Song Pages diagnostics and cache analytics.</p>
      <ul>
        <li>App version: {version || '…'}</li>
        <li>ffmpeg: {ffmpeg}</li>
        <li>Renderer: React + Vite</li>
        <li>Main: Electron + SQLite</li>
      </ul>

      <section className="developer-cache-panel">
        <div className="developer-cache-header">
          <h3>Song cache</h3>
          <div className="developer-cache-actions">
            <label className="developer-cache-auto">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
              />
              Auto-refresh
            </label>
            <button type="button" className="btn btn-secondary" onClick={() => void refreshCacheDiagnostics()}>
              Refresh
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => void clearEvents()}>
              Clear log
            </button>
          </div>
        </div>

        {refreshError ? <p className="developer-cache-error">{refreshError}</p> : null}

        {stats ? (
          <dl className="developer-cache-stats">
            <div>
              <dt>Entries</dt>
              <dd>
                {stats.entryCount} / {stats.maxEntries}
              </dd>
            </div>
            <div>
              <dt>Disk usage</dt>
              <dd>{formatBytes(stats.totalBytes)}</dd>
            </div>
          </dl>
        ) : null}

        <div className="developer-cache-filters">
          <label htmlFor="cache-event-filter">Filter</label>
          <select
            id="cache-event-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value as CacheEventFilter)}
          >
            {CACHE_EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'All events' : type}
              </option>
            ))}
          </select>
          <span className="developer-cache-count">
            {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="developer-cache-log" role="log" aria-live="polite">
          {filteredEvents.length === 0 ? (
            <p className="developer-cache-empty">
              No cache events yet. Open or play songs in Listener mode to populate this log.
            </p>
          ) : (
            <ul className="developer-cache-log-list">
              {filteredEvents.map((event) => (
                <li key={event.id} className="developer-cache-log-row">
                  <span className="developer-cache-log-time">{formatTime(event.at)}</span>
                  <span className={eventTypeClass(event.type)}>{event.type}</span>
                  <span className="developer-cache-log-detail">{eventSummary(event)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="developer-cache-hint">
          Events are also written to the main process log file with a <code>cache:</code> prefix (use Export Logs
          from settings).
        </p>
      </section>
    </div>
  );
}
