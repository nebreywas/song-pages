/**
 * Commands that work without VC Mode — player volume, visualizer stepping, DJ playback, etc.
 * Keep in sync with electron/commands/commandService.js MAIN_PLAYBACK_BY_COMMAND.
 */
export const APP_WIDE_COMMAND_IDS = [
  'volume-up',
  'volume-down',
  'visualizer-next',
  'visualizer-previous',
  'toggle-live-debug',
  'seek-back-500',
  'seek-back-1s',
  'seek-back-2s',
  'seek-back-5s',
  'stutter-500',
  'stutter-1000',
  'stutter-1500',
  'stutter-2000',
  'play-next-song',
] as const;

export function isAppWideCommand(commandId: string): boolean {
  return (APP_WIDE_COMMAND_IDS as readonly string[]).includes(commandId);
}
