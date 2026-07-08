import type { HostFontStyleId } from '@shared/hostContent/types';

import type { ActiveTextKudoInstance } from './useKudoTextInstances';
import { KudoPhraseContent } from './text/KudoPhraseContent';
import { kudoTextTypography } from './text/typography';

type KudoTextLayerProps = {
  instances: ActiveTextKudoInstance[];
};

/** Renders active text-style Kudo instances over the VC surface. */
export function KudoTextLayer({ instances }: KudoTextLayerProps) {
  return (
    <div className="vc-kudo-text-layer" aria-hidden="true">
      {instances.map((instance) => {
        const { config, placement, frame, fontSizePx, opacity, preserveEmojiColors } = instance;
        const textStyle = kudoTextTypography(
          config.fontId as HostFontStyleId,
          fontSizePx,
          config.textColor ?? '#ffffff',
          config.outline,
          config.shadow,
        );

        const phrase = (
          <KudoPhraseContent
            phrase={frame.visibleText}
            textStyle={textStyle}
            preserveEmojiColors={preserveEmojiColors}
            graphemeOffsets={frame.graphemeOffsets}
          />
        );

        return (
          <div
            key={instance.instanceId}
            className="vc-kudo-text-instance"
            style={{
              left: placement.left,
              top: placement.top,
              transform: `translate(${placement.translate})`,
              textAlign: placement.textAlign,
              opacity: opacity * frame.opacity,
            }}
          >
            <div className="vc-kudo-text-effect" style={{ transform: frame.transform }}>
              {frame.echoLayers.map((layer, index) => (
                <span
                  key={index}
                  className="vc-kudo-text-echo"
                  style={{
                    transform: `translate(${layer.offsetX}px, ${layer.offsetY}px)`,
                    opacity: layer.opacity,
                  }}
                >
                  {phrase}
                </span>
              ))}
              <span className="vc-kudo-text-main">{phrase}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
