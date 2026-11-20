import { useEffect, useMemo, useState } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { useBrand, useThemeColors } from "../../config/useBrand";
import type { BranchLayout } from "../layout/types";
import { PLINTH } from "../layout/height";
import { MAT } from "./materials";
import { Box } from "./primitives";

function useImage(url: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    setImg(null);
    if (!url) return;
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = url;
  }, [url]);
  return img;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws the logo on a white plate, fitted to the box. */
function drawLogo(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, w: number, h: number, fallback: string, brand: string) {
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, w, h, h * 0.14);
  ctx.fill();
  if (img && img.width && img.height) {
    const scale = Math.min((w * 0.86) / img.width, (h * 0.78) / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = brand;
    ctx.font = `bold ${Math.round(h * 0.42)}px Segoe UI, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fallback, x + w / 2, y + h / 2);
    ctx.textAlign = "left";
  }
}

function useCanvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, deps: unknown[]) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, [width, height]);
  useEffect(() => {
    const ctx = (texture.image as HTMLCanvasElement).getContext("2d")!;
    ctx.clearRect(0, 0, width, height);
    draw(ctx);
    texture.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture, ...deps]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/**
 * The branch's signage, drawn from Settings: the fascia over the glass front, a pylon by the road and
 * the ATM sign. Changing the bank name, logo or colour re-brands the building immediately.
 */
export function Signage({ layout, branchName }: { layout: BranchLayout; branchName: string }) {
  const { bankName, shortName, logoUrl, islamicLabel } = useBrand();
  const { brand, islamic } = useThemeColors();
  const logo = useImage(logoUrl);
  const color = layout.archetype === "islamic" ? islamic : brand;
  const title = layout.archetype === "islamic" ? islamicLabel || bankName : bankName;
  const W = layout.width;
  const front = layout.depth / 2;
  const atm = layout.atmRoom;
  // The fascia spans the glass front left of the ATM vestibule, which carries its own sign.
  const available = atm ? atm[0] + W / 2 - 1 : W - 2;
  const fasciaW = Math.min(available, 18);
  const fasciaX = atm ? (-W / 2 + atm[0]) / 2 : 0;
  const aspect = fasciaW / 1.15;

  const fascia = useCanvasTexture(
    1024,
    Math.round(1024 / aspect),
    (ctx) => {
      const w = 1024;
      const h = Math.round(1024 / aspect);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      const plateH = h * 0.74;
      const plateW = Math.min(plateH * 2.6, w * 0.3);
      drawLogo(ctx, logo, h * 0.13, (h - plateH) / 2, plateW, plateH, shortName, color);
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      let size = h * 0.42;
      ctx.font = `bold ${size}px Segoe UI, Arial, sans-serif`;
      const maxW = w - plateW - h * 0.5;
      while (ctx.measureText(title).width > maxW && size > 12) {
        size -= 2;
        ctx.font = `bold ${size}px Segoe UI, Arial, sans-serif`;
      }
      ctx.fillText(title, plateW + h * 0.3, h / 2);
    },
    [color, logo, title, shortName, aspect],
  );

  const pylon = useCanvasTexture(
    256,
    768,
    (ctx) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 256, 768);
      drawLogo(ctx, logo, 20, 30, 216, 150, shortName, color);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "bold 40px Segoe UI, Arial, sans-serif";
      const words = branchName.replace(/ Branch$/i, "").split(" ");
      const lines: string[] = [];
      for (const word of words) {
        const lastLine = lines[lines.length - 1];
        if (lastLine && ctx.measureText(`${lastLine} ${word}`).width < 220) lines[lines.length - 1] = `${lastLine} ${word}`;
        else lines.push(word);
      }
      lines.slice(0, 5).forEach((line, i) => ctx.fillText(line, 128, 250 + i * 52));
      ctx.font = "30px Segoe UI, Arial, sans-serif";
      ctx.fillText("BRANCH", 128, 560);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(40, 620, 176, 3);
      ctx.font = "bold 44px Segoe UI, Arial, sans-serif";
      ctx.fillText("ATM 24/7", 128, 700);
    },
    [color, logo, shortName, branchName],
  );

  const atmSign = useCanvasTexture(
    256,
    96,
    (ctx) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 256, 96);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 54px Segoe UI, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ATM", 128, 50);
    },
    [color],
  );

  return (
    <group>
      {/* Fascia over the glass front */}
      <mesh position={[fasciaX, 3.95, front + 0.2]}>
        <boxGeometry args={[fasciaW, 1.15, 0.12]} />
        <meshStandardMaterial attach="material-0" color={color} />
        <meshStandardMaterial attach="material-1" color={color} />
        <meshStandardMaterial attach="material-2" color={color} />
        <meshStandardMaterial attach="material-3" color={color} />
        <meshStandardMaterial attach="material-4" map={fascia} emissiveMap={fascia} emissive="#ffffff" emissiveIntensity={0.35} roughness={0.5} />
        <meshStandardMaterial attach="material-5" color={color} />
      </mesh>
      {/* Pylon by the road */}
      <group position={[W / 2 + 1.6, -PLINTH, front + 4.6]} rotation={[0, -0.35, 0]}>
        <Box p={[0, 0.15, 0]} s={[1.5, 0.3, 0.6]} m={MAT.stone} />
        <mesh position={[0, 3.0, 0]} castShadow>
          <boxGeometry args={[1.25, 5.4, 0.4]} />
          <meshStandardMaterial attach="material-0" color={color} />
          <meshStandardMaterial attach="material-1" color={color} />
          <meshStandardMaterial attach="material-2" color={color} />
          <meshStandardMaterial attach="material-3" color={color} />
          <meshStandardMaterial attach="material-4" map={pylon} emissiveMap={pylon} emissive="#ffffff" emissiveIntensity={0.3} />
          <meshStandardMaterial attach="material-5" map={pylon} emissiveMap={pylon} emissive="#ffffff" emissiveIntensity={0.3} />
        </mesh>
      </group>
      {atm && (
        <mesh position={[(atm[0] + atm[2]) / 2, 3.65, front + 0.2]}>
          <boxGeometry args={[2.2, 0.8, 0.1]} />
          <meshStandardMaterial attach="material-0" color={color} />
          <meshStandardMaterial attach="material-1" color={color} />
          <meshStandardMaterial attach="material-2" color={color} />
          <meshStandardMaterial attach="material-3" color={color} />
          <meshStandardMaterial attach="material-4" map={atmSign} emissiveMap={atmSign} emissive="#ffffff" emissiveIntensity={0.4} />
          <meshStandardMaterial attach="material-5" color={color} />
        </mesh>
      )}
    </group>
  );
}
