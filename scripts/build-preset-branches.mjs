#!/usr/bin/env node
/**
 * Builds the branch lists for the fictional preset banks (src/data/presets/<id>.json), so a preset
 * never shows UBL's branches. Each bank gets its own network shape (where it is strong, how many
 * Islamic and corporate branches), its own codes and generic area-based branch names.
 *
 * Locations: each branch sits near a real branch location in its city (taken from the bundled list's
 * coordinates, which are approximate and city-level), jittered by a few hundred metres, so every point
 * is inside Pakistan. The output is deterministic (seeded).
 *
 * Usage: node scripts/build-preset-branches.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = JSON.parse(readFileSync(join(ROOT, "src/data/ubl-branches.json"), "utf8"));
const OUT = join(ROOT, "src/data/presets");

// City → sample coordinates, province, district.
const cities = new Map();
for (const b of SOURCE) {
  const c = cities.get(b.city) ?? { city: b.city, province: b.province, district: b.district, points: [] };
  c.points.push([b.lat, b.lng]);
  cities.set(b.city, c);
}

const AREAS = [
  "Main Boulevard", "Saddar", "Cantt", "Model Town", "Jinnah Road", "Mall Road", "University Road", "GT Road", "Civil Lines",
  "Satellite Town", "Railway Road", "Station Road", "Main Bazaar", "Industrial Area", "Garden Town", "Gulberg", "Defence",
  "Gulshan", "Bahria Town", "Ring Road", "Airport Road", "Canal Road", "Circular Road", "Liaquat Road", "Fort Road",
  "Commercial Area", "Market Square", "Grain Market", "Cloth Market", "City Centre", "New Town", "Old City", "Peoples Colony",
  "Samanabad", "Iqbal Town", "Faisal Town", "Shadman", "Township", "Wapda Town", "Askari", "Nishtar Road", "Allama Iqbal Road",
  "Kashmir Road", "Club Road", "Hospital Road", "Court Road", "College Road", "Stadium Road", "Mission Road", "Shahrah-e-Quaid",
];

const BANKS = {
  demo: {
    prefix: "D",
    count: 180,
    mix: { Retail: 0.7, Islamic: 0.22, Corporate: 0.08 },
    weights: { Karachi: 22, Lahore: 20, Islamabad: 10, Rawalpindi: 9, Faisalabad: 8, Multan: 6, Peshawar: 6, Quetta: 4, Hyderabad: 5, Sialkot: 3, Gujranwala: 4, "*": 1 },
  },
  crescent: {
    prefix: "C",
    count: 140,
    mix: { Retail: 0.06, Islamic: 0.9, Corporate: 0.04 },
    weights: { Lahore: 22, Karachi: 16, Faisalabad: 9, Multan: 8, Gujranwala: 6, Sialkot: 5, Bahawalpur: 5, Islamabad: 6, Rawalpindi: 6, Sargodha: 4, "*": 0.6 },
  },
  indus: {
    prefix: "I",
    count: 260,
    mix: { Retail: 0.7, Islamic: 0.2, Corporate: 0.1 },
    weights: { Islamabad: 16, Rawalpindi: 14, Peshawar: 13, Abbottabad: 6, Mardan: 5, Lahore: 12, Karachi: 10, Gilgit: 4, Skardu: 3, Muzaffarabad: 4, "*": 1 },
  },
  northstar: {
    prefix: "N",
    count: 90,
    mix: { Retail: 0.75, Islamic: 0.15, Corporate: 0.1 },
    weights: { Karachi: 40, Hyderabad: 10, Sukkur: 6, Larkana: 4, "Mirpur Khas": 3, Nawabshah: 3, Quetta: 4, Lahore: 6, Islamabad: 4, "*": 0.3 },
  },
};

function rng(seed) {
  let s = 0;
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(rand, entries) {
  const total = entries.reduce((n, [, w]) => n + w, 0);
  let r = rand() * total;
  for (const [v, w] of entries) if ((r -= w) <= 0) return v;
  return entries[entries.length - 1][0];
}

mkdirSync(OUT, { recursive: true });
for (const [id, bank] of Object.entries(BANKS)) {
  const rand = rng(id);
  // Named cities take their weight; every other city with branches shares the "*" weight.
  const entries = [...cities.values()].map((c) => [c, bank.weights[c.city] ?? bank.weights["*"] * Math.min(3, c.points.length / 4)]).filter(([, w]) => w > 0);
  const used = new Map();
  const out = [];
  for (let i = 0; i < bank.count; i++) {
    const c = pickWeighted(rand, entries);
    const names = used.get(c.city) ?? new Set();
    used.set(c.city, names);
    let area = AREAS[Math.floor(rand() * AREAS.length)];
    for (let k = 0; names.has(area) && k < AREAS.length; k++) area = AREAS[(AREAS.indexOf(area) + 1) % AREAS.length];
    if (names.has(area)) continue;
    names.add(area);
    const type = pickWeighted(rand, Object.entries(bank.mix));
    const suffix = type === "Islamic" ? "Islamic Branch" : type === "Corporate" ? "Corporate Branch" : "Branch";
    const [lat, lng] = c.points[Math.floor(rand() * c.points.length)];
    const big = c.points.length >= 12;
    out.push({
      code: `${bank.prefix}${String(out.length + 1).padStart(4, "0")}`,
      name: `${area} ${c.city} ${suffix}`,
      type,
      city: c.city,
      district: c.city,
      province: c.province,
      lat: +(lat + (rand() - 0.5) * 0.008).toFixed(5),
      lng: +(lng + (rand() - 0.5) * 0.008).toFixed(5),
      address: `${area}, ${c.city}`,
      atm: rand() < (big ? 0.9 : 0.75),
      lockers: type === "Corporate" || rand() < 0.35,
      saturday: rand() < 0.15,
      area: big ? "Urban" : "Rural",
    });
  }
  writeFileSync(join(OUT, `${id}.json`), JSON.stringify(out, null, 0).replace(/},{/g, "},\n{") + "\n");
  const by = (k) => out.reduce((m, b) => ((m[b[k]] = (m[b[k]] ?? 0) + 1), m), {});
  console.log(id, out.length, "branches", by("type"), "cities", Object.keys(by("city")).length);
}
