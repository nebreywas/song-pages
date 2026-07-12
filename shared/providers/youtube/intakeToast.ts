import type { YoutubeDiscardedContext } from './canonicalize.ts';

/**
 * User-facing toast when intake stripped YouTube session context (playlist, radio, timestamp).
 * Returns null for bare ids / clean watch URLs — no noise when nothing meaningful was dropped.
 */
export function buildYoutubeIntakeToastMessage(
  discarded: YoutubeDiscardedContext,
): string | null {
  const params = discarded.queryParams;
  const ignored: string[] = [];

  if (params.list != null) ignored.push('playlist link');
  if (params.index != null && params.list == null) ignored.push('playlist index');
  if (params.start_radio != null) ignored.push('radio / mix');
  if (params.t != null || params.start != null || params.time_continue != null) {
    ignored.push('start time');
  }

  if (ignored.length === 0) return null;

  if (ignored.length === 1) {
    return `Added as a single video — ${ignored[0]} from the URL was ignored.`;
  }

  const last = ignored.pop()!;
  return `Added as a single video — ${ignored.join(', ')} and ${last} from the URL were ignored.`;
}
