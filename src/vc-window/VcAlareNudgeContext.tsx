import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ALARE_SPEED_NUDGE_STEP, clampAlareSpeedNudge } from '@shared/alare';

import { getApp } from '../lib/bridge';

type VcAlareNudgeContextValue = {
  alareSpeedNudge: number;
};

const VcAlareNudgeContext = createContext<VcAlareNudgeContextValue>({ alareSpeedNudge: 0 });

type VcAlareNudgeProviderProps = {
  playingSongId: number | null | undefined;
  children: ReactNode;
};

/** Host-operated ALARE speed trim — lives on the VC window only (no IPC round-trip). */
export function VcAlareNudgeProvider({ playingSongId, children }: VcAlareNudgeProviderProps) {
  const nudgeRef = useRef(0);
  const [nudgeTick, setNudgeTick] = useState(0);
  const playingSongIdRef = useRef(playingSongId ?? null);

  const bumpNudge = (next: number) => {
    nudgeRef.current = clampAlareSpeedNudge(next);
    setNudgeTick((tick) => tick + 1);
  };

  useEffect(() => {
    const nextId = playingSongId ?? null;
    if (nextId == null) return;
    if (nextId === playingSongIdRef.current) return;
    playingSongIdRef.current = nextId;
    nudgeRef.current = 0;
    setNudgeTick((tick) => tick + 1);
  }, [playingSongId]);

  useEffect(() => {
    const app = getApp();
    if (!app?.vc?.onHotkey) return;

    const off = app.vc.onHotkey(({ action }) => {
      if (action === 'alareSpeedUp') {
        bumpNudge(nudgeRef.current + ALARE_SPEED_NUDGE_STEP);
      } else if (action === 'alareSpeedDown') {
        bumpNudge(nudgeRef.current - ALARE_SPEED_NUDGE_STEP);
      } else if (action === 'alareSpeedReset') {
        bumpNudge(0);
      }
    });

    return () => off();
  }, []);

  const value = useMemo(
    () => ({ alareSpeedNudge: nudgeRef.current }),
    [nudgeTick],
  );

  return <VcAlareNudgeContext.Provider value={value}>{children}</VcAlareNudgeContext.Provider>;
}

export function useVcAlareSpeedNudge(): number {
  return useContext(VcAlareNudgeContext).alareSpeedNudge;
}
