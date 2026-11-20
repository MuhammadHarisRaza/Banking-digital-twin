import { useMemo } from "react";
import { useSettings } from "../store/settingsStore";
import { isBundledBank } from "./brandMatch";
import { resolveImage } from "./images";

/** The bank's name, logo and wording, resolved for display. */
export function useBrand() {
  const brand = useSettings((s) => s.config.brand);
  const color = useSettings((s) => s.config.theme.brand);
  const org = useSettings((s) => s.config.organisation);

  return useMemo(() => {
    const ctx = { shortName: brand.shortName, tagline: brand.tagline, brand: color, bundled: isBundledBank(brand) };
    return {
      ...brand,
      logoUrl: resolveImage(brand.logo, ctx, "logo"),
      faviconUrl: resolveImage(brand.favicon, ctx, "icon"),
      hqImageUrl: resolveImage(org.hqImage, ctx),
      hqAerialUrl: resolveImage(org.hqAerialImage, ctx),
      country: org.country,
      islamicLabel: org.islamicLabel,
    };
  }, [brand, color, org]);
}

/** Resolved theme colours, for libraries that take colours as props (Recharts, Leaflet, three.js). */
export function useThemeColors() {
  return useSettings((s) => s.config.theme);
}
