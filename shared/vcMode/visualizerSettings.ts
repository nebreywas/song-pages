/** VC Mode visualizer rotation — designer settings and runtime helpers. */

export type VcVisualizerChangeRule =
  | 'never'
  | 'click'
  | 'new-song'
  | '30s'
  | '1m'
  | '2m'
  | '3m'
  | '5m'
  | '10m';

export type VcVisualizerSequence = 'random-any' | 'random-builtin' | 'random-milkdrop';

export const DEFAULT_VC_VISUALIZER_CHANGE_RULE: VcVisualizerChangeRule = 'never';
export const DEFAULT_VC_VISUALIZER_SEQUENCE: VcVisualizerSequence = 'random-any';

export const VC_VISUALIZER_CHANGE_RULE_OPTIONS: Array<{
  value: VcVisualizerChangeRule;
  label: string;
}> = [
  { value: 'never', label: 'Never change' },
  { value: 'click', label: 'Change on click' },
  { value: 'new-song', label: 'Change on new song' },
  { value: '30s', label: 'Change every 30 seconds' },
  { value: '1m', label: 'Change every minute' },
  { value: '2m', label: 'Change every 2 minutes' },
  { value: '3m', label: 'Change every 3 minutes' },
  { value: '5m', label: 'Change every 5 minutes' },
  { value: '10m', label: 'Change every 10 minutes' },
];

export const VC_VISUALIZER_SEQUENCE_OPTIONS: Array<{
  value: VcVisualizerSequence;
  label: string;
}> = [
  { value: 'random-any', label: 'Random Any' },
  { value: 'random-builtin', label: 'Random Built-in' },
  { value: 'random-milkdrop', label: 'Random Milkdrop' },
];

const CHANGE_RULE_SET = new Set<string>(VC_VISUALIZER_CHANGE_RULE_OPTIONS.map((opt) => opt.value));
const SEQUENCE_SET = new Set<string>(VC_VISUALIZER_SEQUENCE_OPTIONS.map((opt) => opt.value));

export function sanitizeVisualizerChangeRule(raw: unknown): VcVisualizerChangeRule {
  return typeof raw === 'string' && CHANGE_RULE_SET.has(raw)
    ? (raw as VcVisualizerChangeRule)
    : DEFAULT_VC_VISUALIZER_CHANGE_RULE;
}

export function sanitizeVisualizerSequence(raw: unknown): VcVisualizerSequence {
  return typeof raw === 'string' && SEQUENCE_SET.has(raw)
    ? (raw as VcVisualizerSequence)
    : DEFAULT_VC_VISUALIZER_SEQUENCE;
}

/** Interval in ms for timed rules; null when not timer-driven. */
export function changeRuleIntervalMs(rule: VcVisualizerChangeRule): number | null {
  switch (rule) {
    case '30s':
      return 30_000;
    case '1m':
      return 60_000;
    case '2m':
      return 120_000;
    case '3m':
      return 180_000;
    case '5m':
      return 300_000;
    case '10m':
      return 600_000;
    default:
      return null;
  }
}

export function shouldRotateVisualizerOnSongChange(rule: VcVisualizerChangeRule): boolean {
  return rule === 'new-song';
}

export function shouldRotateVisualizerOnClick(rule: VcVisualizerChangeRule): boolean {
  return rule === 'click';
}

/** Pick a different id when the pool allows; otherwise return the only candidate. */
export function pickNextVisualizerId(pool: string[], currentId: string): string {
  if (pool.length === 0) return currentId;
  if (pool.length === 1) return pool[0]!;

  let next = pool[Math.floor(Math.random() * pool.length)]!;
  let attempts = 0;
  while (next === currentId && attempts < 8) {
    next = pool[Math.floor(Math.random() * pool.length)]!;
    attempts += 1;
  }
  return next;
}
