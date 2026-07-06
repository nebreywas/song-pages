import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_VC_GRID_DESIGN,
  buildRegionAppearanceLockPatch,
  captureRegionAppearanceSnapshot,
  hasActiveFullscreenGraphic,
  resolveAreaBackgroundColor,
  resolveFloatAppearance,
  resolveRegionBorder,
} from '../vcMode/gridDesign';

test('resolveAreaBackgroundColor uses grid default when no fullscreen graphic', () => {
  const gridDesign = { ...DEFAULT_VC_GRID_DESIGN };
  assert.equal(resolveAreaBackgroundColor({}, gridDesign), '#000000');
  assert.equal(resolveAreaBackgroundColor({ backgroundColor: '#112233' }, gridDesign), '#112233');
});

test('resolveAreaBackgroundColor forces transparent areas when fullscreen graphic is active', () => {
  const gridDesign = {
    ...DEFAULT_VC_GRID_DESIGN,
    fullscreenGraphic: { itemId: 'graphic-1', opacityPct: 80 },
  };
  assert.equal(hasActiveFullscreenGraphic(gridDesign), true);
  assert.equal(resolveAreaBackgroundColor({}, gridDesign), 'transparent');
  assert.equal(resolveAreaBackgroundColor({ backgroundColor: '#112233' }, gridDesign), 'transparent');
});

test('resolveAreaBackgroundColor restores defaults when fullscreen graphic is cleared', () => {
  const gridDesign = {
    ...DEFAULT_VC_GRID_DESIGN,
    fullscreenGraphic: { itemId: null, opacityPct: 100 },
  };
  assert.equal(hasActiveFullscreenGraphic(gridDesign), false);
  assert.equal(resolveAreaBackgroundColor({}, gridDesign), '#000000');
});

test('lockAppearanceToGrid ignores stored overrides for live rendering', () => {
  const gridDesign = {
    ...DEFAULT_VC_GRID_DESIGN,
    backgroundColor: '#000000',
    floatLines: { ...DEFAULT_VC_GRID_DESIGN.floatLines, color: '#5b9fd4', thicknessPx: 2 },
    floatBackground: { color: '#101010', opacityPct: 40 },
  };
  const draft = {
    backgroundColor: '#112233',
    borderColor: '#aabbcc',
    borderStyle: 'dashed' as const,
    borderThicknessPx: 5,
    backgroundOpacityPct: 80,
    contentOpacityPct: 50,
    lockAppearanceToGrid: true,
  };

  assert.equal(resolveAreaBackgroundColor(draft, gridDesign), '#000000');
  assert.equal(resolveFloatAppearance(draft, gridDesign).backgroundColor, '#101010');
  assert.equal(resolveFloatAppearance(draft, gridDesign).backgroundOpacityPct, 40);
  assert.equal(resolveFloatAppearance(draft, gridDesign).contentOpacityPct, 100);
  assert.equal(resolveRegionBorder(draft, gridDesign).color, '#5b9fd4');
  assert.equal(resolveRegionBorder(draft, gridDesign).thicknessPx, 2);
  assert.equal(resolveRegionBorder(draft, gridDesign).style, 'solid');
});

test('unlocking applies stored overrides again', () => {
  const gridDesign = { ...DEFAULT_VC_GRID_DESIGN };
  const unlocked = {
    backgroundColor: '#112233',
    borderColor: '#aabbcc',
    borderThicknessPx: 5,
    lockAppearanceToGrid: false,
  };
  assert.equal(resolveAreaBackgroundColor(unlocked, gridDesign), '#112233');
  assert.equal(resolveRegionBorder(unlocked, gridDesign).color, '#aabbcc');
  assert.equal(resolveRegionBorder(unlocked, gridDesign).thicknessPx, 5);
});

test('locking snapshots current values and unlock restores them', () => {
  const gridDesign = {
    ...DEFAULT_VC_GRID_DESIGN,
    floatLines: { ...DEFAULT_VC_GRID_DESIGN.floatLines, color: '#5b9fd4', thicknessPx: 1 },
    floatBackground: { color: '#000000', opacityPct: 0 },
  };
  const customized = {
    backgroundColor: '#112233',
    borderColor: '#aabbcc',
    borderThicknessPx: 5,
    backgroundOpacityPct: 80,
    contentOpacityPct: 50,
  };

  const locked = {
    ...customized,
    ...buildRegionAppearanceLockPatch(customized, gridDesign, true, 'float'),
  };

  assert.equal(locked.lockAppearanceToGrid, true);
  assert.ok(locked.savedRegionAppearance);
  assert.equal(locked.savedRegionAppearance?.backgroundColor, '#112233');
  assert.equal(locked.backgroundColor, undefined);
  assert.equal(resolveFloatAppearance(locked, gridDesign).backgroundColor, '#000000');
  assert.equal(resolveFloatAppearance(locked, gridDesign).backgroundOpacityPct, 0);

  const unlocked = {
    ...locked,
    ...buildRegionAppearanceLockPatch(locked, gridDesign, false, 'float'),
  };

  assert.equal(unlocked.lockAppearanceToGrid, false);
  assert.equal(unlocked.savedRegionAppearance, undefined);
  assert.equal(unlocked.backgroundColor, '#112233');
  assert.equal(unlocked.borderColor, '#aabbcc');
  assert.equal(unlocked.borderThicknessPx, 5);
  assert.equal(unlocked.backgroundOpacityPct, 80);
  assert.equal(unlocked.contentOpacityPct, 50);
  assert.equal(resolveFloatAppearance(unlocked, gridDesign).backgroundColor, '#112233');
  assert.equal(captureRegionAppearanceSnapshot(unlocked, gridDesign, 'float').backgroundColor, '#112233');
});
