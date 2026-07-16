import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addCommandToConfiguredSet,
  applyCommandBindingPatch,
  createDefaultCommandMappingState,
  listCatalogCommands,
  listConfiguredActionRows,
  resolveBindingToCommand,
  surfaceCommandIdForDesign,
} from './index';

const designs = [
  { id: 'design-a', name: 'Main Floor' },
  { id: 'design-b', name: 'Intimate' },
];

test('listCatalogCommands includes a Surface entry for each design', () => {
  const catalog = listCatalogCommands([], designs);
  const main = catalog.find((row) => row.id === surfaceCommandIdForDesign('design-a'));
  assert.ok(main);
  assert.equal(main?.label, 'Surface: Main Floor');
  assert.equal(main?.category, 'surfaces');
});

test('surface switch commands store bindings and resolve like kudos', () => {
  let state = createDefaultCommandMappingState();
  const commandId = surfaceCommandIdForDesign('design-a');
  state = addCommandToConfiguredSet(state, commandId);
  state = applyCommandBindingPatch(state, commandId, { gated: 'm' });

  assert.deepEqual(state.configuredSurfaceDesignIds, ['design-a']);
  assert.equal(state.surfaceDesignBindings['design-a']?.gated, 'm');

  const resolved = resolveBindingToCommand(state, 'gated', 'm');
  assert.equal(resolved?.commandId, commandId);

  const rows = listConfiguredActionRows(state, [], designs);
  const surfaceRow = rows.find((row) => row.commandId === commandId);
  assert.ok(surfaceRow);
  assert.equal(surfaceRow?.label, 'Surface: Main Floor');
  assert.equal(surfaceRow?.slot.gated, 'm');
});
