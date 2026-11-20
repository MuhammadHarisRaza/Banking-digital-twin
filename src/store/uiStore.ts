import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface UiState {
  /** Desktop: sidebar shows as a narrow icon rail. Remembered per viewer. */
  collapsed: boolean;
  /** Small screens: sidebar drawer is open. */
  drawerOpen: boolean;
  /** Twin page, wide screens: the full menu is open over the 3D view (the page itself keeps a rail). */
  overlayMenu: boolean;
  /** Branch whose twin was opened last, for the menu's Branch Twin item. */
  lastTwinBranch: string | null;
  toggleCollapsed: () => void;
  setDrawer: (open: boolean) => void;
  setOverlayMenu: (open: boolean) => void;
  setLastTwinBranch: (id: string) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      collapsed: false,
      drawerOpen: false,
      overlayMenu: false,
      lastTwinBranch: null,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setDrawer: (drawerOpen) => set({ drawerOpen }),
      setOverlayMenu: (overlayMenu) => set({ overlayMenu }),
      setLastTwinBranch: (lastTwinBranch) => set({ lastTwinBranch }),
    }),
    {
      name: "alara-ui",
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          return sessionStorage;
        }
      }),
      partialize: (s) => ({ collapsed: s.collapsed, lastTwinBranch: s.lastTwinBranch }),
    },
  ),
);
