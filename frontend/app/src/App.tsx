import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { SignInPage } from "./pages/SignInPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ModuleDashboardPage } from "./pages/ModuleDashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { PortalPage } from "./pages/PortalPage";
import { MedicalBackground } from "./components/MedicalBackground";
import { CreateAccountPage } from "./pages/CreateAccountPage";
import { ThemeToggle } from "./components/ThemeToggle";
import { V2_MODULE_SLUGS } from "./routes/dashboardRoutes";

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="sign-in-route">
      <MedicalBackground />
      <div className="theme-toggle-floating">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/sign-in"
          element={
            <AuthShell>
              <SignInPage />
            </AuthShell>
          }
        />
        <Route
          path="/register"
          element={
            <AuthShell>
              <CreateAccountPage />
            </AuthShell>
          }
        />
        <Route path="/portal" element={<PortalPage />} />
        {V2_MODULE_SLUGS.map((slug) => (
          <Route
            key={slug}
            path={`/dashboard/${slug}`}
            element={<Navigate to={`/modules/${slug}`} replace />}
          />
        ))}
        <Route path="/modules/:module" element={<ModuleDashboardPage />} />
        <Route path="/dashboard/:role" element={<DashboardPage />} />
      </Routes>
    </>
  );
}
