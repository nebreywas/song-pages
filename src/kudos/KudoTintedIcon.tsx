import type { KudoAssetVariant } from '../catalog/kudoAssetCatalog.generated';

type KudoTintedIconProps = {
  src: string;
  tintColor: string;
  variant: KudoAssetVariant;
};

/**
 * Tint built-in kudo PNGs — flat uses a mask fill; grays keeps internal shading via blend.
 */
export function KudoTintedIcon({ src, tintColor, variant }: KudoTintedIconProps) {
  if (variant === 'grays') {
    const mask = `url("${src}")`;
    return (
      <span className="vc-kudo-tinted-shaded">
        <img src={src} alt="" draggable={false} />
        <span
          className="vc-kudo-tinted-shaded-overlay"
          style={{
            backgroundColor: tintColor,
            WebkitMaskImage: mask,
            maskImage: mask,
          }}
          aria-hidden="true"
        />
      </span>
    );
  }

  return (
    <span
      className="vc-kudo-tinted-flat"
      style={{
        backgroundColor: tintColor,
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
      }}
      role="presentation"
    />
  );
}
