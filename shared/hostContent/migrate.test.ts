import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HOST_FALLBACK_SLOT_IDS } from './constants';
import {
  findHostContentItem,
  listItemsByType,
  migrateHostContentCatalog,
  userHostContentItems,
} from './migrate';

test('migrateHostContentCatalog returns default fallbacks for null input', () => {
  const catalog = migrateHostContentCatalog(null);

  assert.equal(catalog.version, 1);
  assert.equal(catalog.items.length, HOST_FALLBACK_SLOT_IDS.length);
  for (const slotId of HOST_FALLBACK_SLOT_IDS) {
    const fallback = catalog.items.find(
      (item) => item.type === 'fallback' && item.slotId === slotId,
    );
    assert.ok(fallback, `missing fallback for ${slotId}`);
  }
});

test('migrateHostContentCatalog preserves valid user items alongside fallbacks', () => {
  const catalog = migrateHostContentCatalog({
    version: 1,
    items: [
      {
        id: 'graphic-1',
        name: 'MyLogo',
        type: 'graphic',
        role: 'logo',
        mediaPath: '/tmp/logo.png',
        widthPx: 800,
        heightPx: 600,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'title-1',
        name: 'ShowTitle',
        type: 'title-text',
        role: 'headline',
        text: 'Welcome to the show',
        fontStyle: 'bold',
        fontSize: 'large',
        color: '#ffcc00',
        allCaps: true,
        overflow: 'restart',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  });

  assert.equal(userHostContentItems(catalog).length, 2);
  assert.equal(findHostContentItem(catalog, 'graphic-1')?.type, 'graphic');
  assert.equal(listItemsByType(catalog, 'title-text').length, 1);

  for (const slotId of HOST_FALLBACK_SLOT_IDS) {
    const fallback = catalog.items.find(
      (item) => item.type === 'fallback' && item.slotId === slotId,
    );
    assert.ok(fallback);
  }
});

test('migrateHostContentCatalog normalizes names and truncates text fields', () => {
  const catalog = migrateHostContentCatalog({
    items: [
      {
        id: 'title-long',
        name: '  My_Show_Title  ',
        type: 'title-text',
        text: 'x'.repeat(80),
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'area-long',
        name: 'notes',
        type: 'area-text',
        text: 'y'.repeat(1200),
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  });

  const title = listItemsByType(catalog, 'title-text')[0];
  assert.equal(title?.name, 'my_show_title');
  assert.equal(title?.text.length, 36);

  const area = listItemsByType(catalog, 'area-text')[0];
  assert.equal(area?.text.length, 1000);
});

test('migrateHostContentCatalog drops invalid items but keeps fallbacks', () => {
  const catalog = migrateHostContentCatalog({
    items: [
      { id: '', name: 'bad', type: 'graphic' },
      { id: 'bad-fallback', name: 'bad', type: 'fallback', slotId: 'not-real' },
      {
        id: 'good-group',
        name: 'group1',
        type: 'graphics-group',
        memberIds: ['graphic-1', 42, 'graphic-2'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  });

  assert.equal(userHostContentItems(catalog).length, 1);
  const group = listItemsByType(catalog, 'graphics-group')[0];
  assert.deepEqual(group?.memberIds, ['graphic-1', 'graphic-2']);
});

test('migrateHostContentCatalog merges custom fallback rows by slotId', () => {
  const catalog = migrateHostContentCatalog({
    items: [
      {
        id: 'fallback-cover',
        name: 'cover_fb',
        type: 'fallback',
        slotId: 'cover',
        enabled: false,
        resetToSystemDefault: true,
        linkedContentId: 'graphic-1',
        textFields: ['a', 'b', 'c', 'd'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  });

  const coverFallback = catalog.items.find(
    (item) => item.type === 'fallback' && item.slotId === 'cover',
  );
  assert.equal(coverFallback?.enabled, false);
  assert.equal(coverFallback?.resetToSystemDefault, true);
  assert.equal(coverFallback?.linkedContentId, 'graphic-1');
  assert.deepEqual(coverFallback?.textFields, ['a', 'b', 'c', 'd']);
});
