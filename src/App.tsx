import { lazy, Suspense, useCallback } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import Sidebar, { SIDEBAR_DESKTOP } from "./components/layout/Sidebar";
import TopHeader from "./components/layout/TopHeader";
import ApplicationLaunch from "./pages/ApplicationLaunch";
import BankOperations from "./pages/BankOperations";
import Customer360Launch from "./pages/Customer360Launch";
import DigitalEyeLaunch from "./pages/DigitalEyeLaunch";
import { useUi } from "./store/uiStore";

const HeadquartersOverview = lazy(() => import("./components/headquarters/HeadquartersOverview"));
const Branches = lazy(() => import("./pages/Branches"));
const BranchTwin = lazy(() => import("./pages/BranchTwin"));
const Settings = lazy(() => import("./pages/Settings"));
const Applications = lazy(() => import("./pages/Applications"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerDrawer = lazy(() => import("./components/c360/CustomerDrawer"));

function MainLayout() {
  const drawerOpen = useUi((s) => s.drawerOpen);
  const overlayMenu = useUi((s) => s.overlayMenu);
  const setDrawer = useUi((s) => s.setDrawer);
  const setOverlayMenu = useUi((s) => s.setOverlayMenu);
  const toggleCollapsed = useUi((s) => s.toggleCollapsed);
  const { pathname } = useLocation();
  const onTwin = /^\/branches\/[^/]+\/twin/.test(pathname);

  // The header's menu button folds the sidebar on wide screens and opens it as a drawer on small ones.
  // On the twin, which keeps the menu folded to a rail, it opens the full menu over the 3D view instead.
  const onMenu = useCallback(() => {
    if (!window.matchMedia(SIDEBAR_DESKTOP).matches) setDrawer(!drawerOpen);
    else if (onTwin) setOverlayMenu(!overlayMenu);
    else toggleCollapsed();
  }, [drawerOpen, overlayMenu, onTwin, setDrawer, setOverlayMenu, toggleCollapsed]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopHeader onMenu={onMenu} menuOpen={drawerOpen || (onTwin && overlayMenu)} />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Suspense fallback={<div className="flex-1" />}>
            <Outlet />
          </Suspense>
          <Suspense fallback={null}>
            <CustomerDrawer />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<BankOperations />} />
        <Route path="headquarters" element={<HeadquartersOverview />} />
        <Route path="branches" element={<Branches />} />
        <Route path="branches/:branchId/twin" element={<BranchTwin />} />
        <Route path="apps" element={<Applications />} />
        <Route path="customers" element={<Customers />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="digital-eye" element={<DigitalEyeLaunch />} />
      <Route path="customer-360" element={<Customer360Launch />} />
      <Route path="apps/:appId" element={<ApplicationLaunch />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
