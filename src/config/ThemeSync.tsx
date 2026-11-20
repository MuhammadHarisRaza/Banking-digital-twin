import { useEffect } from "react";
import { useSettings } from "../store/settingsStore";
import { DEFAULT_MAP_HUE, type ThemeTokens } from "./bankConfig";
import { hexToHsl } from "./color";
import { useBrand } from "./useBrand";

const TOKEN_VARS: Record<keyof ThemeTokens, string> = {
  page: "--color-page",
  panel: "--color-panel",
  card: "--color-card",
  cardHover: "--color-card-hover",
  line: "--color-line",
  lineSoft: "--color-line-soft",
  ink: "--color-ink",
  soft: "--color-soft",
  mute: "--color-mute",
  brand: "--color-brand",
  brandBright: "--color-brand-bright",
  ok: "--color-ok",
  warn: "--color-warn",
  steel: "--color-steel",
  accent: "--color-accent",
  mapDot: "--color-map-dot",
  islamic: "--color-islamic",
};

function setLink(rel: string, href: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.removeAttribute("type");
  link.href = href;
}

/**
 * Pushes the configured brand onto the page: theme colours become the CSS variables every Tailwind
 * utility reads (bg-brand, text-ink, border-line …), plus the tab title, favicon and theme-color.
 */
export default function ThemeSync() {
  const theme = useSettings((s) => s.config.theme);
  const { productName, bankName, shortName, faviconUrl } = useBrand();

  useEffect(() => {
    const root = document.documentElement.style;
    for (const [key, cssVar] of Object.entries(TOKEN_VARS)) {
      root.setProperty(cssVar, theme[key as keyof ThemeTokens]);
    }
    const { h, s } = hexToHsl(theme.brand);
    // The terrain image is drawn in the default blue; rotate it toward the brand hue.
    const rotate = theme.tintMap && s > 12 ? Math.round(h - DEFAULT_MAP_HUE) : 0;
    root.setProperty("--map-hue-rotate", `${rotate}deg`);
    root.setProperty("--map-saturate", theme.tintMap && s <= 12 ? "0" : "1");
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.brand);
  }, [theme]);

  useEffect(() => {
    document.title = `${shortName || bankName} · ${productName} Banking Operations`;
  }, [productName, bankName, shortName]);

  useEffect(() => {
    if (faviconUrl) setLink("icon", faviconUrl);
  }, [faviconUrl]);

  return null;
}
