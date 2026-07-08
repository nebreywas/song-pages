import {
  KUDOS_PARTICLE_COUNT_MAX,
  KUDOS_PARTICLE_COUNT_MIN,
  listShippedParticleEffects,
  resolveParticleCount,
  type ParticleKudoConfig,
} from '@shared/kudos';

import { KudoBuiltinElementsEditor } from './KudoBuiltinElementsEditor';
import { KudoEmojiElementsEditor } from './KudoEmojiElementsEditor';
import { KudoIconColorControls } from './KudoIconColorControls';

const SHIPPED_PARTICLE_EFFECTS = listShippedParticleEffects();

type KudoParticleEditorProps = {
  /** Hybrid presets use built-in icon particles by default. */
  contentType: 'builtin-assets' | 'emoji' | 'hybrid';
  particle: ParticleKudoConfig;
  onChange: (patch: Partial<ParticleKudoConfig>) => void;
};

/** Shared particle Kudo authoring controls (spec §17.2). */
export function KudoParticleEditor({ contentType, particle, onChange }: KudoParticleEditorProps) {
  const particleCount = resolveParticleCount(particle);
  const usesBuiltinIcons = contentType === 'builtin-assets' || contentType === 'hybrid';

  return (
    <div className="vc-kudos-particle-editor">
      {usesBuiltinIcons ? (
        <KudoBuiltinElementsEditor elements={particle.elements} onChange={(elements) => onChange({ elements })} />
      ) : (
        <KudoEmojiElementsEditor elements={particle.elements} onChange={(elements) => onChange({ elements })} />
      )}

      <label className="vc-field">
        <span>Effect</span>
        <select value={particle.effectId} onChange={(e) => onChange({ effectId: e.target.value })}>
          {SHIPPED_PARTICLE_EFFECTS.map((effect) => (
            <option key={effect.id} value={effect.id}>
              {effect.label}
            </option>
          ))}
        </select>
      </label>

      <label className="vc-field">
        <span>Length ({Math.round(particle.durationMs / 100) / 10}s)</span>
        <input
          type="range"
          min={750}
          max={8000}
          step={250}
          value={particle.durationMs}
          onChange={(e) => onChange({ durationMs: Number(e.target.value) })}
        />
      </label>

      <label className="vc-field">
        <span>Speed</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={particle.speed}
          onChange={(e) => onChange({ speed: Number(e.target.value) })}
        />
      </label>

      <label className="vc-field">
        <span>Particle count ({particleCount})</span>
        <input
          type="range"
          min={KUDOS_PARTICLE_COUNT_MIN}
          max={KUDOS_PARTICLE_COUNT_MAX}
          step={1}
          value={particleCount}
          onChange={(e) => onChange({ particleCount: Number(e.target.value) })}
        />
      </label>

      <label className="vc-field">
        <span>Size</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={particle.size}
          onChange={(e) => onChange({ size: Number(e.target.value) })}
        />
      </label>

      <label className="vc-field">
        <span>Variation</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={particle.variation}
          onChange={(e) => onChange({ variation: Number(e.target.value) })}
        />
      </label>

      <label className="vc-field">
        <span>Origin</span>
        <select value={particle.origin} onChange={(e) => onChange({ origin: e.target.value as typeof particle.origin })}>
          <option value="auto">Auto</option>
          <option value="center">Center</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
          <option value="random">Random</option>
        </select>
      </label>

      {usesBuiltinIcons ? <KudoIconColorControls particle={particle} onChange={onChange} /> : null}
    </div>
  );
}
