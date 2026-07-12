/**
 * Generic external-provider intake types.
 *
 * Song Pages is playlist-centric: a provider contributes a single canonical work
 * reference (one track / one video), not a browsing session on the provider site.
 */

export type ProviderId = 'youtube' | 'flow';

/** Stable identity for one work on an external provider. */
export type CanonicalWorkRef = {
  provider: ProviderId;
  /** Provider-native primary key (YouTube video id, Suno clip uuid, …). */
  externalId: string;
};

export type ProviderIntakeError = {
  ok: false;
  error: string;
};

export type ProviderIntakeSuccess<TRef extends CanonicalWorkRef> = {
  ok: true;
  ref: TRef;
};

export type ProviderIntakeResult<TRef extends CanonicalWorkRef> =
  | ProviderIntakeSuccess<TRef>
  | ProviderIntakeError;

/**
 * Provider intake contract — future providers (e.g. SoundCloud) implement
 * the same surface without leaking provider details into ListenerMode transport.
 */
export type ProviderIntake<TRef extends CanonicalWorkRef, TMetadata> = {
  readonly provider: ProviderId;
  validate(input: string): boolean;
  canonicalize(input: string): ProviderIntakeResult<TRef>;
  /** Officially supported metadata fetch at intake time (may be partial). */
  extractMetadata(ref: TRef): Promise<ProviderMetadataResult<TMetadata>>;
};

export type ProviderMetadataSuccess<TMetadata> = {
  ok: true;
  metadata: TMetadata;
};

export type ProviderMetadataResult<TMetadata> =
  | ProviderMetadataSuccess<TMetadata>
  | ProviderIntakeError;

/** Where each metadata field was obtained — useful for caching and refresh policy. */
export type MetadataProvenance = {
  title?: MetadataSource;
  channelName?: MetadataSource;
  durationSeconds?: MetadataSource;
  thumbnailUrl?: MetadataSource;
};

export type MetadataSource =
  | 'intake-oembed'
  | 'intake-derived'
  | 'playback-iframe'
  | 'snapshot-cache'
  | 'fallback';
