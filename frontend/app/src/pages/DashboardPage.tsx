import { useParams } from "react-router-dom";
import { resolveLegacyDashboard } from "../routes/dashboardRoutes";

/** Production dashboards only — `/dashboard/doctor|nurse|patient|admin|lab|pharmacy`. */
export function DashboardPage() {
  const { role: roleParam } = useParams();
  const Legacy = resolveLegacyDashboard(roleParam);
  return <Legacy />;
}
