import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_VC_GRID_DESIGN,
  areFloatLinesVisible,
  areGridLinesVisible,
  buildRegionAppearanceLockPatch,
  captureRegionAppearanceSnapshot,
  floatAppearanceCss,
  gridDividerCss,
  hasActiveFullscreenGraphic,
  patchRegionBorderControls,
  resolveAreaBackgroundColor,
  resolveFloatAppearance,
  resolveFloatAppearanceDraft,
  resolveRegionBorder,
  resolveRegionBorderDraft,
} from '../vcMode/gridDesign';
import { defaultCells, normalizeVcConfig } from '../vcModeTypes';

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

test('opacity-only float overrides do not inherit grid float line border', () => {
  const gridDesign = {
    ...DEFAULT_VC_GRID_DESIGN,
    floatLines: { ...DEFAULT_VC_GRID_DESIGN.floatLines, thicknessPx: 2 },
  };
  const opacityOnly = { backgroundOpacityPct: 60 };
  assert.equal(resolveRegionBorder(opacityOnly, gridDesign).thicknessPx, 0);
  assert.equal(resolveRegionBorderDraft(opacityOnly, gridDesign).thicknessPx, 0);
});

test('opacity-only float with explicit border keeps draft thickness in editor', () => {
  const gridDesign = {
    ...DEFAULT_VC_GRID_DESIGN,
    floatLines: { ...DEFAULT_VC_GRID_DESIGN.floatLines, thicknessPx: 2 },
  };
  const withBorder = { backgroundOpacityPct: 60, borderThicknessPx: 4 };
  assert.equal(resolveRegionBorderDraft(withBorder, gridDesign).thicknessPx, 4);
});

test('opacity-only float can still set an explicit border for live render', () => {
  const gridDesign = {
    ...DEFAULT_VC_GRID_DESIGN,
    floatLines: { ...DEFAULT_VC_GRID_DESIGN.floatLines, thicknessPx: 2 },
  };
  const withBorder = { backgroundOpacityPct: 60, borderThicknessPx: 4 };
  assert.equal(resolveRegionBorder(withBorder, gridDesign).thicknessPx, 4);
});

test('patchRegionBorderControls keeps custom color when thickness changes', () => {
  const gridDesign = {
    ...DEFAULT_VC_GRID_DESIGN,
    floatLines: { ...DEFAULT_VC_GRID_DESIGN.floatLines, thicknessPx: 0, color: '#5b9fd4' },
  };
  const float = { borderColor: '#ff0000', borderThicknessPx: 3 };
  const patch = patchRegionBorderControls(float, gridDesign, { borderThicknessPx: 5 });
  assert.equal(patch.borderColor, '#ff0000');
  assert.equal(patch.borderThicknessPx, 5);
});

test('patchRegionBorderControls keeps custom thickness when color changes', () => {
  const gridDesign = {
    ...DEFAULT_VC_GRID_DESIGN,
    floatLines: { ...DEFAULT_VC_GRID_DESIGN.floatLines, thicknessPx: 0, color: '#5b9fd4' },
  };
  const float = { borderThicknessPx: 4 };
  const patch = patchRegionBorderControls(float, gridDesign, { borderColor: '#ff0000' });
  assert.equal(patch.borderColor, '#ff0000');
  assert.equal(patch.borderThicknessPx, 4);
});

test('floats without appearance overrides still use grid float lines', () => {
  const gridDesign = {
    ...DEFAULT_VC_GRID_DESIGN,
    floatLines: { ...DEFAULT_VC_GRID_DESIGN.floatLines, thicknessPx: 2 },
  };
  assert.equal(resolveRegionBorder({}, gridDesign).thicknessPx, 2);
});

test('locked float popover and live render both follow grid float background', () => {
  const gridDesign = {
    ...DEFAULT_VC_GRID_DESIGN,
    floatBackground: { color: '#000000', opacityPct: 0 },
  };
  const locked = {
    lockAppearanceToGrid: true,
    savedRegionAppearance: {
      backgroundColor: '#000000',
      borderColor: gridDesign.floatLines.color,
      borderStyle: gridDesign.floatLines.style,
      borderThicknessPx: 0,
      backgroundOpacityPct: 70,
    },
  };
  const css = floatAppearanceCss(locked, gridDesign);
  assert.equal(resolveFloatAppearanceDraft(locked, gridDesign).backgroundOpacityPct, 0);
  assert.equal(css.region.background, 'transparent');
});

test('explicit float background color without opacity renders solid', () => {
  const gridDesign = {
    ...DEFAULT_VC_GRID_DESIGN,
    floatBackground: { color: '#000000', opacityPct: 0 },
  };
  const colorOnly = { backgroundColor: '#000000' };
  assert.equal(resolveFloatAppearance(colorOnly, gridDesign).backgroundOpacityPct, 100);
  assert.equal(floatAppearanceCss(colorOnly, gridDesign).region.background, 'rgba(0, 0, 0, 1)');
});

test('normalizeVcConfig drops redundant per-float opacity matching grid default', () => {
  const gridDesign = {
    ...DEFAULT_VC_GRID_DESIGN,
    floatBackground: { color: '#000000', opacityPct: 50 },
  };
  const config = normalizeVcConfig({
    surface: {
      templateId: 'quad',
      dividers: {},
      floats: [
        {
          id: 'float-1',
          x: 0.1,
          y: 0.1,
          width: 0.3,
          height: 0.3,
          zIndex: 1,
          backgroundOpacityPct: 50,
        },
      ],
    },
    cells: defaultCells(),
    floatContent: {},
    visualizerId: 'bars',
    useFallbacks: true,
    gridDesign,
  });
  assert.equal(config.surface.floats[0]?.backgroundOpacityPct, undefined);
  assert.equal(resolveFloatAppearance(config.surface.floats[0]!, config.gridDesign).backgroundOpacityPct, 50);
});

test('areFloatLinesVisible is false when thickness is zero', () => {
  assert.equal(
    areFloatLinesVisible({ ...DEFAULT_VC_GRID_DESIGN.floatLines, thicknessPx: 0 }),
    false,
  );
  assert.equal(areFloatLinesVisible({ ...DEFAULT_VC_GRID_DESIGN.floatLines, thicknessPx: 1 }), true);
});

test('areGridLinesVisible is false when thickness is zero', () => {
  assert.equal(
    areGridLinesVisible({ ...DEFAULT_VC_GRID_DESIGN.gridLines, thicknessPx: 0 }),
    false,
  );
  assert.equal(areGridLinesVisible({ ...DEFAULT_VC_GRID_DESIGN.gridLines, thicknessPx: 1 }), true);
});

test('gridDividerCss hides live dividers when thickness is zero', () => {
  const hidden = gridDividerCss('horizontal', {
    ...DEFAULT_VC_GRID_DESIGN.gridLines,
    thicknessPx: 0,
  });
  assert.equal(hidden.display, 'none');
});

test('gridDividerCss keeps invisible designer hit area when thickness is zero', () => {
  const hidden = gridDividerCss(
    'horizontal',
    { ...DEFAULT_VC_GRID_DESIGN.gridLines, thicknessPx: 0 },
    { preserveHitAreaPx: 12 },
  );
  assert.equal(hidden.opacity, 0);
  assert.equal(hidden.height, '12px');
  assert.equal(hidden.pointerEvents, 'auto');
});
