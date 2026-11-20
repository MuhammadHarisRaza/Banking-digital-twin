#!/usr/bin/env node
/**
 * Downloads the CC0 assets the 3D branch twin uses from Poly Haven (https://polyhaven.com, CC0 1.0),
 * converts them for the web and writes them to public/twin/:
 *   textures/<id>/{color,normal,rough}.webp   1K maps, WebP via ffmpeg
 *   models/<id>.glb                            1K glTF, compressed with @gltf-transform/cli (meshopt + WebP)
 *   env/<id>.hdr                               1K HDRI for reflections
 * and records each source in public/twin/CREDITS.md.
 *
 * Usage: node scripts/fetch-twin-assets.mjs [cacheDir]
 * Needs ffmpeg on PATH and network access. Raw downloads go to cacheDir (default .twin-asset-cache).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "twin");
const CACHE = resolve(process.argv[2] ?? join(ROOT, ".twin-asset-cache"));

/** What each asset is used for, shown in CREDITS.md. */
const TEXTURES = {
  terrazzo_tiles: "Banking hall floor",
  granite_tile: "Counter fronts, façade piers",
  rectangular_facade_tiles: "Façade cladding",
  brushed_concrete: "Plinth, steps, ramp",
  square_concrete_pavers: "Pavement",
  oak_veneer_01: "Light wood: desks, counters",
  american_walnut_veneer: "Dark wood: manager's office, feature panels",
  plank_flooring_02: "Office and meeting-room floors",
  smooth_concrete_floor: "Back-office floor",
  long_white_tiles: "Washroom walls and floors",
  ceiling_interior: "Suspended ceiling",
  painted_plaster_wall: "Interior walls",
  fabric_pattern_05: "Seat upholstery",
  brown_leather: "Executive chairs",
};
const MODELS = {
  potted_plant_01: "Large indoor plant",
  potted_plant_02: "Small indoor plant",
  modern_arm_chair_01: "Lounge armchair",
  sofa_03: "Waiting-area sofa",
  modern_coffee_table_01: "Coffee table",
  street_lamp_02: "Street lamp",
};
const HDRIS = { wide_street_01: "Reflections for glass and metal (not shown as background)" };

/** Colour maps converted to grey so the scene can tint them (they come out brown or yellow). */
const DESATURATE = new Set(["smooth_concrete_floor", "square_concrete_pavers", "plank_flooring_02"]);

const MAPS = { color: ["Diffuse", "diff", "col_01"], normal: ["nor_gl"], rough: ["Rough", "rough"] };

async function json(url) {
  const res = await fetch(url, { headers: { "User-Agent": "branch-twin-asset-fetch" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function download(url, file) {
  if (existsSync(file)) return;
  mkdirSync(dirname(file), { recursive: true });
  const res = await fetch(url, { headers: { "User-Agent": "branch-twin-asset-fetch" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

const pick = (files, keys) => {
  for (const k of keys) if (files[k]?.["1k"]?.jpg) return files[k]["1k"].jpg.url;
  for (const k of keys) if (files[k]?.["1k"]?.png) return files[k]["1k"].png.url;
  return null;
};

async function textures() {
  for (const id of Object.keys(TEXTURES)) {
    const files = await json(`https://api.polyhaven.com/files/${id}`);
    for (const [name, keys] of Object.entries(MAPS)) {
      const url = pick(files, keys);
      if (!url) throw new Error(`${id}: no 1K ${name} map`);
      const raw = join(CACHE, "textures", id, `${name}${url.slice(url.lastIndexOf("."))}`);
      await download(url, raw);
      const out = join(OUT, "textures", id, `${name}.webp`);
      mkdirSync(dirname(out), { recursive: true });
      // Colour maps keep more quality; normal and roughness maps compress harder.
      const q = name === "color" ? "82" : "76";
      const filter = name === "color" && DESATURATE.has(id) ? "scale=1024:1024,hue=s=0,eq=brightness=0.06" : "scale=1024:1024";
      execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-vf", filter, "-c:v", "libwebp", "-quality", q, out]);
    }
    console.log("texture", id);
  }
}

async function models() {
  for (const id of Object.keys(MODELS)) {
    const files = await json(`https://api.polyhaven.com/files/${id}`);
    const g = files.gltf?.["1k"]?.gltf;
    if (!g) throw new Error(`${id}: no 1K glTF`);
    const dir = join(CACHE, "models", id);
    const main = join(dir, `${id}.gltf`);
    await download(g.url, main);
    for (const [rel, f] of Object.entries(g.include ?? {})) await download(f.url, join(dir, rel));
    const out = join(OUT, "models", `${id}.glb`);
    mkdirSync(dirname(out), { recursive: true });
    execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["-y", "@gltf-transform/cli@4", "optimize", main, out, "--compress", "meshopt", "--texture-compress", "webp", "--texture-size", "1024"],
      { stdio: "inherit", shell: process.platform === "win32" },
    );
    // The scanned plants are very dense (200–460k vertices); thin them to roughly 15–35k.
    if (id.startsWith("potted_plant")) {
      const tmp = out.replace(/\.glb$/, ".tmp.glb");
      const run = (args) => execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["-y", "@gltf-transform/cli@4", ...args], { stdio: "inherit", shell: process.platform === "win32" });
      run(["simplify", out, tmp, "--ratio", "0.07", "--error", "0.02"]);
      run(["meshopt", tmp, out]);
      rmSync(tmp, { force: true });
    }
    console.log("model", id);
  }
}

async function hdris() {
  for (const id of Object.keys(HDRIS)) {
    const files = await json(`https://api.polyhaven.com/files/${id}`);
    const url = files.hdri?.["1k"]?.hdr?.url;
    if (!url) throw new Error(`${id}: no 1K HDR`);
    const raw = join(CACHE, "env", `${id}.hdr`);
    await download(url, raw);
    mkdirSync(join(OUT, "env"), { recursive: true });
    copyFileSync(raw, join(OUT, "env", `${id}.hdr`));
    console.log("hdri", id);
  }
}

function credits() {
  const row = (kind, id, use) => `| ${kind} | [${id}](https://polyhaven.com/a/${id}) | ${use} |`;
  const lines = [
    "# 3D twin asset credits",
    "",
    "All assets are from [Poly Haven](https://polyhaven.com) and are licensed [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/):",
    "free for any use, no attribution required. They are listed here for traceability.",
    "Re-create this folder with `node scripts/fetch-twin-assets.mjs`.",
    "",
    "| Type | Asset | Used for |",
    "|---|---|---|",
    ...Object.entries(TEXTURES).map(([id, use]) => row("Texture", id, use)),
    ...Object.entries(MODELS).map(([id, use]) => row("Model", id, use)),
    ...Object.entries(HDRIS).map(([id, use]) => row("HDRI", id, use)),
    "",
  ];
  writeFileSync(join(OUT, "CREDITS.md"), lines.join("\n"));
}

if (process.argv.includes("--clean")) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
await textures();
await hdris();
await models();
credits();
console.log("done →", OUT);
