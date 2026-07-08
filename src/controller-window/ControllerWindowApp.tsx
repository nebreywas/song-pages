import { useEffect, useMemo, useRef, useState } from 'react';

import {
  getBuiltinCommand,
  listOverlayMappings,
  parseKudoPresetIdFromCommandId,
  type CommandRuntimeContext,
} from '@shared/commands';
import { KUDOS_SETTINGS_KEY, migrateKudosState, type KudoPreset } from '@shared/kudos';

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

    return () => {
      offMapping?.();
      offGate?.();
      offGateEvent?.();
      offRuntime?.();
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

  return (
    <div className={`controller-shell${gateState.open ? ' is-gate-open' : ''}`}>
      <header className="controller-header">
        <h1>VC Controller</h1>
        <p className="controller-lead">Host controls — not shown on the broadcast surface.</p>
        {invokeFeedback ? <p className="controller-invoke-feedback">{invokeFeedback}</p> : null}
      </header>

      {gateState.open ? (
        <section className="controller-gate-overlay" aria-live="polite">
          <p className="controller-gate-hint">Press a mapped key. Unavailable commands are grayed out.</p>
          {gateMessage ? <p className="controller-gate-message">{gateMessage}</p> : null}
          <GateOverlayList
            rows={overlayRows}
            showAbortRow
            remainingSeconds={remainingSeconds}
            variant="live"
          />
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
    </div>
  );
}
