import { Navigate, useParams } from "react-router-dom";
import { resolveV2Module } from "../routes/dashboardRoutes";

/** v2.0 UniHealth 360 modules at `/modules/:module`. */
export function ModuleDashboardPage() {
  const { module: moduleParam } = useParams();
  const Component = resolveV2Module(moduleParam);

  if (!Component) {
    return <Navigate to="/portal" replace />;
  }

  return <Component />;
}
