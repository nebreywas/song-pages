import { useEffect, useMemo, useRef, useState } from 'react';

import {
  getBuiltinCommand,
  listOverlayMappings,
  parseKudoPresetIdFromCommandId,
  type CommandRuntimeContext,
} from '@shared/commands';
import {
  detectExternalSongProvider,
  EXTERNAL_SONG_INTAKE_PLACEHOLDER,
} from '@shared/listener/externalSongIntake';
import { KUDOS_SETTINGS_KEY, migrateKudosState, type KudoPreset } from '@shared/kudos';
import type { VcStatePayload } from '@shared/vcModeTypes';

import { getApp } from '../lib/bridge';
import { GateOverlayList } from '../commands/GateOverlayList';
import '../commands/gateOverlay.css';
import './controller.css';

type GateState = {
  open: boolean;
  timeoutMs: number;
  openedAt: number | null;
};

/** Host-only VC controller — gate overlay and Kudo fire buttons. */
export function ControllerWindowApp() {
  const [mappingState, setMappingState] = useState<import('@shared/commands').CommandMappingState | null>(null);
  const [gateState, setGateState] = useState<GateState>({
    open: false,
    timeoutMs: 8000,
    openedAt: null,
  });
  const [kudoPresets, setKudoPresets] = useState<KudoPreset[]>([]);
  const [runtimeContext, setRuntimeContext] = useState<CommandRuntimeContext>({ vcModeActive: true });
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [invokeFeedback, setInvokeFeedback] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [vcState, setVcState] = useState<VcStatePayload | null>(null);
  const [surfaceSwitching, setSurfaceSwitching] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionBusy, setSubmissionBusy] = useState(false);
  const submissionInputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  const showInvokeFeedback = (message: string) => {
    setInvokeFeedback(message);
    if (feedbackTimeoutRef.current != null) window.clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = window.setTimeout(() => setInvokeFeedback(null), 2200);
  };

  useEffect(() => {
    const app = getApp();
    void app?.commands?.getState?.().then((result) => {
      if (result?.ok && result.data) setMappingState(result.data);
    });

    const offMapping = app?.commands?.onMappingState?.((state) => setMappingState(state));
    const offGate = app?.commands?.onGateState?.((state) => {
      setGateState({
        open: state.open,
        timeoutMs: state.timeoutMs,
        openedAt: state.openedAt ?? null,
      });
    });
    const offGateEvent = app?.commands?.onGateEvent?.((event) => {
      if (event.type === 'unmapped') setGateMessage('No command mapped');
      if (event.type === 'kudo-unassigned') setGateMessage('Kudo preset not assigned to this key');
      if (event.type === 'unavailable') {
        const command = event.commandId ? getBuiltinCommand(event.commandId) : null;
        setGateMessage(command ? `${command.label} unavailable right now` : 'Command unavailable right now');
      }
      if (event.type === 'closed') setGateMessage(null);
    });
    const offRuntime = app?.commands?.onRuntimeContext?.((context) => {
      setRuntimeContext(context);
    });
    void app?.commands?.getRuntimeContext?.().then((result) => {
      if (result?.ok && result.data) setRuntimeContext(result.data);
    });
    const offVcState = app?.vc?.onState?.((payload) => setVcState(payload));
    void app?.controller?.status?.().then((result) => {
      if (result?.ok && result.data?.alwaysOnTop != null) {
        setAlwaysOnTop(result.data.alwaysOnTop);
      }
    });

    return () => {
      offMapping?.();
      offGate?.();
      offGateEvent?.();
      offRuntime?.();
      offVcState?.();
      if (feedbackTimeoutRef.current != null) window.clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const app = getApp();
    const offInvoke = app?.commands?.onInvoke?.((payload) => {
      if (payload.result === 'unavailable') {
        const command = getBuiltinCommand(payload.commandId);
        showInvokeFeedback(command ? `${command.label} unavailable` : 'Command unavailable');
        return;
      }
      const presetId =
        typeof payload.kudoPresetId === 'string'
          ? payload.kudoPresetId
          : parseKudoPresetIdFromCommandId(payload.commandId);
      if (presetId) {
        const preset = kudoPresets.find((row) => row.id === presetId);
        showInvokeFeedback(`Kudo: ${preset?.name ?? presetId}`);
        return;
      }
      const command = getBuiltinCommand(payload.commandId);
      if (command) showInvokeFeedback(command.label);
    });
    return () => offInvoke?.();
  }, [kudoPresets]);

  useEffect(() => {
    const app = getApp();
    void app?.getSettings?.(KUDOS_SETTINGS_KEY).then((raw) => {
      setKudoPresets(migrateKudosState(raw).presets);
    });
  }, []);

  useEffect(() => {
    if (!gateState.open || gateState.openedAt == null) {
      setRemainingSeconds(null);
      return;
    }

    const tick = () => {
      const elapsed = Date.now() - gateState.openedAt!;
      const left = Math.max(0, Math.ceil((gateState.timeoutMs - elapsed) / 1000));
      setRemainingSeconds(left);
    };

    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [gateState.open, gateState.openedAt, gateState.timeoutMs]);

  const overlayRows = useMemo(() => {
    if (!mappingState) return [];
    return listOverlayMappings(
      mappingState,
      kudoPresets.map((row) => ({ id: row.id, name: row.name })),
      runtimeContext,
    );
  }, [mappingState, kudoPresets, runtimeContext]);

  const fireKudo = (presetId: string) => {
    void getApp()?.commands?.dispatch?.({
      commandId: `trigger-kudo-${presetId}`,
      source: 'controller-ui',
      binding: 'controller-button',
      timestamp: Date.now(),
    });
  };

  const playNextSong = () => {
    if (vcState?.playLockEnabled) return;
    void getApp()?.commands?.dispatch?.({
      commandId: 'play-next-song',
      source: 'controller-ui',
      binding: 'controller-button',
      timestamp: Date.now(),
    });
  };

  const surfaceDesigns = vcState?.surfaceDesigns;
  const switchSurface = (designId: string) => {
    if (!surfaceDesigns || designId === surfaceDesigns.activeDesignId || surfaceSwitching) return;
    setSurfaceSwitching(true);
    getApp()?.vc?.switchSurface?.(designId);
    window.setTimeout(() => setSurfaceSwitching(false), 600);
  };

  const toggleAlwaysOnTop = () => {
    const next = !alwaysOnTop;
    setAlwaysOnTop(next);
    void getApp()?.controller?.setAlwaysOnTop?.(next).then((result) => {
      if (result?.ok && result.data?.alwaysOnTop != null) {
        setAlwaysOnTop(result.data.alwaysOnTop);
      } else if (!result?.ok) {
        setAlwaysOnTop(!next);
      }
    });
  };

  const togglePlayLock = () => {
    getApp()?.vc?.togglePlayLock?.();
  };

  const setPlayLockReleaseOnNext = (enabled: boolean) => {
    getApp()?.vc?.setPlayLockReleaseOnNext?.(enabled);
  };

  const submissionPlaylistId = vcState?.config.defaultSubmissionPlaylistId ?? null;

  const handleSubmissionPaste = async (event: React.ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text').trim();
    if (!text || submissionPlaylistId == null || submissionBusy) return;

    event.preventDefault();
    const detection = detectExternalSongProvider(text);
    if (!detection.ok) {
      setSubmissionError(detection.error);
      return;
    }

    const app = getApp();
    if (!app?.listener.addExternalSongToUserPlaylist) {
      setSubmissionError('Song import is unavailable in this build. Restart the app.');
      return;
    }

    setSubmissionBusy(true);
    setSubmissionError(null);
    const result = await app.listener.addExternalSongToUserPlaylist(submissionPlaylistId, text);
    setSubmissionBusy(false);

    if (!result.ok || !result.data) {
      setSubmissionError(result.error ?? 'Could not add that song.');
      return;
    }

    app.vc?.notifySubmissionPlaylistUpdated?.(submissionPlaylistId);
    event.currentTarget.value = '';
    showInvokeFeedback(
      result.data.duplicate ? 'Song already in submission playlist' : 'Song added to submission playlist',
    );
  };

  const specialPause = vcState?.specialPlayPause;
  const playLockActive = vcState?.playLockEnabled === true;
  const playLockReleaseOnNext = vcState?.playLockReleaseOnNextSong === true;
  const showSpecialPauseCountdown =
    specialPause?.active === true &&
    vcState?.config.specialPlayStyle.showCountdownOnController === true;

  return (
    <div className={`controller-shell${gateState.open ? ' is-gate-open' : ''}`}>
      <header className="controller-header">
        <div className="controller-title-row">
          <h1>VC Controller</h1>
          <button
            type="button"
            className={`btn controller-always-top-btn${alwaysOnTop ? ' is-active' : ''}`}
            onClick={toggleAlwaysOnTop}
            aria-pressed={alwaysOnTop}
          >
            [always on top]
          </button>
        </div>
        {surfaceDesigns && surfaceDesigns.designs.length > 0 ? (
          <label className="controller-surface-field">
            <span className="controller-surface-label">Surface</span>
            <select
              className="controller-surface-select"
              value={surfaceDesigns.activeDesignId}
              disabled={surfaceSwitching}
              onChange={(event) => switchSurface(event.target.value)}
              aria-label="Active surface design"
            >
              {surfaceDesigns.designs.map((design) => (
                <option key={design.id} value={design.id}>
                  {design.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          className={`btn controller-play-lock-btn${playLockActive ? ' is-active' : ''}`}
          onClick={togglePlayLock}
          aria-pressed={playLockActive}
          title="Protect live playback from accidental song changes"
        >
          🔒 Play Lock
        </button>
        {playLockActive ? (
          <label className="controller-play-lock-release">
            <input
              type="checkbox"
              checked={playLockReleaseOnNext}
              onChange={(event) => setPlayLockReleaseOnNext(event.target.checked)}
            />
            <span>Release on next song</span>
          </label>
        ) : null}
      </header>

      {submissionPlaylistId != null ? (
        <section className="controller-submission">
          <label className="controller-submission-field">
            <span className="controller-submission-label">Paste Song Link…</span>
            <input
              ref={submissionInputRef}
              type="text"
              className="controller-submission-input"
              placeholder={EXTERNAL_SONG_INTAKE_PLACEHOLDER}
              disabled={submissionBusy}
              onPaste={(event) => void handleSubmissionPaste(event)}
            />
          </label>
          {submissionError ? (
            <p className="controller-submission-error" role="alert">
              {submissionError}
            </p>
          ) : null}
        </section>
      ) : null}

      {gateState.open ? (
        <section className="controller-gate-overlay" aria-live="polite">
          <p className="controller-gate-hint">Press a mapped key. Unavailable commands are grayed out.</p>
          <GateOverlayList
            rows={overlayRows}
            showAbortRow
            remainingSeconds={remainingSeconds}
            variant="live"
          />
        </section>
      ) : null}

      {specialPause?.active && !playLockActive ? (
        <section className="controller-play-next">
          <button type="button" className="btn controller-play-next-btn" onClick={playNextSong}>
            Play Next Song
          </button>
        </section>
      ) : null}

      <section className="controller-kudos">
        <h2>Kudos</h2>
        <div className="controller-kudo-grid">
          {kudoPresets.map((preset) => (
            <button key={preset.id} type="button" className="btn controller-kudo-btn" onClick={() => fireKudo(preset.id)}>
              {preset.name}
            </button>
          ))}
          {kudoPresets.length === 0 ? <p className="controller-empty">No Kudo presets saved.</p> : null}
        </div>
      </section>

      <footer className="controller-dynamic-footer" aria-live="polite">
        {showSpecialPauseCountdown ? (
          <p className="controller-special-pause-countdown">
            {specialPause?.secondsRemaining != null
              ? `${specialPause.secondsRemaining}s`
              : 'Paused — ready when you are'}
          </p>
        ) : null}
        {gateState.open && remainingSeconds != null ? (
          <p className="controller-dynamic-countdown">Gate closes in {remainingSeconds}s</p>
        ) : null}
        {gateMessage ? (
          <p className="controller-dynamic-message controller-dynamic-message-gate">{gateMessage}</p>
        ) : null}
        {invokeFeedback ? (
          <p className="controller-dynamic-message controller-dynamic-message-invoke">{invokeFeedback}</p>
        ) : null}
        {!gateMessage && !invokeFeedback && !showSpecialPauseCountdown && (gateState.open ? remainingSeconds == null : true) ? (
          <p className="controller-dynamic-footer-empty">Status messages appear here.</p>
        ) : null}
      </footer>
    </div>
  );
}
