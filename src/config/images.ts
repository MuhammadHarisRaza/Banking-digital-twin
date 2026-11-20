import ublHeadOffice from "../assets/images/ubl-head-office.jpg";
import ublHeadOfficeAerial from "../assets/images/ubl-head-office-aerial.jpg";
import ublLogo from "../assets/images/ubl-logo.png";

/** Bundled images that config fields can point at with "asset:<name>". */
export const ASSETS: Record<string, string> = {
  "ubl-logo": ublLogo,
  "ubl-icon": "/ubl-icon.png",
  "ubl-head-office": ublHeadOffice,
  "ubl-head-office-aerial": ublHeadOfficeAerial,
};

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] ?? c);

const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** A simple generated logo: a brand-coloured monogram tile with the short name beside it. */
export function wordmarkLogo(shortName: string, tagline: string, brand: string) {
  const name = escapeXml(shortName.trim() || "Bank");
  const tag = escapeXml(tagline.trim());
  const initial = escapeXml((shortName.trim()[0] ?? "B").toUpperCase());
  const width = Math.max(150, 74 + name.length * 23);
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="64" viewBox="0 0 ${width} 64">` +
      `<rect x="2" y="8" width="48" height="48" rx="12" fill="${brand}"/>` +
      `<text x="26" y="42" font-family="Segoe UI,Arial,sans-serif" font-size="27" font-weight="700" fill="#fff" text-anchor="middle">${initial}</text>` +
      `<text x="62" y="${tag ? 36 : 42}" font-family="Segoe UI,Arial,sans-serif" font-size="27" font-weight="700" fill="${brand}">${name}</text>` +
      (tag
        ? `<text x="63" y="53" font-family="Segoe UI,Arial,sans-serif" font-size="11.5" fill="#587389">${tag}</text>`
        : "") +
      `</svg>`,
  );
}

export function monogramIcon(shortName: string, brand: string) {
  const initial = escapeXml((shortName.trim()[0] ?? "B").toUpperCase());
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" rx="14" fill="${brand}"/>` +
      `<text x="32" y="44" font-family="Segoe UI,Arial,sans-serif" font-size="36" font-weight="700" fill="#fff" text-anchor="middle">${initial}</text>` +
      `</svg>`,
  );
}

export interface ImageContext {
  shortName: string;
  tagline: string;
  brand: string;
  /** False once the bank has been renamed: UBL's own logo and photos are then replaced. */
  bundled?: boolean;
}

/** Turns a config image field into a URL, or "" when there is no image. */
export function resolveImage(token: string, ctx: ImageContext, kind: "logo" | "icon" | "photo" = "photo") {
  if (!token) return "";
  if (token === "wordmark") {
    return kind === "icon" ? monogramIcon(ctx.shortName, ctx.brand) : wordmarkLogo(ctx.shortName, ctx.tagline, ctx.brand);
  }
  if (token.startsWith("asset:")) {
    // UBL's logo, icon and photographs never appear under another bank's name.
    if (ctx.bundled === false && token.startsWith("asset:ubl")) {
      if (kind === "logo") return wordmarkLogo(ctx.shortName, ctx.tagline, ctx.brand);
      if (kind === "icon") return monogramIcon(ctx.shortName, ctx.brand);
      return "";
    }
    return ASSETS[token.slice(6)] ?? "";
  }
  return token;
}

/**
 * Reads an uploaded file and shrinks it to fit `max` pixels, so logos and photos stay small enough
 * for localStorage. SVGs are kept as they are.
 */
export function readImageFile(file: File, max = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Choose an image file (PNG, JPG, SVG or WebP)."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.onload = () => {
      const url = String(reader.result);
      if (file.type === "image/svg+xml") {
        if (url.length > 400_000) reject(new Error("That SVG is too large. Keep it under 300 KB."));
        else resolve(url);
        return;
      }
      const img = new Image();
      img.onerror = () => reject(new Error("The image could not be opened."));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Photos compress far better as JPEG; anything that may carry transparency (logos) stays PNG.
        resolve(file.type === "image/jpeg" ? canvas.toDataURL("image/jpeg", 0.86) : canvas.toDataURL("image/png"));
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  });
}
