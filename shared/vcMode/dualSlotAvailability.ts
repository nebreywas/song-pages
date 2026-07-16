/**
 * Dual primary/secondary slot availability for VC cells.
 *
 * Fallback vs dual-slot policy:
 * - 1 of 1 configured fails → host/system fallbacks may fill the single slot
 * - 1 of 2 source-fails → show only the source-present slot; suppress switching;
 *   do NOT apply fallbacks for the missing partner (the other slot is the fallback)
 * - 2 of 2 source-fail → host/system fallbacks may fill either/both; suppress switching
 *   if only one ends up resolveable
 */

import {
  songSlotSettingsForContent,
  VC_CONTENT_LABELS,
  type VcCellAssignment,
  type VcCellContent,
} from '../vcModeTypes.ts';
import {
  hasVcSlotSourceContent,
  resolveVcCellContent,
  type VcResolutionContext,
} from './contentResolution.ts';

/** Configured content kinds on a cell (primary, then secondary when distinct). */
export function configuredDualContents(cell: VcCellAssignment): VcCellContent[] {
  const items: VcCellContent[] = [];
  if (cell.slotA) items.push(cell.slotA);
  if (cell.slotB && cell.slotB !== cell.slotA) items.push(cell.slotB);
  return items;
}

function hostBindingForContent(cell: VcCellAssignment, content: VcCellContent) {
  if (content === cell.slotA) return cell.hostSlotA;
  if (content === cell.slotB) return cell.hostSlotB;
  return null;
}

function resolveSlot(cell: VcCellAssignment, content: VcCellContent, ctx: VcResolutionContext) {
  return resolveVcCellContent(
    content,
    hostBindingForContent(cell, content),
    ctx,
    songSlotSettingsForContent(cell, content)?.overrides,
  );
}

export type DualSlotAvailability = {
  /** Slots configured on the cell (1 or 2). */
  configured: VcCellContent[];
  /** Slots that should be mounted/cycled for this track. */
  contents: VcCellContent[];
  /** Configured slots withheld from display (missing source partner, or unresolved after fallback). */
  missing: VcCellContent[];
  /**
   * True when dual slots were configured but only one is mountable —
   * timed/click cycling and fade transitions are voided.
   */
  switchingSuppressed: boolean;
};

/** Resolve which dual-slot contents are available for the current song/host context. */
export function selectRenderableCellContents(
  cell: VcCellAssignment,
  ctx: VcResolutionContext,
): DualSlotAvailability {
  const configured = configuredDualContents(cell);

  if (configured.length === 0) {
    return { configured, contents: [], missing: [], switchingSuppressed: false };
  }

  // Single slot: always mount it so host/system fallbacks can fill a hard miss.
  if (configured.length === 1) {
    return {
      configured,
      contents: configured,
      missing: [],
      switchingSuppressed: false,
    };
  }

  // Dual: classify by real song/host source content first (ignores system fill-ins).
  const sourcePresent = configured.map((content) =>
    hasVcSlotSourceContent(content, hostBindingForContent(cell, content), ctx),
  );
  const sourceContents = configured.filter((_, index) => sourcePresent[index]);
  const sourceMissing = configured.filter((_, index) => !sourcePresent[index]);

  // 1 of 2 source-fail: partner slot is the fallback — do not fall through to system/host.
  if (sourceContents.length === 1) {
    return {
      configured,
      contents: sourceContents,
      missing: sourceMissing,
      switchingSuppressed: true,
    };
  }

  if (sourceContents.length === 2) {
    return {
      configured,
      contents: configured,
      missing: [],
      switchingSuppressed: false,
    };
  }

  // 2 of 2 source-fail: now (and only now) allow normal fallback resolution per slot.
  const contents: VcCellContent[] = [];
  const missing: VcCellContent[] = [];
  for (const content of configured) {
    const resolved = resolveSlot(cell, content, ctx);
    if (resolved.kind !== 'empty') contents.push(content);
    else missing.push(content);
  }

  return {
    configured,
    contents,
    missing,
    switchingSuppressed: contents.length === 1 && configured.length === 2,
  };
}

/** Console / future VC-log line when dual-slot switching is voided. */
export function formatDualSlotSuppressedMessage(
  regionLabel: string,
  availability: DualSlotAvailability,
): string {
  const present = availability.contents.map((c) => VC_CONTENT_LABELS[c]).join(', ');
  const absent = availability.missing.map((c) => VC_CONTENT_LABELS[c]).join(', ');
  return `[VC] ${regionLabel}: dual content incomplete — showing ${present}; ${absent} missing — switching disabled`;
}
