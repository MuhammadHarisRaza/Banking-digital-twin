import type { ThemeTokens } from "./bankConfig";

type HSL = { h: number; s: number; l: number };

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function hexToHsl(hex: string): HSL {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: HSL) {
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const lig = Math.min(100, Math.max(0, l)) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

export const isHex = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());

/** WCAG relative luminance and contrast ratio. */
function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The colour mixed with white or black by `amount` (0–1). */
export function mix(hex: string, other: string, amount: number) {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  return rgbToHex(a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount, a[2] + (b[2] - a[2]) * amount);
}

/**
 * A complete palette from one brand colour: neutrals take a faint tint of the brand hue so the
 * whole page feels like the bank, while status colours stay fixed for meaning.
 */
export function derivePalette(brand: string, accent?: string): ThemeTokens {
  const { h, s, l } = hexToHsl(brand);
  // Keep the brand dark enough for white text on buttons.
  let base = brand;
  if (contrast(base, "#ffffff") < 4.5) {
    let lig = l;
    while (lig > 10 && contrast(hslToHex({ h, s, l: lig }), "#ffffff") < 4.5) lig -= 2;
    base = hslToHex({ h, s, l: lig });
  }
  const tintSat = Math.min(s, 55);
  const neutral = (sat: number, lig: number) => hslToHex({ h, s: Math.min(tintSat, sat), l: lig });
  const secondary = accent ?? hslToHex({ h: (h + 150) % 360, s: Math.min(70, Math.max(45, s)), l: 30 });

  return {
    page: neutral(28, 96.2),
    panel: "#ffffff",
    card: neutral(28, 97.6),
    cardHover: neutral(40, 94.8),
    line: neutral(40, 86.8),
    lineSoft: neutral(38, 91.8),
    ink: neutral(70, 15.8),
    soft: neutral(30, 34.9),
    mute: neutral(22, 44.5),
    brand: base,
    brandBright: hslToHex({ ...hexToHsl(base), l: Math.max(8, hexToHsl(base).l - 8) }),
    ok: "#0f8a56",
    warn: "#b7791f",
    steel: hslToHex({ h, s: Math.min(55, s), l: 42 }),
    accent: secondary,
    mapDot: hslToHex({ h, s: Math.min(100, s + 10), l: 87 }),
    islamic: "#0f7a55",
  };
}
