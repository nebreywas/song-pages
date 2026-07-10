import type { CommandOverlayRow } from '@shared/commands';

import { CommandDisplayLabel } from './CommandDisplayLabel';

type GateOverlayListProps = {
  rows: CommandOverlayRow[];
  /** Show ESC abort row — live gate overlay only. */
  showAbortRow?: boolean;
  /** Remaining gate seconds — live gate overlay only. */
  remainingSeconds?: number | null;
  emptyMessage?: string;
  variant?: 'preview' | 'live';
};

/** Shared gated-command list — settings preview and VC Controller live overlay. */
export function GateOverlayList({
  rows,
  showAbortRow = false,
  remainingSeconds = null,
  emptyMessage = 'No gated commands mapped yet.',
  variant = 'preview',
}: GateOverlayListProps) {
  return (
    <div className={`gate-overlay-list gate-overlay-list-${variant}`}>
      <div className="gate-overlay-list-header">
        <h3 className="gate-overlay-list-title">VC Commands</h3>
        {typeof remainingSeconds === 'number' ? (
          <span className="gate-overlay-countdown" role="timer" aria-live="off">
            {remainingSeconds}s
          </span>
        ) : null}
      </div>

      <ul className="gate-overlay-rows">
        {rows.map((row) => (
          <li
            key={`${row.commandId}-${row.key}`}
            className={`gate-overlay-row${row.available ? '' : ' is-unavailable'}`}
            aria-disabled={row.available ? undefined : true}
          >
            <span className="gate-overlay-key">{row.key}</span>
            <span className="gate-overlay-label">
              <CommandDisplayLabel label={row.label} />
            </span>
            {!row.available ? <span className="gate-overlay-unavailable-tag">Unavailable</span> : null}
          </li>
        ))}
        {rows.length === 0 ? <li className="gate-overlay-empty">{emptyMessage}</li> : null}
      </ul>

      {showAbortRow ? (
        <ul className="gate-overlay-rows gate-overlay-footer">
          <li className="gate-overlay-row gate-overlay-row-abort">
            <span className="gate-overlay-key">ESC</span>
            <span className="gate-overlay-label">Cancel</span>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
