import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDefaultVcConfig } from '../../src/vc-mode/vcModeDefaults';
import {
  buildVcSurfaceDesignCatalog,
  hasSurfaceCustomization,
  migrateVcSurfaceDesignCatalog,
  sanitizeVcSurfaceDesignCatalogForSave,
} from './migrate';
import {
  applyActiveDesignConfigUpdate,
  applyDesignProjectionWindowUpdate,
  resolveProjectionWindowForDesign,
} from './catalogOps';

test('migrateVcSurfaceDesignCatalog wraps legacy vc.lastConfig as Default', () => {
  const legacy = createDefaultVcConfig('quad');
  const catalog = migrateVcSurfaceDesignCatalog(null, legacy);
  assert.equal(catalog.designs.length, 1);
  assert.equal(catalog.designs[0]?.name, 'Default');
  assert.equal(catalog.designs[0]?.config.surface.templateId, 'quad');
  assert.equal(catalog.activeDesignId, catalog.designs[0]?.id);
});

test('migrateVcSurfaceDesignCatalog keeps saved designs and active id', () => {
  const legacy = createDefaultVcConfig('single-screen');
  const first = migrateVcSurfaceDesignCatalog(null, legacy);
  const secondDesign = {
    ...first.designs[0]!,
    id: 'surface-b',
    name: 'Wide',
    config: createDefaultVcConfig('double-vertical'),
  };
  const catalog = migrateVcSurfaceDesignCatalog(
    {
      version: 1,
      activeDesignId: 'surface-b',
      designs: [first.designs[0], secondDesign],
    },
    legacy,
  );
  assert.equal(catalog.designs.length, 2);
  assert.equal(catalog.activeDesignId, 'surface-b');
  assert.equal(catalog.designs[1]?.name, 'Wide');
});

test('reconcile restores legacy vc.lastConfig into stock Default catalog', () => {
  const legacy = createDefaultVcConfig('quad');
  legacy.cells[0] = { ...legacy.cells[0]!, slotA: 'cover' };

  const stockCatalog = buildVcSurfaceDesignCatalog(null, createDefaultVcConfig('quad'));
  const raw = {
    version: 1,
    activeDesignId: stockCatalog.activeDesignId,
    designs: stockCatalog.designs,
  };

  const recovered = migrateVcSurfaceDesignCatalog(raw, legacy);
  assert.equal(recovered.designs[0]?.config.cells[0]?.slotA, 'cover');
});

test('hasSurfaceCustomization detects divider layout changes', () => {
  const stock = createDefaultVcConfig('quad');
  assert.equal(hasSurfaceCustomization(stock), false);

  const customized = createDefaultVcConfig('quad');
  customized.surface.dividers.primaryVertical = 0.35;
  assert.equal(hasSurfaceCustomization(customized), true);
});

test('sanitizeVcSurfaceDesignCatalogForSave preserves divider layout', () => {
  const config = createDefaultVcConfig('quad');
  config.surface.dividers.primaryVertical = 0.35;
  const catalog = migrateVcSurfaceDesignCatalog(null, config);
  const saved = sanitizeVcSurfaceDesignCatalogForSave(catalog);
  assert.equal(saved.designs[0]?.config.surface.dividers.primaryVertical, 0.35);
});

test('applyActiveDesignConfigUpdate writes config into active design only', () => {
  const legacy = createDefaultVcConfig('quad');
  const catalog = migrateVcSurfaceDesignCatalog(null, legacy);
  const second = {
    ...catalog.designs[0]!,
    id: 'surface-b',
    name: 'Wide',
    config: createDefaultVcConfig('double-vertical'),
  };
  const multi = migrateVcSurfaceDesignCatalog(
    {
      version: 1,
      activeDesignId: catalog.activeDesignId,
      designs: [catalog.designs[0], second],
    },
    legacy,
  );

  const edited = createDefaultVcConfig('quad');
  edited.surface.dividers.primaryVertical = 0.33;
  const updated = applyActiveDesignConfigUpdate(multi, edited);
  const active = updated.designs.find((design) => design.id === updated.activeDesignId);
  const other = updated.designs.find((design) => design.id === second.id);

  assert.equal(active?.config.surface.dividers.primaryVertical, 0.33);
  assert.notEqual(other?.config.surface.templateId, 'quad');
});

test('applyDesignProjectionWindowUpdate stores bounds on one design only', () => {
  const legacy = createDefaultVcConfig('quad');
  const catalog = migrateVcSurfaceDesignCatalog(null, legacy);
  const second = {
    ...catalog.designs[0]!,
    id: 'surface-b',
    name: 'Wide',
    config: createDefaultVcConfig('double-vertical'),
  };
  const multi = migrateVcSurfaceDesignCatalog(
    {
      version: 1,
      activeDesignId: catalog.activeDesignId,
      designs: [catalog.designs[0], second],
    },
    legacy,
  );

  const bounds = { x: 40, y: 60, width: 1280, height: 720 };
  const updated = applyDesignProjectionWindowUpdate(multi, catalog.activeDesignId, bounds);
  const active = updated.designs.find((design) => design.id === catalog.activeDesignId);
  const other = updated.designs.find((design) => design.id === second.id);

  assert.deepEqual(active?.config.projectionWindow, bounds);
  assert.equal(other?.config.projectionWindow, undefined);
});

test('resolveProjectionWindowForDesign does not fall back across designs', () => {
  const legacy = createDefaultVcConfig('quad');
  const catalog = migrateVcSurfaceDesignCatalog(null, legacy);
  const second = {
    ...catalog.designs[0]!,
    id: 'surface-b',
    name: 'Wide',
    config: createDefaultVcConfig('double-vertical'),
  };
  const multi = migrateVcSurfaceDesignCatalog(
    {
      version: 1,
      activeDesignId: 'surface-b',
      designs: [
        {
          ...catalog.designs[0]!,
          config: {
            ...catalog.designs[0]!.config,
            projectionWindow: { x: 0, y: 0, width: 1600, height: 900 },
          },
        },
        second,
      ],
    },
    legacy,
  );

  const activeConfig = createDefaultVcConfig('double-vertical');
  assert.equal(
    resolveProjectionWindowForDesign(activeConfig, multi),
    undefined,
  );
  assert.deepEqual(
    resolveProjectionWindowForDesign(activeConfig, multi, catalog.designs[0]!.id),
    { x: 0, y: 0, width: 1600, height: 900 },
  );
});
