import { Route, Routes } from "react-router-dom";
import { SignInPage } from "./pages/SignInPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { MedicalBackground } from "./components/MedicalBackground";
import { CreateAccountPage } from "./pages/CreateAccountPage";

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/sign-in"
          element={
            <>
              <MedicalBackground />
              <SignInPage />
            </>
          }
        />
        <Route
          path="/register"
          element={
            <>
              <MedicalBackground />
              <CreateAccountPage />
            </>
          }
        />
        <Route path="/dashboard/:role" element={<DashboardPage />} />
      </Routes>
    </>
  );
}
