import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_VC_GRID_DESIGN } from './gridDesign';
import { hasUnresolvedHostAssignments, listUnresolvedHostAssignments } from './assignmentValidation';
import { createDefaultSurface, defaultCells, emptyCell, normalizeVcConfig, type VcModeConfig } from '../vcModeTypes';

function baseConfig(overrides: Partial<VcModeConfig> = {}): VcModeConfig {
  return normalizeVcConfig({
    surface: createDefaultSurface('quad'),
    cells: defaultCells(),
    floatContent: {},
    visualizerId: 'aurora',
    useFallbacks: true,
    gridDesign: DEFAULT_VC_GRID_DESIGN,
    ...overrides,
  });
}

test('listUnresolvedHostAssignments returns empty when no host kinds assigned', () => {
  const issues = listUnresolvedHostAssignments(baseConfig());
  assert.deepEqual(issues, []);
  assert.equal(hasUnresolvedHostAssignments(baseConfig()), false);
});

test('listUnresolvedHostAssignments flags missing host catalog selection on base area', () => {
  const config = baseConfig({
    cells: [
      {
        ...emptyCell(),
        slotA: 'host-graphic',
        hostSlotA: null,
      },
      ...defaultCells().slice(1),
    ],
  });

  const issues = listUnresolvedHostAssignments(config);
  assert.equal(issues.length, 1);
  assert.match(issues[0]!, /Area 1 primary.*Host Graphic/i);
  assert.equal(hasUnresolvedHostAssignments(config), true);
});

test('listUnresolvedHostAssignments flags secondary host slot when distinct from primary', () => {
  const config = baseConfig({
    cells: [
      {
        ...emptyCell(),
        slotA: 'host-graphic',
        hostSlotA: { itemId: 'graphic-1', overrides: {} },
        slotB: 'host-title-text',
        hostSlotB: null,
        cycleTime: 15,
      },
      ...defaultCells().slice(1),
    ],
  });

  const issues = listUnresolvedHostAssignments(config);
  assert.equal(issues.length, 1);
  assert.match(issues[0]!, /Area 1 secondary.*Host Title Text/i);
});

test('listUnresolvedHostAssignments skips secondary check when slotB matches slotA', () => {
  const config = baseConfig({
    cells: [
      {
        ...emptyCell(),
        slotA: 'host-graphic',
        slotB: 'host-graphic',
        hostSlotA: { itemId: 'graphic-1', overrides: {} },
        hostSlotB: null,
        cycleTime: 15,
      },
      ...defaultCells().slice(1),
    ],
  });

  assert.deepEqual(listUnresolvedHostAssignments(config), []);
});

test('listUnresolvedHostAssignments includes floats', () => {
  const config = baseConfig({
    surface: {
      ...createDefaultSurface('quad'),
      floats: [{ id: 'float-1', widthPct: 0.2, heightPct: 0.2, xPct: 0.1, yPct: 0.1, zIndex: 1 }],
    },
    floatContent: {
      'float-1': {
        ...emptyCell(),
        slotA: 'host-area-text',
        hostSlotA: null,
      },
    },
  });

  const issues = listUnresolvedHostAssignments(config);
  assert.equal(issues.length, 1);
  assert.match(issues[0]!, /Float 1 primary/i);
});

test('listUnresolvedHostAssignments ignores inactive template areas beyond area count', () => {
  const config = baseConfig({
    surface: createDefaultSurface('single-screen'),
    cells: [
      defaultCells()[0]!,
      {
        ...emptyCell(),
        slotA: 'host-graphic',
        hostSlotA: null,
      },
      defaultCells()[2]!,
      defaultCells()[3]!,
    ],
  });

  assert.deepEqual(listUnresolvedHostAssignments(config), []);
});
