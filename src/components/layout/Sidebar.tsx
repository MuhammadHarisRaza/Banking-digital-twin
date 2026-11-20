import { useEffect } from "react";
import {
  Box,
  Building2,
  Camera,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LayoutGrid,
  Settings,
  Store,
  UserRoundSearch,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { NavLink, useLocation } from "react-router";
import type { ModuleId } from "../../config/bankConfig";
import { useBranches } from "../../data/branches";
import { useAppLauncher } from "../../hooks/useAppLauncher";
import { useConfig } from "../../store/settingsStore";
import { useUi } from "../../store/uiStore";
import type { AppLinkKey } from "../../types";

type Item =
  | { id: ModuleId | "settings"; icon: LucideIcon; to: string; end?: boolean; match?: RegExp }
  | { id: ModuleId; icon: LucideIcon; launch: AppLinkKey };

/** Matches the dashboard's floating layout, where the sidebar sits beside the page instead of over it. */
export const SIDEBAR_DESKTOP = "(min-width: 80rem)";

function useDrawerOpen() {
  const drawerOpen = useUi((s) => s.drawerOpen);
  const setDrawer = useUi((s) => s.setDrawer);
  useEffect(() => {
    const query = window.matchMedia(SIDEBAR_DESKTOP);
    const close = () => query.matches && setDrawer(false);
    query.addEventListener("change", close);
    return () => query.removeEventListener("change", close);
  }, [setDrawer]);
  return drawerOpen;
}

export default function Sidebar() {
  const { modules } = useConfig();
  const { primary } = useBranches();
  const launch = useAppLauncher();
  const location = useLocation();
  const collapsedPref = useUi((s) => s.collapsed);
  const toggleCollapsed = useUi((s) => s.toggleCollapsed);
  const setDrawer = useUi((s) => s.setDrawer);
  const lastTwin = useUi((s) => s.lastTwinBranch);
  const drawerOpen = useDrawerOpen();
  const overlayMenu = useUi((s) => s.overlayMenu);
  const setOverlayMenu = useUi((s) => s.setOverlayMenu);

  // The 3D twin needs the width, so the menu folds to a rail there; the menu button opens it over the view.
  const onTwin = /^\/branches\/[^/]+\/twin/.test(location.pathname);
  const overlay = onTwin && overlayMenu;
  const collapsed = onTwin ? !overlayMenu : collapsedPref;

  // Close the drawer (and the twin's overlay menu) after navigating.
  useEffect(() => {
    setDrawer(false);
    setOverlayMenu(false);
  }, [location.pathname, setDrawer, setOverlayMenu]);

  // Esc closes the overlay menu.
  useEffect(() => {
    if (!overlay) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOverlayMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, setOverlayMenu]);

  const twinBranch = lastTwin ?? primary[0]?.id;
  const items: Item[] = [
    { id: "navDashboard", icon: LayoutDashboard, to: "/", end: true },
    { id: "navBranches", icon: Store, to: "/branches", end: true },
    ...(twinBranch ? [{ id: "navTwin" as const, icon: Box, to: `/branches/${twinBranch}/twin`, match: /\/twin$/ }] : []),
    { id: "navCustomers", icon: UsersRound, to: "/customers" },
    { id: "navHeadquarters", icon: Building2, to: "/headquarters" },
    { id: "navApplications", icon: LayoutGrid, to: "/apps", end: true },
    { id: "navDigitalEye", icon: Camera, launch: "digitalEye" },
    { id: "navCustomer360", icon: UserRoundSearch, launch: "customer360" },
  ];
  const visible = items.filter((item) => modules[item.id as ModuleId]?.visible !== false);

  const linkClass = (active: boolean) =>
    `group relative flex h-11 items-center gap-3 rounded-lg px-3 text-[15.5px] transition-colors ${
      active ? "bg-brand text-white" : "text-soft hover:bg-brand/10 hover:text-ink"
    }`;

  const label = (text: string) => (
    <span className={`truncate ${collapsed ? "xl:sr-only" : ""}`}>{text}</span>
  );

  return (
    <>
      {drawerOpen && (
        <div className="fixed inset-0 top-[70px] z-[1040] bg-ink/30 xl:hidden" aria-hidden="true" onClick={() => setDrawer(false)} />
      )}
      {/* On the twin the rail is fixed; this spacer holds its width in the layout so the view never shifts. */}
      {onTwin && <div className="hidden w-[68px] shrink-0 xl:block" aria-hidden="true" />}
      {overlay && <div className="fixed inset-0 top-[70px] z-[1040] hidden bg-ink/25 xl:block" aria-hidden="true" onClick={() => setOverlayMenu(false)} />}
      <nav
        aria-label="Main menu"
        className={`thin-scroll fixed top-[70px] bottom-0 left-0 z-[1050] flex w-64 flex-col overflow-y-auto border-r border-line bg-panel px-3 py-4 transition-transform duration-200 xl:h-[calc(100vh-70px)] xl:translate-x-0 ${
          // On the twin the menu is always out of the layout (a fixed rail beside a 68 px spacer), so opening it
          // floats over the 3D view without resizing the canvas.
          onTwin ? "xl:fixed xl:z-[1050]" : "xl:sticky xl:z-[700] xl:transition-[width]"
        } ${drawerOpen ? "translate-x-0 shadow-2xl shadow-ink/20" : "-translate-x-full"} ${collapsed ? "xl:w-[68px] xl:px-2.5" : "xl:w-60"} ${
          overlay ? "xl:shadow-2xl xl:shadow-ink/20" : ""
        }`}
      >
        <ul className="flex flex-col gap-1">
          {visible.map((item) => {
            const text = modules[item.id as ModuleId]?.label ?? item.id;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                {"launch" in item ? (
                  <button
                    type="button"
                    title={collapsed ? text : undefined}
                    onClick={() => launch(item.launch)}
                    className={`${linkClass(false)} w-full text-left`}
                  >
                    <Icon className="size-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
                    {label(text)}
                  </button>
                ) : (
                  <NavLink
                    to={item.to}
                    end={item.end}
                    title={collapsed ? text : undefined}
                    className={({ isActive }) => linkClass(item.match ? item.match.test(location.pathname) : isActive)}
                  >
                    <Icon className="size-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
                    {label(text)}
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-auto flex flex-col gap-1 border-t border-line pt-3">
          <NavLink to="/settings" title={collapsed ? "Settings" : undefined} className={({ isActive }) => linkClass(isActive)}>
            <Settings className="size-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
            {label("Settings")}
          </NavLink>
          {(
            <button
              type="button"
              onClick={() => (onTwin ? setOverlayMenu(!overlayMenu) : toggleCollapsed())}
              aria-label={collapsed ? "Expand menu" : "Collapse menu"}
              className={`${linkClass(false)} max-xl:hidden`}
            >
              {collapsed ? (
                <ChevronsRight className="size-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
              ) : (
                <ChevronsLeft className="size-5 shrink-0" strokeWidth={1.6} aria-hidden="true" />
              )}
              {label("Collapse")}
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
