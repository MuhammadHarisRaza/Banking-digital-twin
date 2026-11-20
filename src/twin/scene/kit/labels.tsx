import { useEffect, useMemo } from "react";
import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from "three";
import type { V3 } from "../../layout/types";

/**
 * A flat sign drawn on a canvas: counter numbers, room signs, machine toppers. Text is drawn
 * at 256 px per metre so it stays crisp at walkthrough distance.
 */
export function Label({
  text,
  sub,
  p,
  r,
  w,
  h,
  bg = "#1f2328",
  fg = "#ffffff",
  glow = 0,
  align = "center",
  weight = 700,
}: {
  text: string;
  sub?: string;
  p: V3;
  r?: V3;
  w: number;
  h: number;
  bg?: string;
  fg?: string;
  glow?: number;
  align?: "center" | "left";
  weight?: number;
}) {
  const material = useMemo(() => {
    const ppm = 256;
    const cw = Math.max(32, Math.round(w * ppm));
    const ch = Math.max(16, Math.round(h * ppm));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = fg;
    ctx.textBaseline = "middle";
    ctx.textAlign = align;
    const x = align === "center" ? cw / 2 : ch * 0.3;
    let size = Math.round(ch * (sub ? 0.46 : 0.62));
    const fit = (font: string, s: number, t: string) => {
      ctx.font = `${font} ${s}px "Source Sans 3", "Segoe UI", Arial, sans-serif`;
      while (ctx.measureText(t).width > cw * 0.9 && s > 8) {
        s -= 1;
        ctx.font = `${font} ${s}px "Source Sans 3", "Segoe UI", Arial, sans-serif`;
      }
      return s;
    };
    size = fit(String(weight), size, text);
    ctx.fillText(text, x, sub ? ch * 0.38 : ch / 2);
    if (sub) {
      ctx.globalAlpha = 0.85;
      fit("500", Math.round(ch * 0.26), sub);
      ctx.fillText(sub, x, ch * 0.76);
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 8;
    return new MeshStandardMaterial({ map, roughness: 0.5, emissive: glow ? "#ffffff" : "#000000", emissiveMap: glow ? map : null, emissiveIntensity: glow });
  }, [text, sub, w, h, bg, fg, glow, align, weight]);
  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );
  return (
    <mesh position={p} rotation={r} material={material}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}
