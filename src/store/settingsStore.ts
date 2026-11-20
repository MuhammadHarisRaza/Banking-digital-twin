import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_CONFIG, MODULE_DEFAULTS, type BankConfig, type ModuleId, type ModuleSetting } from "../config/bankConfig";
import { getPreset } from "../config/presets";

type Section = Exclude<keyof BankConfig, "version" | "presetId">;

/** Storage that never throws: private windows and blocked storage simply don't persist. */
const safeStorage = createJSONStorage(() => ({
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn("Settings could not be saved", error);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
}));

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Copies only known keys of the right type from `incoming` over `base`; arrays are replaced whole. */
function mergeKnown<T>(base: T, incoming: unknown): T {
  if (!isObject(base) || !isObject(incoming)) {
    if (Array.isArray(base)) return (Array.isArray(incoming) ? incoming : base) as T;
    return (typeof incoming === typeof base ? incoming : base) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base)) {
    if (key in incoming) out[key] = mergeKnown((base as Record<string, unknown>)[key], incoming[key]);
  }
  return out as T;
}

/** Brings a stored or imported config up to the current shape, filling anything missing from defaults. */
export function normalizeConfig(raw: unknown): BankConfig {
  const config = mergeKnown(structuredClone(DEFAULT_CONFIG), raw);
  // appLinks is a free-form map, so mergeKnown (which only copies known keys) would drop it.
  const links = isObject(raw) && isObject(raw.appLinks) ? raw.appLinks : {};
  config.appLinks = Object.fromEntries(Object.entries(links).filter(([, v]) => typeof v === "string")) as BankConfig["appLinks"];
  config.modules = mergeKnown(MODULE_DEFAULTS, isObject(raw) ? raw.modules : undefined);
  // The C360 branch mapping is a free-form map too.
  const c360 = isObject(raw) && isObject(raw.integrations) && isObject(raw.integrations.c360) ? raw.integrations.c360 : null;
  const map = c360 && isObject(c360.branchMap) ? c360.branchMap : {};
  config.integrations.c360.branchMap = Object.fromEntries(Object.entries(map).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  // The Digital Twin API address used to live under digitalEye.apiUrl.
  const ints = isObject(raw) && isObject(raw.integrations) ? raw.integrations : null;
  const oldDe = ints && isObject(ints.digitalEye) ? ints.digitalEye : null;
  if (!(ints && isObject(ints.twinApi) && typeof ints.twinApi.url === "string") && oldDe && typeof oldDe.apiUrl === "string" && oldDe.apiUrl.trim())
    config.integrations.twinApi.url = oldDe.apiUrl.trim();
  config.version = 1;
  return config;
}

/** Reads an exported settings file into a full configuration (throws a readable error when it isn't one). */
export function parseConfigFile(json: string): BankConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const raw = isObject(parsed) && isObject(parsed.config) ? parsed.config : parsed;
  if (!isObject(raw) || !isObject(raw.brand)) throw new Error("That file is not an exported settings file.");
  return normalizeConfig(raw);
}

interface SettingsState {
  config: BankConfig;
  update: <S extends Section>(section: S, patch: Partial<BankConfig[S]>) => void;
  setModule: (id: ModuleId, patch: Partial<ModuleSetting>) => void;
  applyPreset: (id: string) => void;
  resetSection: (section: Section) => void;
  resetAll: () => void;
  importConfig: (json: string) => void;
  exportConfig: () => string;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      update: (section, patch) =>
        set((s) => ({ config: { ...s.config, [section]: { ...s.config[section], ...patch } } })),
      setModule: (id, patch) =>
        set((s) => ({
          config: { ...s.config, modules: { ...s.config.modules, [id]: { ...s.config.modules[id], ...patch } } },
        })),
      applyPreset: (id) => {
        const preset = getPreset(id);
        if (!preset) return;
        // Keep the viewer's own profile, twin preferences, app links and integrations when switching banks.
        const { user, twin, appLinks, integrations } = get().config;
        // A different bank has its own C360 code: drop an explicit one so it follows the new bank's name.
        set({ config: { ...structuredClone(preset.config), user, twin, appLinks, integrations: { ...integrations, c360: { ...integrations.c360, sourceSystem: "" } } } });
      },
      resetSection: (section) => {
        const base = getPreset(get().config.presetId)?.config ?? DEFAULT_CONFIG;
        set((s) => ({ config: { ...s.config, [section]: structuredClone(base[section]) } }));
      },
      resetAll: () => set({ config: DEFAULT_CONFIG }),
      importConfig: (json) => set({ config: parseConfigFile(json) }),
      exportConfig: () =>
        JSON.stringify({ app: "alara-banking-operations", exportedAt: new Date().toISOString(), config: get().config }, null, 2),
    }),
    {
      name: "alara-bank-config",
      version: 1,
      storage: safeStorage,
      partialize: (s) => ({ config: s.config }),
      merge: (persisted, current) => ({
        ...current,
        config: normalizeConfig(isObject(persisted) ? persisted.config : undefined),
      }),
    },
  ),
);

/** Non-reactive read for plain functions (formatters, Leaflet styles). */
export const getConfig = () => useSettings.getState().config;

export const useConfig = () => useSettings((s) => s.config);
