#!/usr/bin/env node
/**
 * Build professional Word (.docx) user manuals with optimized embedded images.
 */
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  Header,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import sharp from "sharp";
import { readFile, readdir, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANUALS = path.join(__dirname, "../docs/user-manuals");
const IMG = path.join(MANUALS, "images");
const EMAIL_IMG = path.join(IMG, "email");
const DOCX_OUT = path.join(MANUALS, "docx");

const DOCX_IMG_MAX = 520;
const BRAND = {
  facility: "Kenya National Hospital (KNH) — UniHealth Phase 1 Pilot",
  version: "1.2",
  date: "June 2026",
  docId: "DOC-UI-001",
};

const FONT = "Calibri";
const COLOR = {
  title: "0F766E",
  heading: "134E4A",
  body: "1E293B",
  muted: "64748B",
  accent: "0D9488",
};

async function imgRun(name, caption, figureNo) {
  const jpg = path.join(EMAIL_IMG, `${name}.jpg`);
  const png = path.join(IMG, `${name}.png`);
  let buf;
  try {
    buf = await readFile(jpg);
  } catch {
    buf = await readFile(png);
  }
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? DOCX_IMG_MAX;
  const h = meta.height ?? 320;
  const scale = Math.min(1, DOCX_IMG_MAX / w);
  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);
  const optimized = await sharp(buf)
    .resize({ width: tw, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
      children: [
        new ImageRun({
          data: optimized,
          transformation: { width: tw, height: th },
        }),
      ],
    }),
  ];
  if (caption) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 280 },
        children: [
          new TextRun({ text: `Figure ${figureNo}. `, bold: true, font: FONT, size: 20, color: COLOR.body }),
          new TextRun({ text: caption, font: FONT, size: 20, color: COLOR.muted, italics: true }),
        ],
      }),
    );
  }
  return children;
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 160, ...opts.spacing },
    alignment: opts.align,
    children: Array.isArray(text)
      ? text
      : [new TextRun({ text, font: FONT, size: opts.size ?? 22, color: opts.color ?? COLOR.body, bold: opts.bold, italics: opts.italics })],
  });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 }, children: [new TextRun({ text, font: FONT, size: 32, bold: true, color: COLOR.heading })] });
}

function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 }, children: [new TextRun({ text, font: FONT, size: 26, bold: true, color: COLOR.heading })] });
}

function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 }, children: [new TextRun({ text, font: FONT, size: 24, bold: true, color: COLOR.body })] });
}

function bullet(text) {
  return new Paragraph({
    spacing: { after: 80 },
    bullet: { level: 0 },
    children: [new TextRun({ text, font: FONT, size: 22, color: COLOR.body })],
  });
}

function mdTable(rows) {
  if (!rows.length) return null;
  const colCount = rows[0].length;
  const width = Math.floor(9360 / colCount);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((cells, ri) =>
      new TableRow({
        children: cells.map(
          (c) =>
            new TableCell({
              width: { size: width, type: WidthType.DXA },
              shading: ri === 0 ? { fill: "F1F5F9" } : undefined,
              children: [p(c.trim(), { size: 20, bold: ri === 0 })],
            }),
        ),
      }),
    ),
  });
}

function parseMdTable(lines, start) {
  const rows = [];
  let i = start;
  while (i < lines.length && lines[i].trim().startsWith("|")) {
    const line = lines[i].trim();
    if (!/^\|[-\s|:]+\|$/.test(line.replace(/\s/g, ""))) {
      rows.push(line.split("|").slice(1, -1).map((c) => c.trim()));
    }
    i++;
  }
  return { rows, next: i };
}

function mdToChildren(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { i++; continue; }
    if (t === "---") { i++; continue; }
    if (t.startsWith("# ")) { out.push(h1(t.slice(2))); i++; continue; }
    if (t.startsWith("## ")) { out.push(h2(t.slice(3))); i++; continue; }
    if (t.startsWith("### ")) { out.push(h3(t.slice(4))); i++; continue; }
    if (t.startsWith("#### ")) { out.push(h3(t.slice(5))); i++; continue; }
    if (t.startsWith("|")) {
      const { rows, next } = parseMdTable(lines, i);
      const tbl = mdTable(rows);
      if (tbl) out.push(tbl);
      i = next;
      continue;
    }
    if (/^-\s+/.test(t)) {
      out.push(bullet(t.replace(/^-\s+/, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/`/g, "")));
      i++;
      continue;
    }
    if (/^\d+\.\s+/.test(t)) {
      out.push(new Paragraph({
        spacing: { after: 80 },
        numbering: { reference: "ol", level: 0 },
        children: [new TextRun({ text: t.replace(/^\d+\.\s+/, "").replace(/\*\*(.+?)\*\*/g, "$1"), font: FONT, size: 22 })],
      }));
      i++;
      continue;
    }
    const clean = t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    if (clean) out.push(p(clean));
    i++;
  }
  return out;
}

function coverPage(title, subtitle) {
  return [
    p("OFFICIAL USER MANUAL", { size: 18, color: COLOR.accent, bold: true, align: AlignmentType.CENTER, spacing: { before: 1200, after: 200 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: title, font: FONT, size: 52, bold: true, color: COLOR.title })],
    }),
    p(subtitle, { size: 24, color: COLOR.muted, align: AlignmentType.CENTER, spacing: { after: 400 } }),
    p(BRAND.facility, { size: 22, bold: true, align: AlignmentType.CENTER }),
    p(`Version ${BRAND.version} · ${BRAND.date} · ${BRAND.docId}`, { size: 20, color: COLOR.muted, align: AlignmentType.CENTER, spacing: { after: 200 } }),
    p("Ministry of Health aligned · KDPA 2019 · FHIR R5", { size: 20, color: COLOR.muted, align: AlignmentType.CENTER }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function docFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: `UniHealth · ${BRAND.facility} · ${BRAND.docId}`, font: FONT, size: 18, color: COLOR.muted }),
        ],
      }),
    ],
  });
}

async function buildMdDocx(mdFile, outName, title, subtitle) {
  const md = await readFile(path.join(MANUALS, mdFile), "utf8");
  const body = mdToChildren(md.replace(/^# .+\n\n/, ""));
  const doc = new Document({
    numbering: {
      config: [{ reference: "ol", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }] }],
    },
    sections: [{
      properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      footers: { default: docFooter() },
      children: [...coverPage(title, subtitle), ...body],
    }],
  });
  const buf = await Packer.toBuffer(doc);
  const out = path.join(DOCX_OUT, outName);
  await writeFile(out, buf);
  console.log("DOCX:", out, `(${(buf.length / 1024).toFixed(0)} KB)`);
  return buf.length;
}

async function buildCombinedDocx() {
  let fig = 0;
  const F = async (img, cap) => { fig++; return imgRun(img, cap, fig); };

  const sections = [
    ...coverPage(
      "UniHealth Web Interface",
      "Complete user manual for all roles — sign-in, dashboards, workflows, and UniHealth 360 portal",
    ),
    h1("Table of Contents"),
    ...["1. Introduction", "2. System Requirements", "3. Sign-in & Authentication", "4. Dashboard Layout",
      "5. Doctor Dashboard", "6. Nurse Dashboard", "7. Patient Portal", "8. Administrator Console",
      "9. Laboratory Dashboard", "10. Pharmacy Dashboard", "11. UniHealth 360 Portal",
      "12. AI Assist (Pilot)", "13. Privacy & Compliance", "14. Troubleshooting", "15. Quick Reference",
    ].map((x) => bullet(x)),
    new Paragraph({ children: [new PageBreak()] }),

    h1("1. Introduction"),
    p("This manual describes the UniHealth web application for clinical, administrative, laboratory, pharmacy, and patient-facing workflows across six production dashboards and the UniHealth 360 enterprise portal."),
    ...(await F("01-landing", "UniHealth home page — select Sign in or open the UniHealth 360 portal.")),

    h1("2. System Requirements"),
    mdTable([
      ["Requirement", "Details"],
      ["Browser", "Recent Chrome, Firefox, Safari, or Edge"],
      ["Network", "Access to facility UniHealth gateway"],
      ["Credentials", "Issued by facility HR/IT"],
    ]),

    h1("3. Sign-in & Authentication"),
    p("Every user completes a four-step flow: role selection → credentials → MFA → launch dashboard."),
    h2("Step 1 — Select your role"),
    p("Scroll horizontally through role cards and tap your job function, then Continue."),
    ...(await F("02-signin-step1-role-select", "Role picker — scroll left or right to view Doctor, Nurse, Lab, Pharmacy, Admin, and Patient.")),
    h2("Step 2 — Staff credentials"),
    ...(await F("03-signin-step2-credentials", "Staff sign-in: registration number, institutional email, and password.")),
    h2("Step 2 — Patient credentials"),
    ...(await F("06-signin-patient-credentials", "Patient sign-in: ID, UniHealth PIN, and mobile number.")),
    h2("Step 3 — Multi-factor authentication"),
    ...(await F("04-signin-step3-mfa", "MFA: email/SMS OTP, biometric, or Practice 360 approval.")),
    h2("Step 4 — Launch dashboard"),
    ...(await F("05-signin-step4-launch", "Access granted — click Launch Dashboard to open your workspace.")),
    h2("Patient registration"),
    ...(await F("07-register", "Four-step registration wizard for new patient accounts.")),

    h1("4. Dashboard Layout"),
    p("All production dashboards share: sidebar navigation, top bar, main content area, toasts, and sign out."),
    mdTable([
      ["Element", "Function"],
      ["Sidebar", "Primary navigation by section"],
      ["Top bar", "Title, search, notifications"],
      ["Main content", "KPIs, tables, forms, AI panels"],
    ]),

    h1("5. Doctor Dashboard"),
    p("URL: /dashboard/doctor — physicians and specialists."),
    ...(await F("09-dashboard-doctor", "Doctor dashboard — overview, patient queue, ward status, and AI Assist risk panel.")),
    mdTable([
      ["Clinical menu", "Purpose"],
      ["Today's Overview", "Shift summary and KPIs"],
      ["Patient Chart", "Longitudinal record"],
      ["Patient Queue", "Waiting outpatients"],
      ["Lab Orders & Results", "Order and review tests"],
      ["Prescriptions", "Medication orders"],
    ]),

    h1("6. Nurse Dashboard"),
    p("URL: /dashboard/nurse — nurses and clinical officers."),
    ...(await F("10-dashboard-nurse", "Nurse dashboard — shift overview, vitals, MAR, and handover.")),
    mdTable([
      ["Menu", "Purpose"],
      ["Record Vitals", "BP, HR, RR, temp, SpO₂, glucose"],
      ["MAR", "Medication administration record"],
      ["Handover", "End-of-shift report"],
    ]),

    h1("7. Patient Portal"),
    p("URL: /dashboard/patient — personal health and payments."),
    ...(await F("11-dashboard-patient", "Patient portal — appointments, results, UniHealth Cover, and M-PESA payments.")),
    mdTable([
      ["Section", "Menus"],
      ["My Health", "Dashboard, Appointments, Results, Medications, Vitals"],
      ["Payments", "Cover, Contributions, Bills, M-PESA"],
      ["Privacy", "KDPA 2019 consent controls"],
    ]),

    h1("8. Administrator Console"),
    p("URL: /dashboard/admin — users, facilities, RBAC, audit."),
    ...(await F("12-dashboard-admin", "Administrator overview — user management, facilities, AI monitor, system health.")),

    h1("9. Laboratory Dashboard"),
    p("URL: /dashboard/lab — specimens, imaging, QC."),
    ...(await F("13-dashboard-lab", "Laboratory — collection queue, test queue, imaging worklists.")),

    h1("10. Pharmacy Dashboard"),
    p("URL: /dashboard/pharmacy — dispensing, stock, interactions."),
    ...(await F("14-dashboard-pharmacy", "Pharmacy — prescription queue, verification, and stock alerts.")),

    h1("11. UniHealth 360 Portal"),
    p("URL: /portal — enterprise module catalog."),
    ...(await F("08-portal", "UniHealth 360 portal — 20 modules across clinical, operations, and management.")),
    ...(await F("15-module-emr", "EMR module at /modules/emr — clinical hub.")),

    h1("12. AI Assist (Pilot)"),
    p("Doctor and nurse dashboards show rules-based NEWS2-style risk scores. This is a pilot — clinical judgement always applies. Not diagnostic AI."),

    h1("13. Privacy & Compliance"),
    bullet("KDPA 2019 — patient consent via Privacy & Consent screen"),
    bullet("MOH alignment — facility and county reporting"),
    bullet("Never share PINs, passwords, or OTP codes"),

    h1("14. Troubleshooting"),
    mdTable([
      ["Symptom", "Action"],
      ["Blank data / API offline", "Confirm gateway on port 8100; refresh"],
      ["Sign-in loops", "Clear cache; verify role and credentials"],
      ["MFA not received", "Check spam or SMS network; contact IT"],
    ]),

    h1("15. Quick Reference"),
    mdTable([
      ["Role", "URL", "First menu"],
      ["Doctor", "/dashboard/doctor", "Today's Overview"],
      ["Nurse", "/dashboard/nurse", "Shift Overview"],
      ["Patient", "/dashboard/patient", "My Dashboard"],
      ["Administrator", "/dashboard/admin", "Overview"],
      ["Laboratory", "/dashboard/lab", "Overview"],
      ["Pharmacy", "/dashboard/pharmacy", "Overview"],
      ["Enterprise", "/portal", "Launch Clinician Portal"],
    ]),
  ];

  const doc = new Document({
    numbering: {
      config: [{ reference: "ol", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }] }],
    },
    sections: [{
      properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      footers: { default: docFooter() },
      children: sections.flat(),
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const out = path.join(DOCX_OUT, "UniHealth-Web-User-Manual-Combined.docx");
  await writeFile(out, buf);
  console.log("DOCX:", out, `(${(buf.length / (1024 * 1024)).toFixed(2)} MB)`);
  return buf.length;
}

async function main() {
  await mkdir(DOCX_OUT, { recursive: true });

  const mdFiles = [
    ["00-getting-started.md", "00-Getting-Started.docx", "Getting Started", "Sign-in, MFA, and dashboard layout for all users"],
    ["01-doctor.md", "01-Doctor-Manual.docx", "Doctor — Web Interface Manual", "Physicians and specialists"],
    ["02-nurse.md", "02-Nurse-Manual.docx", "Nurse — Web Interface Manual", "Nurses and clinical officers"],
    ["03-patient.md", "03-Patient-Manual.docx", "Patient — Web Interface Manual", "Personal health portal"],
    ["04-administrator.md", "04-Administrator-Manual.docx", "Administrator — Web Interface Manual", "Facility and system administrators"],
    ["05-laboratory.md", "05-Laboratory-Manual.docx", "Laboratory — Web Interface Manual", "Lab and imaging staff"],
    ["06-pharmacy.md", "06-Pharmacy-Manual.docx", "Pharmacy — Web Interface Manual", "Pharmacists and dispensing staff"],
    ["07-unihealth-360-portal.md", "07-UniHealth-360-Portal.docx", "UniHealth 360 Portal", "Enterprise module catalog"],
  ];

  for (const [md, out, title, sub] of mdFiles) {
    await buildMdDocx(md, out, title, sub);
  }
  await buildCombinedDocx();
  console.log("Done — Word manuals in docs/user-manuals/docx/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
