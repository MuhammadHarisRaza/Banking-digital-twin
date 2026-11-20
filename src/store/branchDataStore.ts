import { create } from "zustand";
import type { PublishedBranch } from "../data/branchSource";

const KEY = "alara-branch-dataset";
/** localStorage holds about 5 MB per site; leave room for the settings and logos. */
const MAX_BYTES = 3_500_000;

interface StoredDataset {
  name: string;
  importedAt: string;
  branches: PublishedBranch[];
}

function load(): StoredDataset | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDataset;
    return Array.isArray(parsed?.branches) && parsed.branches.length ? parsed : null;
  } catch {
    return null;
  }
}

interface BranchDataState {
  /** null = the bundled default branch list. */
  dataset: StoredDataset | null;
  setDataset: (name: string, branches: PublishedBranch[]) => void;
  clearDataset: () => void;
}

/** The imported branch list lives under its own key so it never crowds out the settings. */
export const useBranchData = create<BranchDataState>()((set) => ({
  dataset: load(),
  setDataset: (name, branches) => {
    const dataset = { name, importedAt: new Date().toISOString(), branches };
    const json = JSON.stringify(dataset);
    if (json.length > MAX_BYTES) {
      throw new Error(
        `That branch list is too large to keep in the browser (${(json.length / 1e6).toFixed(1)} MB; the limit is ${MAX_BYTES / 1e6} MB). Remove unused columns such as long addresses and try again.`,
      );
    }
    try {
      localStorage.setItem(KEY, json);
    } catch {
      // Still usable for this session even when it cannot be saved.
      console.warn("The branch list could not be saved; it will reset on reload.");
    }
    set({ dataset });
  },
  clearDataset: () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    set({ dataset: null });
  },
}));
