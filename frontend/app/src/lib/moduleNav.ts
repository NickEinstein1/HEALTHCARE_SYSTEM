import type { DashboardNavSection } from "../components/dashboard/DashboardShell";
import { V2_MODULE_NAV } from "../routes/dashboardRoutes";

/** Internal module pages + UniHealth 360 cross-module links (production shell). */
export function buildV2ModuleNav(
  internalSections: DashboardNavSection[],
  portalPath = "/portal",
): DashboardNavSection[] {
  const crossModule: DashboardNavSection[] = V2_MODULE_NAV.map((sec) => ({
    label: sec.section,
    items: sec.items.map((item) => ({
      id: item.path,
      icon: item.icon,
      label: item.label,
      href: item.path,
    })),
  }));

  return [
    ...internalSections,
    {
      label: "UniHealth 360",
      items: [{ id: "portal", icon: "🚀", label: "Module catalog", href: portalPath }],
    },
    ...crossModule,
  ];
}
