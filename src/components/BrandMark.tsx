/**
 * A brand's logo followed by its name, for the eyebrow line above a product
 * title.
 *
 * The name is always rendered. The logo is decorative (alt="") and simply
 * absent for brands with no logo file — G-Shock, Fastrack, Sonata, Carter
 * London and Titan Raga today — so those products look exactly as they did
 * before rather than showing a gap or a broken image.
 *
 * Deliberately a plain <img>, not next/image: most of these logos are SVGs and
 * the image optimiser rejects SVG unless dangerouslyAllowSVG is turned on,
 * which would apply to every remote image the admin can paste. These files are
 * a couple of KB and served straight from /public, so there is nothing for the
 * optimiser to save.
 *
 * The logo is capped below the line height it sits in, and callers use
 * inline-flex rather than flex, so the element keeps the inline sizing the
 * plain text had. On the product page the brand sits inside a link: a
 * block-level box there would have stretched the clickable area across the
 * whole row.
 */
export function BrandMark({
  name,
  logoUrl,
  className,
  logoClassName = "h-3.5 max-w-[52px]",
}: {
  name: string;
  logoUrl?: string;
  className?: string;
  logoClassName?: string;
}) {
  return (
    <span className={className}>
      {logoUrl ? (
        // These are 2 KB SVGs served from /public. next/image refuses SVG
        // unless dangerouslyAllowSVG is enabled, which would then apply to
        // every remote image the admin can paste — not a trade worth making
        // for files there is nothing to optimise in.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className={`inline-block w-auto shrink-0 object-contain align-[-0.15em] ${logoClassName}`}
        />
      ) : null}
      {name}
    </span>
  );
}
