/**
 * Main-process command availability checks.
 * Keep contextual rules in sync with shared/commands/catalog.ts availability fields.
 */

/** @typedef {import('../../shared/commands/runtimeContext').CommandRuntimeContext} CommandRuntimeContext */

const CONTEXTUAL_RULES = {
  'toggle-next-overlay': ['requiresNextSong'],
  'toggle-upcoming': ['requiresUpcomingSongs'],
  'toggle-song-info': ['requiresCurrentSong'],
  'toggle-cover': ['requiresCoverArt'],
  'toggle-host': ['requiresHostGraphic'],
  'toggle-remaining': ['requiresPlaybackTiming'],
};

const CONTEXT_FLAG_BY_RULE = {
  requiresNextSong: 'hasNextSong',
  requiresUpcomingSongs: 'hasUpcomingSongs',
  requiresCurrentSong: 'hasCurrentSong',
  requiresCoverArt: 'hasCoverArt',
  requiresHostGraphic: 'hasHostGraphic',
  requiresPlaybackTiming: 'hasPlaybackTiming',
};

/**
 * @param {string} commandId
 * @param {CommandRuntimeContext} context
 */
function isCommandAvailableForDispatch(commandId, context) {
  if (commandId === 'toggle-vc-command-gate') {
    return context.vcModeActive !== false;
  }

  const presetPrefix = 'trigger-kudo-';
  if (commandId.startsWith(presetPrefix)) {
    return context.vcModeActive !== false;
  }

  if (context.vcModeActive === false) return false;

  const rules = CONTEXTUAL_RULES[commandId];
  if (!rules) return true;

  for (const rule of rules) {
    const flag = CONTEXT_FLAG_BY_RULE[rule];
    if (flag && context[flag] === false) return false;
  }

  return true;
}

module.exports = {
  isCommandAvailableForDispatch,
};
