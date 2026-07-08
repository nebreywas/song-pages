import type { VcHotkeyAction } from '../vcModeTypes';

export type CommandInputSource = 'direct' | 'gated' | 'extended-function' | 'controller-ui';

export type CommandExecutionResult =
  | 'executed'
  | 'unavailable'
  | 'not-found'
  | 'binding-unregistered'
  | 'gate-timeout'
  | 'gate-abort'
  | 'unmapped-gated-key'
  | 'vc-inactive';

export interface CommandAvailability {
  player?: boolean;
  projection?: boolean;
  vcMode?: boolean;
  /** Overlay only meaningful when a next track exists in the queue. */
  requiresNextSong?: boolean;
  /** Overlay only meaningful when upcoming queue has entries. */
  requiresUpcomingSongs?: boolean;
  requiresCurrentSong?: boolean;
  requiresCoverArt?: boolean;
  requiresHostGraphic?: boolean;
  /** Elapsed/remaining overlay needs active playback timing. */
  requiresPlaybackTiming?: boolean;
}

/** Dev-level rules for whether a host can remove or clear bindings. */
export interface CommandBindingPolicy {
  /** Host cannot remove this action from Key Bindings. */
  requiredInConfig?: boolean;
  /** At least one binding must remain across all layers. */
  requireAtLeastOneBinding?: boolean;
  /** Seeded when restoring factory defaults. */
  defaultBindings?: Partial<CommandBindings>;
  /** Individual layers that cannot be cleared by the host. */
  lockedBindings?: Partial<Record<'direct' | 'gated' | 'extendedFunction', boolean>>;
}

export interface CommandBindings {
  direct?: string;
  gated?: string;
  extendedFunction?: string;
}

/** Stable registry entry — bindings live in persisted mapping state. */
export interface CommandDefinition {
  id: string;
  label: string;
  description?: string;
  category: string;
  availability?: CommandAvailability;
  bindingPolicy?: CommandBindingPolicy;
  /** Maps to legacy vc:hotkey action until fully migrated. */
  legacyAction?: VcHotkeyAction;
}

export interface CommandInvocation {
  commandId: string;
  source: CommandInputSource;
  binding: string;
  timestamp: number;
}

export interface CommandBindingSlot {
  direct?: string;
  gated?: string;
  extendedFunction?: string;
}

/** Reserved binding keys available for Kudo assignment in the designer. */
export type ReservedBindingKey = string;

export interface CommandMappingState {
  version: number;
  gateTimeoutMs: number;
  /** Builtin VC commands included in the host's Key Bindings setup. */
  configuredCommandIds: string[];
  /** Kudo preset ids included in the host's Key Bindings setup. */
  configuredKudoPresetIds: string[];
  commands: Record<string, CommandBindingSlot>;
  /** Keys marked "Reserve for Kudos" in Key Bindings (e.g. `gated:H`, `extended:F17`). */
  reservedKudoKeys: ReservedBindingKey[];
  /** Reserved key → Kudo preset id. */
  kudoPresetByReservedKey: Record<ReservedBindingKey, string>;
  /** Per-preset command bindings when not using reserved-key indirection. */
  kudoPresetBindings: Record<string, CommandBindingSlot>;
}

export interface SafeHotkeyDefinition {
  id: string;
  logicalBinding: string;
  macBinding: string;
  windowsBinding: string;
  auditVersion: string;
  enabled: boolean;
}

export interface RegisteredBindingStatus {
  binding: string;
  commandId: string;
  source: CommandInputSource;
  registered: boolean;
  failureReason?: string;
}

/** One row in the dynamic gate overlay (controller + settings preview). */
export interface CommandOverlayRow {
  key: string;
  label: string;
  commandId: string;
  available: boolean;
}
