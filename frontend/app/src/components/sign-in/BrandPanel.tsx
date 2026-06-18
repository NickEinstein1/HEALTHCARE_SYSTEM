import type { RoleKey } from "../../theme/tokens";
import { MasterDashboardPanel } from "./MasterDashboardPanel";

type Props = {
  aiAttempts: number;
  auditLines: [string, string, string];
  selectedRole?: RoleKey | null;
  signInStep?: number;
};

/** Sign-in left rail — Master Intelligence Dashboard (Module Pull + live ops). */
export function BrandPanel({
  aiAttempts,
  auditLines,
  selectedRole = null,
  signInStep = 1,
}: Props) {
  return (
    <MasterDashboardPanel
      aiAttempts={aiAttempts}
      auditLines={auditLines}
      selectedRole={selectedRole}
      signInStep={signInStep}
    />
  );
}
