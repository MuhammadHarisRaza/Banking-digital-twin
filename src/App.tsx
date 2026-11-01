import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router";
import TopHeader from "./components/layout/TopHeader";
import ApplicationLaunch from "./pages/ApplicationLaunch";
import BankOperations from "./pages/BankOperations";
import Customer360Launch from "./pages/Customer360Launch";
import DigitalEyeLaunch from "./pages/DigitalEyeLaunch";

const HeadquartersOverview = lazy(() => import("./components/headquarters/HeadquartersOverview"));

function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopHeader />
      <Suspense fallback={null}>
        <Outlet />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<BankOperations />} />
        <Route path="headquarters" element={<HeadquartersOverview />} />
      </Route>
      <Route path="digital-eye" element={<DigitalEyeLaunch />} />
      <Route path="customer-360" element={<Customer360Launch />} />
      <Route path="apps/:appId" element={<ApplicationLaunch />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
