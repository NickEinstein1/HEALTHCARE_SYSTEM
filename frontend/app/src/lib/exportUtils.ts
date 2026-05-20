/**
 * UniHealth — Export Utilities
 * Provides CSV, JSON, and print-PDF export for any tabular or record data.
 */

/** Flatten an array of objects into CSV string */
function toCSV(rows: Record<string, unknown>[], filename: string): void {
  if (!rows.length) { alert("No data to export."); return; }
  const cols = Object.keys(rows[0]);
  const header = cols.join(",");
  const body = rows.map((r) =>
    cols.map((c) => {
      const v = String(r[c] ?? "").replace(/"/g, '""');
      return v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v}"` : v;
    }).join(",")
  ).join("\n");
  download(`${filename}.csv`, "text/csv", `${header}\n${body}`);
}

/** Serialize to pretty-printed JSON */
function toJSON(data: unknown, filename: string): void {
  download(`${filename}.json`, "application/json", JSON.stringify(data, null, 2));
}

/** Trigger print dialog so user can save as PDF */
function toPDF(title: string): void {
  const prev = document.title;
  document.title = title;
  window.print();
  document.title = prev;
}

/** Generic blob download helper */
function download(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type ExportFormat = "csv" | "json" | "pdf";

export interface ExportConfig {
  /** Label shown in the dropdown */
  label?: string;
  /** File name prefix (no extension) */
  filename: string;
  /** Rows to export as CSV / JSON. For PDF only the print dialog is used. */
  rows?: Record<string, unknown>[];
  /** For JSON export you can pass a richer object instead of rows */
  data?: unknown;
  /** Page title shown in print dialog */
  printTitle?: string;
}

/** Main export dispatcher — call with chosen format */
export function runExport(fmt: ExportFormat, cfg: ExportConfig): void {
  try {
    switch (fmt) {
      case "csv":
        toCSV(cfg.rows ?? [], cfg.filename);
        break;
      case "json":
        toJSON(cfg.data ?? cfg.rows ?? [], cfg.filename);
        break;
      case "pdf":
        toPDF(cfg.printTitle ?? cfg.filename);
        break;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Export error:", e);
  }
}
