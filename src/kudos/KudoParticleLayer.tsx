import type { ActiveKudoInstance } from './useKudoInstances';
import { KudoTintedIcon } from './KudoTintedIcon';

type KudoParticleLayerProps = {
  instances: ActiveKudoInstance[];
};

/** Renders active particle-style Kudo instances over the VC surface. */
export function KudoParticleLayer({ instances }: KudoParticleLayerProps) {
  return (
    <div className="vc-kudo-layer" aria-hidden="true">
      {instances.map((instance) => (
        <div key={instance.instanceId} className="vc-kudo-instance">
          {instance.particles.map((particle) => {
            const scale = particle.displayScale ?? 1;
            const scaleX = particle.displayScaleX ?? 1;
            const isComet = instance.config.effectId === 'comet';

            return (
            <div
              key={particle.id}
              className={`vc-kudo-particle${particle.contentKind === 'emoji' ? ' is-emoji' : ' is-image'}${isComet ? ' is-comet' : ''}`}
              style={{
                left: particle.x,
                top: particle.y,
                width: particle.size,
                height: particle.size,
                opacity: particle.opacity,
                fontSize: particle.contentKind === 'emoji' ? particle.size : undefined,
                transform: `translate(-50%, -50%) rotate(${particle.rotation}deg) scale(${scale * scaleX}, ${scale})`,
              }}
            >
              {particle.contentKind === 'image' ? (
                particle.tintColor && particle.assetVariant ? (
                  <KudoTintedIcon
                    src={particle.content}
                    tintColor={particle.tintColor}
                    variant={particle.assetVariant}
                  />
                ) : (
                  <img src={particle.content} alt="" draggable={false} />
                )
              ) : (
                <span>{particle.content}</span>
              )}
            </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
