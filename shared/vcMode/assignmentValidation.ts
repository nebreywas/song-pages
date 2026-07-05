/**
 * VC design validation for host content assignments.
 */

import {
  activeCells,
  allContentAssignments,
  emptyCell,
  isHostContentKind,
  VC_CONTENT_LABELS,
  type VcCellAssignment,
  type VcCellContent,
  type VcHostSlotBinding,
  type VcModeConfig,
} from '../vcModeTypes';

function checkHostSlot(
  label: string,
  content: VcCellContent,
  binding: VcHostSlotBinding | null,
  issues: string[],
): void {
  if (!isHostContentKind(content)) return;
  if (binding?.itemId) return;
  issues.push(`${label}: ${VC_CONTENT_LABELS[content]} — no catalog item selected`);
}

function checkCell(labelPrefix: string, cell: VcCellAssignment, issues: string[]): void {
  checkHostSlot(`${labelPrefix} primary`, cell.slotA, cell.hostSlotA, issues);
  if (cell.slotB && cell.slotB !== cell.slotA) {
    checkHostSlot(`${labelPrefix} secondary`, cell.slotB, cell.hostSlotB, issues);
  }
}

/** List all unresolved host content assignments for Start VC blocking. */
export function listUnresolvedHostAssignments(config: VcModeConfig): string[] {
  const issues: string[] = [];

  activeCells(config).forEach((cell, index) => {
    checkCell(`Area ${index + 1}`, cell, issues);
  });

  config.surface.floats.forEach((float, index) => {
    const cell = config.floatContent[float.id] ?? emptyCell();
    checkCell(`Float ${index + 1}`, cell, issues);
  });

  return issues;
}

/** Whether any host slot lacks a selected catalog item. */
export function hasUnresolvedHostAssignments(config: VcModeConfig): boolean {
  return listUnresolvedHostAssignments(config).length > 0;
}
