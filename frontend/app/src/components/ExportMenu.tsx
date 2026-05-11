import { useEffect, useRef, useState } from "react";
import { runExport, ExportFormat, ExportConfig } from "../lib/exportUtils";

const FORMATS: { fmt: ExportFormat; label: string; icon: string; desc: string }[] = [
  { fmt: "csv",  label: "CSV Spreadsheet",  icon: "📊", desc: "Excel / Google Sheets compatible" },
  { fmt: "json", label: "JSON Data",        icon: "🗂️", desc: "Raw structured data" },
  { fmt: "pdf",  label: "Print / Save PDF", icon: "🖨️", desc: "Opens browser print dialog" },
];

interface ExportMenuProps {
  /** Configuration passed directly to runExport */
  config: ExportConfig;
  /** Button label. Defaults to "Export" */
  label?: string;
  /** Optional extra className on the trigger button */
  className?: string;
  /** Called after successful export (for toast) */
  onExported?: (fmt: ExportFormat) => void;
}

export function ExportMenu({ config, label = "Export", className = "btn-s", onExported }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div className="exp-wrap" ref={ref}>
      <button
        type="button"
        className={`${className} exp-trigger`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {label}
        <svg
          width="10" height="10" viewBox="0 0 20 20" fill="currentColor" aria-hidden
          style={{ opacity: 0.55, transition: "transform .18s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M5.5 8l4.5 4.5L14.5 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div className="exp-menu" role="menu" aria-label="Export options">
          <div className="exp-menu-hd">Export as</div>
          {FORMATS.map(({ fmt, label: fmtLabel, icon, desc }) => (
            <button
              key={fmt}
              role="menuitem"
              type="button"
              className="exp-item"
              onClick={() => {
                setOpen(false);
                runExport(fmt, config);
                onExported?.(fmt);
              }}
            >
              <span className="exp-item-ico" aria-hidden>{icon}</span>
              <span className="exp-item-body">
                <span className="exp-item-lbl">{fmtLabel}</span>
                <span className="exp-item-desc">{desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
