import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_VC_GRID_DESIGN } from '../vcMode/gridDesign';
import { createDefaultSurface, defaultCells, emptyCell, type VcModeConfig } from '../vcModeTypes';
import { migrateVcConfig } from './migrate';

const CUSTOM_VISUALIZER = 'custom-viz-id';

function sampleGridDesign() {
  return {
    ...DEFAULT_VC_GRID_DESIGN,
    backgroundColor: '#112233',
    gridLines: { ...DEFAULT_VC_GRID_DESIGN.gridLines, color: '#aabbcc', thicknessPx: 2 },
    floatLines: { ...DEFAULT_VC_GRID_DESIGN.floatLines, style: 'dashed' as const },
  };
}

function modernPersistedConfig(): Record<string, unknown> {
  return {
    surface: {
      templateId: 'double-vertical',
      dividers: { primaryVertical: 0.4 },
      floats: [
        {
          id: 'float-1',
          widthPct: 0.25,
          heightPct: 0.25,
          xPct: 0.05,
          yPct: 0.7,
          zIndex: 1,
        },
      ],
    },
    cells: [
      {
        slotA: 'cover',
        slotB: '',
        hostSlotA: null,
        hostSlotB: null,
        songSlotA: { overrides: { fitMode: 'max-x' } },
        songSlotB: null,
        cycleTime: null,
        transitionStyle: 'replace',
      },
      {
        slotA: 'host-graphic',
        slotB: '',
        hostSlotA: { itemId: 'graphic-1', overrides: { insetPct: 10 } },
        hostSlotB: null,
        songSlotA: null,
        songSlotB: null,
        cycleTime: null,
        transitionStyle: 'replace',
      },
      ...defaultCells().slice(2),
    ],
    floatContent: {
      'float-1': {
        slotA: 'song-title',
        slotB: '',
        hostSlotA: null,
        hostSlotB: null,
        songSlotA: { overrides: { allCaps: true } },
        songSlotB: null,
        cycleTime: null,
        transitionStyle: 'replace',
      },
    },
    visualizerId: CUSTOM_VISUALIZER,
    useFallbacks: false,
    gridDesign: sampleGridDesign(),
  };
}

test('migrateVcConfig returns normalized quad default for null input', () => {
  const config = migrateVcConfig(null);
  assert.equal(config.surface.templateId, 'quad');
  assert.equal(config.cells.length, 4);
  assert.equal(config.useFallbacks, true);
  assert.equal(config.visualizerId, 'spectrum');
  assert.deepEqual(config.surface.floats, []);
});

test('migrateVcConfig maps legacy gridStyle to surface templates', () => {
  const full = migrateVcConfig({ gridStyle: 'full', cells: [] });
  assert.equal(full.surface.templateId, 'single-screen');

  const quarters = migrateVcConfig({ gridStyle: 'quarters', cells: [] });
  assert.equal(quarters.surface.templateId, 'quad');

  const vertical = migrateVcConfig({ gridStyle: 'halves-vertical', cells: [] });
  assert.equal(vertical.surface.templateId, 'double-vertical');

  const horizontal = migrateVcConfig({ gridStyle: 'halves-horizontal', cells: [] });
  assert.equal(horizontal.surface.templateId, 'double-horizontal');
});

test('migrateVcConfig maps main-plus-2 to triple-striped-horizontal dividers', () => {
  const config = migrateVcConfig({ gridStyle: 'main-plus-2', cells: [] });
  assert.equal(config.surface.templateId, 'triple-striped-horizontal');
  assert.equal(config.surface.dividers.primaryHorizontal, 0.15);
  assert.equal(config.surface.dividers.secondaryHorizontal, 0.85);
});

test('migrateVcConfig preserves gridDesign, floats, and host bindings on modern configs', () => {
  const migrated = migrateVcConfig(modernPersistedConfig());

  assert.equal(migrated.surface.templateId, 'double-vertical');
  assert.equal(migrated.surface.floats.length, 1);
  assert.equal(migrated.surface.floats[0]?.id, 'float-1');
  assert.equal(migrated.gridDesign.backgroundColor, '#112233');
  assert.equal(migrated.gridDesign.gridLines.color, '#aabbcc');
  assert.equal(migrated.gridDesign.floatLines.style, 'dashed');
  assert.equal(migrated.useFallbacks, false);
  assert.equal(migrated.visualizerId, CUSTOM_VISUALIZER);

  assert.equal(migrated.cells[0]?.songSlotA?.overrides.fitMode, 'max-x');
  assert.equal(migrated.cells[1]?.hostSlotA?.itemId, 'graphic-1');
  assert.equal(migrated.cells[1]?.hostSlotA?.overrides.insetPct, 10);
  assert.equal(migrated.floatContent['float-1']?.songSlotA?.overrides.allCaps, true);
});

test('migrateVcConfig preserves visualizer rotation settings', () => {
  const migrated = migrateVcConfig({
    surface: createDefaultSurface('quad'),
    cells: defaultCells(),
    floatContent: {},
    visualizerId: 'aurora',
    visualizerChangeRule: 'click',
    visualizerSequence: 'random-builtin',
    useFallbacks: true,
  });

  assert.equal(migrated.visualizerChangeRule, 'never');
  assert.equal(migrated.visualizerAlsoClickToChange, true);
  assert.equal(migrated.visualizerSequence, 'random-builtin');
});

test('migrateVcConfig preserves visualizerAlsoClickToChange on modern configs', () => {
  const migrated = migrateVcConfig({
    ...modernPersistedConfig(),
    visualizerChangeRule: 'new-song',
    visualizerSequence: 'random-milkdrop',
    visualizerAlsoClickToChange: true,
  });

  assert.equal(migrated.visualizerChangeRule, 'new-song');
  assert.equal(migrated.visualizerSequence, 'random-milkdrop');
  assert.equal(migrated.visualizerAlsoClickToChange, true);
});

test('migrateVcConfig preserves showVisualizerName on modern configs', () => {
  const migrated = migrateVcConfig({
    ...modernPersistedConfig(),
    showVisualizerName: true,
  });

  assert.equal(migrated.showVisualizerName, true);
});

test('migrateVcConfig migrates legacy cell content strings through normalize', () => {
  const config = migrateVcConfig({
    surface: createDefaultSurface('quad'),
    cells: [{ slotA: 'host-graphic', slotB: 'visualizer' }],
    floatContent: {},
    visualizerId: CUSTOM_VISUALIZER,
    useFallbacks: true,
  });

  assert.equal(config.cells[0]?.slotA, 'host-graphic');
  assert.equal(config.cells[0]?.slotB, 'visualizer');
});

test('migrateVcConfig falls back to quad for unknown surface templateId', () => {
  const config = migrateVcConfig({
    surface: { templateId: 'not-a-template', dividers: {}, floats: [] },
    cells: defaultCells(),
    floatContent: {},
    visualizerId: CUSTOM_VISUALIZER,
    useFallbacks: true,
  });

  assert.equal(config.surface.templateId, 'quad');
});
