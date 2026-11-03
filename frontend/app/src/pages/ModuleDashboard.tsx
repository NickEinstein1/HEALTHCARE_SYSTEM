import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DashIcon } from "../components/brand/DashIcon";
import {
  DashboardShell,
  type DashboardShellVariant,
  useDashboardToast,
} from "../components/dashboard/DashboardShell";
import { buildV2ModuleNav } from "../lib/moduleNav";

export interface ModuleConfig {
  name: string;
  title: string;
  icon: string;
  description: string;
  role: string;
  stats: Array<{ label: string; value: string; meta?: string }>;
  widgets?: Array<{ title: string; content: string; metric?: string }>;
  syncedTabs?: Array<{ id: string; label: string; summary?: string }>;
  shellVariant?: DashboardShellVariant;
  defaultPage?: string;
  renderPage?: (pageId: string, toast: (msg: string) => void) => ReactNode;
}

export interface ModuleDashboardProps {
  config: ModuleConfig;
}

const KPI_BARS = ["g", "b", "am", "r"] as const;

export function ModuleDashboard({ config }: ModuleDashboardProps) {
  const toast = useDashboardToast();
  const tabDefs = config.syncedTabs ?? [
    { id: "overview", label: "Overview", summary: "Module overview and KPI widgets." },
    { id: "operations", label: "Operations", summary: "Operational dashboard and live workflows." },
    { id: "reports", label: "Reports", summary: "Reports and analytics exports." },
  ];

  const [page, setPage] = useState(config.defaultPage ?? tabDefs[0]?.id ?? "overview");
  const shellVariant = config.shellVariant ?? "doctor";
  const scopeClass =
    shellVariant === "nurse" ? "nurse" : shellVariant === "admin" ? "admin" : shellVariant === "lab" ? "lab" : "doc";

  const pageTitle = useMemo(
    () => tabDefs.find((t) => t.id === page)?.label ?? config.title,
    [tabDefs, page, config.title],
  );

  const nav = buildV2ModuleNav([
    {
      label: config.name,
      items: tabDefs.map((t) => ({
        id: t.id,
        icon: config.icon,
        label: t.label,
      })),
    },
  ]);

  const widgets = config.widgets ?? [];

  return (
    <DashboardShell
      shellVariant={shellVariant}
      title={config.title}
      crumb={pageTitle}
      portalSubtitle={`${config.name} Module`}
      userInitials={config.name.slice(0, 2).toUpperCase()}
      userName={config.role}
      userEmail={`${config.name.toLowerCase()}@unihealth.ke`}
      activeNavId={page}
      onNavSelect={setPage}
      nav={nav}
      onTopbarNotificationsClick={() => toast(`${config.name} notifications — no critical alerts.`)}
      onTopbarStatusClick={() => toast(`${config.name} module online.`)}
    >
      <div className={scopeClass}>
        <div className={`pg on`} id={`pg-mod-${page}`}>
          <div className="ph">
            <div>
              <div className="ph-ey">UniHealth 360 · {config.name}</div>
              <div className="ph-ti">{pageTitle}</div>
              <div className="ph-su">{config.description}</div>
            </div>
          </div>

          {config.renderPage ? (
            config.renderPage(page, toast)
          ) : (
            <>
              {(page === "overview" || !config.syncedTabs) && page === "overview" && (
                <>
                  <div className="kpis">
                    {config.stats.map((stat, idx) => (
                      <div className="kpi" key={stat.label}>
                        <div className={`kpi-bar ${KPI_BARS[idx % KPI_BARS.length]}`} />
                        <div className="kpi-ico">
                          <DashIcon icon={config.icon} idPrefix={`mod-kpi-${config.name}`} />
                        </div>
                        <div className="kpi-lbl">{stat.label}</div>
                        <div className="kpi-val">{stat.value}</div>
                        {stat.meta ? <div className="kpi-meta">{stat.meta}</div> : null}
                      </div>
                    ))}
                  </div>
                  {widgets.length > 0 && (
                    <div className="g2" style={{ marginTop: 14 }}>
                      {widgets.map((w) => (
                        <div className="panel" key={w.title}>
                          <div className="pnl-hd">
                            <div className="pnl-title">{w.title}</div>
                            {w.metric ? <span className="tag b">{w.metric}</span> : null}
                          </div>
                          <div className="pnl-body">
                            <p style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.6 }}>{w.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {config.syncedTabs && page !== "overview" && (
                <div className="panel">
                  <div className="pnl-hd">
                    <div className="pnl-title">{pageTitle}</div>
                  </div>
                  <div className="pnl-body">
                    <p style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.6 }}>
                      {tabDefs.find((t) => t.id === page)?.summary}
                    </p>
                  </div>
                </div>
              )}

              {!config.syncedTabs && page === "operations" && (
                <div className="panel">
                  <div className="pnl-hd">
                    <div className="pnl-title">Operational Dashboard</div>
                  </div>
                  <div className="pnl-body">
                    <ul style={{ paddingLeft: 18, color: "var(--t2)", fontSize: 12, lineHeight: 1.8 }}>
                      <li>All systems operational and performing normally</li>
                      <li>No critical incidents reported</li>
                      <li>Scheduled maintenance completed successfully</li>
                      <li>Staff availability: 98%</li>
                    </ul>
                  </div>
                </div>
              )}

              {!config.syncedTabs && page === "reports" && (
                <div className="panel">
                  <div className="pnl-hd">
                    <div className="pnl-title">Reports & Analytics</div>
                  </div>
                  <div className="pnl-body">
                    <ul style={{ paddingLeft: 18, color: "var(--t2)", fontSize: 12, lineHeight: 1.8 }}>
                      <li>Daily Performance Report</li>
                      <li>Monthly Summary & Trends</li>
                      <li>Resource Utilization Analysis</li>
                      <li>Compliance & Audit Trail</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
