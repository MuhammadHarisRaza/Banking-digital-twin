import outline from "../assets/geo/pakistan-outline.json";

/** One row of a branch list: the bundled UBL list, or one a user imported in Settings. */
export interface PublishedBranch {
  code: string;
  category: string;
  name: string;
  city: string;
  district: string;
  region: string;
  cluster: string;
  area: string;
  address: string;
  atm: boolean;
  lockers: boolean;
  saturday: boolean;
  lat: number;
  lng: number;
  province: string;
}

/** Short description of where the branch list comes from, for page captions. */
export function listLabel(source: "published" | "preset" | "imported", shortName: string) {
  return source === "published" ? `${shortName}’s published branch list` : source === "preset" ? `${shortName}’s sample branch list` : "the imported branch list";
}

/** A JSON version of the template, for people whose data is JSON. */
export const TEMPLATE_JSON = `${JSON.stringify(
  [
    { code: "0001", name: "Main Boulevard Branch", type: "Retail", city: "Lahore", province: "Punjab", lat: 31.5204, lng: 74.3587, address: "Main Boulevard, Gulberg", atm: true, lockers: true, saturday: false, area: "Urban" },
    { code: "0002", name: "Clifton Islamic Branch", type: "Islamic", city: "Karachi", province: "Sindh", lat: 24.8138, lng: 67.03, address: "Block 5, Clifton", atm: true, lockers: false, saturday: true, area: "Urban" },
  ],
  null,
  2,
)}
`;

/** Branches must fall on the map, which covers Pakistan. */
export const MAP_LIMITS = { south: 23.4, north: 37.3, west: 60.5, east: 78.2 };

const RING = (outline as { geometry: { coordinates: number[][][] } }).geometry.coordinates[0];

/**
 * True when a point lies in Pakistan: inside the map's outline, or within about 15 km of it (the
 * outline is simplified, so real branches on the coast or near the border can sit just outside it).
 * The rectangle alone would also accept places in Afghanistan, Iran and India.
 */
export function inPakistan(lat: number, lng: number) {
  if (lat < MAP_LIMITS.south || lat > MAP_LIMITS.north || lng < MAP_LIMITS.west || lng > MAP_LIMITS.east) return false;
  let inside = false;
  let near = Infinity;
  for (let i = 0, j = RING.length - 1; i < RING.length; j = i++) {
    const [xi, yi] = RING[i];
    const [xj, yj] = RING[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    // Distance (degrees) from the point to this edge.
    const dx = xj - xi;
    const dy = yj - yi;
    const t = Math.max(0, Math.min(1, ((lng - xi) * dx + (lat - yi) * dy) / (dx * dx + dy * dy || 1)));
    near = Math.min(near, Math.hypot(lng - (xi + t * dx), lat - (yi + t * dy)));
  }
  return inside || near < 0.14;
}

export const TEMPLATE_COLUMNS = ["code", "name", "type", "city", "province", "lat", "lng", "address", "atm", "lockers", "saturday", "area"];

export const TEMPLATE_CSV = `${TEMPLATE_COLUMNS.join(",")}
0001,Main Boulevard Branch,Retail,Lahore,Punjab,31.5204,74.3587,"Main Boulevard, Gulberg",yes,yes,no,Urban
0002,Clifton Islamic Branch,Islamic,Karachi,Sindh,24.8138,67.0300,"Block 5, Clifton",yes,no,yes,Urban
0003,Blue Area Corporate Branch,Corporate,Islamabad,Islamabad Capital Territory,33.7104,73.0613,"Jinnah Avenue, Blue Area",yes,yes,no,Urban
`;

/** Minimal RFC 4180 CSV reader: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

const ALIASES: Record<string, string[]> = {
  code: ["code", "branchcode", "id", "branchid"],
  name: ["name", "branchname", "branch"],
  type: ["type", "category", "branchtype"],
  city: ["city", "town"],
  province: ["province", "state", "region"],
  district: ["district"],
  lat: ["lat", "latitude"],
  lng: ["lng", "lon", "long", "longitude"],
  address: ["address"],
  atm: ["atm"],
  lockers: ["lockers", "locker"],
  saturday: ["saturday", "saturdaybanking"],
  area: ["area"],
};

const truthy = (v: unknown) => /^(y|yes|true|1)$/i.test(String(v ?? "").trim());

export interface ImportResult {
  branches: PublishedBranch[];
  skipped: { row: number; reason: string }[];
}

function toBranch(get: (key: string) => unknown, index: number): PublishedBranch | string {
  const name = String(get("name") ?? "").trim();
  const city = String(get("city") ?? "").trim();
  const lat = Number(get("lat"));
  const lng = Number(get("lng"));
  if (!name) return "missing name";
  if (!city) return "missing city";
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "missing or invalid lat/lng";
  if (!inPakistan(lat, lng)) return "location is outside Pakistan (the map covers Pakistan only)";
  const rawType = String(get("type") ?? "").trim().toLowerCase();
  const category = rawType.startsWith("islam") ? "Islamic" : rawType.startsWith("corp") ? "Corporate" : "Retail";
  const code = String(get("code") ?? "").trim() || String(index + 1).padStart(4, "0");
  const province = String(get("province") ?? "").trim() || "Unknown";
  return {
    code: code.replace(/^BR-/i, ""),
    category,
    name,
    city,
    district: String(get("district") ?? "").trim() || city,
    region: province,
    cluster: "",
    area: String(get("area") ?? "").trim() || "Urban",
    address: String(get("address") ?? "").trim() || city,
    // A missing or blank ATM value means the usual case: the branch has an ATM.
    atm: String(get("atm") ?? "").trim() === "" ? true : truthy(get("atm")),
    lockers: truthy(get("lockers")),
    saturday: truthy(get("saturday")),
    lat,
    lng,
    province,
  };
}

function finish(rows: (PublishedBranch | string)[], offset: number): ImportResult {
  const branches: PublishedBranch[] = [];
  const skipped: ImportResult["skipped"] = [];
  const codes = new Set<string>();
  rows.forEach((r, i) => {
    if (typeof r === "string") skipped.push({ row: i + offset, reason: r });
    else if (codes.has(r.code)) skipped.push({ row: i + offset, reason: `duplicate code ${r.code}` });
    else {
      codes.add(r.code);
      branches.push(r);
    }
  });
  return { branches, skipped };
}

/** Reads already-parsed JSON records (the import format), validating them like an uploaded file. */
export function fromRecords(records: unknown[]): ImportResult {
  const rows = records.map((item, i) => {
    const obj = (item ?? {}) as Record<string, unknown>;
    const lower = Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase().replace(/[^a-z]/g, ""), v]));
    return toBranch((key) => ALIASES[key]?.map((a) => lower[a]).find((v) => v !== undefined && v !== ""), i);
  });
  return finish(rows, 1);
}

/** Reads a CSV or JSON branch list. Rows that can't be placed on the map are reported, not imported. */
export function parseBranchFile(text: string, fileName: string): ImportResult {
  if (fileName.toLowerCase().endsWith(".json") || /^[[{]/.test(text.trimStart())) {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("That JSON file could not be read.");
    }
    // Accept a bare array or an object wrapping one ({ "branches": [...] }, as exports often are).
    if (!Array.isArray(data) && data && typeof data === "object") {
      const inner = Object.values(data as Record<string, unknown>).find(Array.isArray);
      if (inner) data = inner;
    }
    if (!Array.isArray(data)) throw new Error("The JSON file must contain an array of branches (or an object with a branches array).");
    return fromRecords(data);
  }

  const table = parseCsv(text);
  if (table.length < 2) throw new Error("The CSV needs a header row and at least one branch.");
  const header = table[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const column = (key: string) => header.findIndex((h) => ALIASES[key]?.includes(h));
  const indexes = Object.fromEntries(Object.keys(ALIASES).map((k) => [k, column(k)]));
  for (const required of ["name", "city", "lat", "lng"]) {
    if (indexes[required] < 0) throw new Error(`The CSV has no "${required}" column.`);
  }
  const rows = table.slice(1).map((cells, i) =>
    toBranch((key) => (indexes[key] >= 0 ? cells[indexes[key]] : undefined), i),
  );
  return finish(rows, 2);
}
