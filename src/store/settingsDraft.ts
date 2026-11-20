import { create } from "zustand";
import { DEFAULT_CONFIG, type BankConfig, type ModuleId, type ModuleSetting } from "../config/bankConfig";
import { getPreset } from "../config/presets";
import { parseConfigFile, useSettings } from "./settingsStore";

/**
 * Unsaved edits on the Settings page. The page edits a draft copy of the configuration; nothing
 * changes across the platform until "Save changes" copies the draft into the real settings, and
 * "Discard" drops it. The draft survives moving to another page within the session, so work in
 * progress isn't lost by a stray click.
 */

type Section = Exclude<keyof BankConfig, "version" | "presetId">;

interface DraftActions {
  update: <S extends Section>(section: S, patch: Partial<BankConfig[S]>) => void;
  setModule: (id: ModuleId, patch: Partial<ModuleSetting>) => void;
  applyPreset: (id: string) => void;
  resetSection: (section: Section) => void;
  resetAll: () => void;
  importConfig: (json: string) => void;
  exportConfig: () => string;
  save: () => void;
  discard: () => void;
}

interface DraftState extends DraftActions {
  draft: BankConfig | null;
}

const saved = () => useSettings.getState().config;

export const useSettingsDraft = create<DraftState>()((set, get) => {
  const current = () => get().draft ?? saved();
  const edit = (next: BankConfig) => set({ draft: next });
  return {
    draft: null,
    update: (section, patch) => {
      const c = current();
      edit({ ...c, [section]: { ...c[section], ...patch } });
    },
    setModule: (id, patch) => {
      const c = current();
      edit({ ...c, modules: { ...c.modules, [id]: { ...c.modules[id], ...patch } } });
    },
    applyPreset: (id) => {
      const preset = getPreset(id);
      if (!preset) return;
      // Keep the viewer's own profile, twin preferences, app links and integrations when switching banks.
      const { user, twin, appLinks, integrations } = current();
      // A different bank has its own C360 code: drop an explicit one so it follows the new bank's name.
      edit({ ...structuredClone(preset.config), user, twin, appLinks, integrations: { ...integrations, c360: { ...integrations.c360, sourceSystem: "" } } });
    },
    resetSection: (section) => {
      const c = current();
      const base = getPreset(c.presetId)?.config ?? DEFAULT_CONFIG;
      edit({ ...c, [section]: structuredClone(base[section]) });
    },
    resetAll: () => edit(structuredClone(DEFAULT_CONFIG)),
    importConfig: (json) => edit(parseConfigFile(json)),
    exportConfig: () => JSON.stringify({ app: "alara-banking-operations", exportedAt: new Date().toISOString(), config: current() }, null, 2),
    save: () => {
      const d = get().draft;
      if (d) useSettings.setState({ config: d });
      set({ draft: null });
    },
    discard: () => set({ draft: null }),
  };
});

export type DraftView = DraftActions & { config: BankConfig };

/** The Settings page's view: the draft (or the saved settings when nothing has changed) plus draft actions. */
export function useDraft<T>(select: (s: DraftView) => T): T {
  const savedConfig = useSettings((s) => s.config);
  const draft = useSettingsDraft((s) => s.draft);
  return select({ ...useSettingsDraft.getState(), config: draft ?? savedConfig });
}

/** True when the draft differs from the saved settings. */
export function useDirty() {
  const savedConfig = useSettings((s) => s.config);
  const draft = useSettingsDraft((s) => s.draft);
  return !!draft && JSON.stringify(draft) !== JSON.stringify(savedConfig);
}
