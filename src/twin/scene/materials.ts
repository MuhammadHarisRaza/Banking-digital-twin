import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  type MeshStandardMaterialParameters,
} from "three";

/**
 * Shared geometry and materials for the branch twin, following the factory twin: every object is a
 * unit box or cylinder scaled to size, and every material is created once and shared, so a branch
 * with hundreds of parts stays cheap to draw. Textures are drawn on a canvas from a fixed seed.
 */

export const UNIT_BOX = new BoxGeometry(1, 1, 1);
export const UNIT_CYLINDER = new CylinderGeometry(1, 1, 1, 24);
export const UNIT_CYLINDER_LOW = new CylinderGeometry(1, 1, 1, 10);
export const UNIT_SPHERE = new SphereGeometry(1, 16, 12);

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void, repeat: [number, number]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const tex = new CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function speckle(ctx: CanvasRenderingContext2D, size: number, base: string, dots: number, seed: number, light: string, dark: string) {
  const rand = seededRandom(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < dots; i++) {
    ctx.fillStyle = rand() < 0.5 ? light : dark;
    ctx.globalAlpha = 0.04 + rand() * 0.08;
    const r = 0.5 + rand() * 2.2;
    ctx.fillRect(rand() * size, rand() * size, r, r);
  }
  ctx.globalAlpha = 1;
}

/** Polished stone tiles with faint veins, 60 cm grid. */
const floorTexture = () =>
  canvasTexture(
    512,
    (ctx, size) => {
      speckle(ctx, size, "#e9e5dc", 5000, 7, "#ffffff", "#9c958a");
      const rand = seededRandom(11);
      ctx.strokeStyle = "#b9b2a6";
      ctx.globalAlpha = 0.22;
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        let x = rand() * size;
        let y = rand() * size;
        ctx.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
          x += (rand() - 0.5) * 90;
          y += (rand() - 0.5) * 90;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#cfc8bb";
      ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        const p = (i / 4) * size;
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, size);
        ctx.moveTo(0, p);
        ctx.lineTo(size, p);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    [1, 1],
  );

const asphaltTexture = () => canvasTexture(256, (ctx, s) => speckle(ctx, s, "#4b4f55", 6000, 3, "#9aa0a6", "#202326"), [1 / 6, 1 / 6]);
const pavingTexture = () =>
  canvasTexture(
    256,
    (ctx, s) => {
      speckle(ctx, s, "#c9c5bd", 2500, 5, "#ffffff", "#7d786f");
      ctx.strokeStyle = "#a9a39a";
      ctx.globalAlpha = 0.6;
      for (let i = 0; i <= 4; i++) {
        const p = (i / 4) * s;
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, s);
        ctx.moveTo(0, p);
        ctx.lineTo(s, p);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    [1 / 2.4, 1 / 2.4],
  );
const groundTexture = () => canvasTexture(256, (ctx, s) => speckle(ctx, s, "#cfd6cf", 4000, 9, "#eef2ee", "#8a958a"), [1 / 8, 1 / 8]);

const std = (p: MeshStandardMaterialParameters) => new MeshStandardMaterial(p);

const floorMap = floorTexture();

export const MAT = {
  floor: std({ map: floorMap, roughness: 0.32, metalness: 0.02 }),
  backFloor: std({ color: "#d6d3cc", roughness: 0.8 }),
  vaultFloor: std({ color: "#9aa1a8", roughness: 0.7 }),
  ground: std({ map: groundTexture(), roughness: 0.95 }),
  asphalt: std({ map: asphaltTexture(), roughness: 0.92 }),
  paving: std({ map: pavingTexture(), roughness: 0.85 }),
  roadLine: std({ color: "#f4f1e8", roughness: 0.6 }),
  kerb: std({ color: "#b5b0a7", roughness: 0.8 }),
  wall: std({ color: "#f2efe9", roughness: 0.85 }),
  wallInner: std({ color: "#e7e3dc", roughness: 0.9 }),
  plinth: std({ color: "#5b6168", roughness: 0.6 }),
  roof: std({ color: "#c7c9cc", roughness: 0.9 }),
  frame: std({ color: "#2b3036", roughness: 0.45, metalness: 0.6 }),
  glass: new MeshPhysicalMaterial({
    color: "#cfe3ee",
    roughness: 0.05,
    metalness: 0,
    transmission: 0,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  }),
  glassDark: new MeshPhysicalMaterial({ color: "#7e93a3", roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false }),
  wood: std({ color: "#8a5a3b", roughness: 0.55 }),
  woodLight: std({ color: "#b98a62", roughness: 0.6 }),
  counterTop: std({ color: "#f3f1ec", roughness: 0.25 }),
  stone: std({ color: "#3e4349", roughness: 0.35 }),
  steel: std({ color: "#b8bec4", roughness: 0.32, metalness: 0.75 }),
  steelDark: std({ color: "#5d646b", roughness: 0.4, metalness: 0.7 }),
  vault: std({ color: "#7d858d", roughness: 0.35, metalness: 0.85 }),
  vaultWall: std({ color: "#8b9096", roughness: 0.75 }),
  screenOff: std({ color: "#111418", roughness: 0.3 }),
  screen: std({ color: "#0d1a24", emissive: "#4fb3ff", emissiveIntensity: 0.9, roughness: 0.4 }),
  keyboard: std({ color: "#2a2d31", roughness: 0.6 }),
  chair: std({ color: "#2f3439", roughness: 0.7 }),
  seat: std({ color: "#4a5560", roughness: 0.75 }),
  sofa: std({ color: "#6b5b4e", roughness: 0.85 }),
  rug: std({ color: "#7a6a58", roughness: 1 }),
  prayerRug: std({ color: "#7f1d1d", roughness: 1 }),
  plant: std({ color: "#2f6b3a", roughness: 0.8 }),
  plantDark: std({ color: "#24502c", roughness: 0.8 }),
  pot: std({ color: "#e8e2d6", roughness: 0.6 }),
  trunk: std({ color: "#6b4f3a", roughness: 0.9 }),
  rack: std({ color: "#1c1f23", roughness: 0.5, metalness: 0.4 }),
  ups: std({ color: "#d8dadc", roughness: 0.6 }),
  locker: std({ color: "#a7adb3", roughness: 0.35, metalness: 0.8 }),
  paper: std({ color: "#fbfbf8", roughness: 0.9 }),
  skin: std({ color: "#c69172", roughness: 0.75 }),
  hair: std({ color: "#1f1a17", roughness: 0.9 }),
  car: [std({ color: "#e5e7eb", roughness: 0.3, metalness: 0.5 }), std({ color: "#1f2937", roughness: 0.3, metalness: 0.5 }), std({ color: "#9f1239", roughness: 0.3, metalness: 0.5 }), std({ color: "#64748b", roughness: 0.3, metalness: 0.5 })],
  tyre: std({ color: "#15171a", roughness: 0.9 }),
  neighbour: std({ color: "#d9d4ca", roughness: 0.9 }),
  neighbourDark: std({ color: "#b9b3a8", roughness: 0.9 }),
  ledGreen: std({ color: "#0a3", emissive: "#22ff66", emissiveIntensity: 1.6, toneMapped: false }),
  bollard: std({ color: "#3a3f45", roughness: 0.5, metalness: 0.5 }),
  queueTape: std({ color: "#1f2937", roughness: 0.5 }),
  // ── Finishes added with the architectural kit (textured when the PBR set is loaded) ──
  ceiling: std({ color: "#f3f2ee", roughness: 0.92 }),
  ceilingPanel: std({ color: "#ffffff", emissive: "#fff6e8", emissiveIntensity: 1.1, roughness: 0.5 }),
  downlight: std({ color: "#ffffff", emissive: "#fff2dc", emissiveIntensity: 1.6, roughness: 0.4 }),
  tiles: std({ color: "#f1f0ec", roughness: 0.35 }),
  leather: std({ color: "#4a3428", roughness: 0.55 }),
  cladding: std({ color: "#6a6e73", roughness: 0.6 }),
  facade: std({ color: "#ece7de", roughness: 0.8 }),
  concrete: std({ color: "#b9b6b0", roughness: 0.85 }),
  alu: std({ color: "#c8cdd2", roughness: 0.32, metalness: 0.9 }),
  aluDark: std({ color: "#3b4046", roughness: 0.4, metalness: 0.75 }),
  chrome: std({ color: "#e6e9ec", roughness: 0.12, metalness: 1 }),
  frosted: new MeshPhysicalMaterial({ color: "#eef3f6", roughness: 0.55, metalness: 0, transparent: true, opacity: 0.62, depthWrite: false }),
  carpet: std({ color: "#5a5f66", roughness: 1 }),
  officeFloor: std({ color: "#b48a63", roughness: 0.6 }),
  plastic: std({ color: "#e9eaec", roughness: 0.45 }),
  plasticDark: std({ color: "#25282c", roughness: 0.5 }),
  mesh: std({ color: "#1f2226", roughness: 0.85 }),
  whiteboard: std({ color: "#fbfbfb", roughness: 0.2 }),
  porcelain: std({ color: "#f7f7f5", roughness: 0.18 }),
  water: std({ color: "#9fc3d6", roughness: 0.05, metalness: 0.2 }),
  book: [std({ color: "#7a2e2e", roughness: 0.7 }), std({ color: "#1f3a5f", roughness: 0.7 }), std({ color: "#c9b37e", roughness: 0.7 }), std({ color: "#2f4f3a", roughness: 0.7 })],
  rubber: std({ color: "#1a1c1f", roughness: 0.9 }),
};

/** Current glow of lit signage (raised at night); brand materials created later start at it. */
const glow = { value: 0.55 };

const brandCache = new Map<string, { brand: MeshStandardMaterial; brandDark: MeshStandardMaterial; brandGlow: MeshStandardMaterial }>();

/** Brand-coloured materials (fascia, ATM surrounds, uniforms), shared per colour. */
export function brandMaterials(color: string) {
  let m = brandCache.get(color);
  if (!m) {
    m = {
      brand: std({ color, roughness: 0.45, metalness: 0.1 }),
      brandDark: std({ color, roughness: 0.6, metalness: 0.05 }),
      brandGlow: std({ color, emissive: color, emissiveIntensity: glow.value, roughness: 0.5 }),
    };
    m.brandDark.color.multiplyScalar(0.7);
    brandCache.set(color, m);
  }
  return m;
}

/** Every brand material created so far (for static batching). */
export function brandMaterialSet() {
  return [...brandCache.values()].flatMap((m) => [m.brand, m.brandDark, m.brandGlow]);
}

/** The lit (emissive) brand materials, for the day/night switch. */
export function brandGlowMaterials() {
  return [...brandCache.values()].map((m) => m.brandGlow);
}

export function setSignGlow(value: number) {
  glow.value = value;
  for (const m of brandGlowMaterials()) m.emissiveIntensity = value;
}
