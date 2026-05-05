import { useParams } from "react-router-dom";
import type { RoleKey } from "../theme/tokens";
import { AdminDashboard } from "./dashboards/AdminDashboard";
import { DoctorDashboard } from "./dashboards/DoctorDashboard";
import { LabDashboard } from "./dashboards/LabDashboard";
import { NurseDashboard } from "./dashboards/NurseDashboard";
import { PatientDashboard } from "./dashboards/PatientDashboard";
import { PharmacyDashboard } from "./dashboards/PharmacyDashboard";

const ROLES: RoleKey[] = ["doctor", "nurse", "lab", "pharmacy", "admin", "patient"];

function isRoleKey(x: string | undefined): x is RoleKey {
  return !!x && (ROLES as string[]).includes(x);
}

export function DashboardPage() {
  const { role: roleParam } = useParams();
  const role = isRoleKey(roleParam) ? roleParam : "admin";

  if (role === "doctor") return <DoctorDashboard />;
  if (role === "nurse") return <NurseDashboard />;
  if (role === "lab") return <LabDashboard />;
  if (role === "pharmacy") return <PharmacyDashboard />;
  if (role === "patient") return <PatientDashboard />;
  return <AdminDashboard />;
}
