#!/usr/bin/env node
/**
 * Build UniHealth Comprehensive Dashboard Manual as Word (.docx).
 * Images centred; figure title + explanation aligned beneath each screenshot.
 */
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
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
import { readFile, writeFile, mkdir, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { MANUAL_ROLES } from "./manual_roles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANUALS = path.join(__dirname, "../manuals");
const OUT_FILE = path.join(MANUALS, "UniHealth-Comprehensive-Dashboard-Manual.docx");

const DOCX_IMG_MAX = 520;
const FONT = "Calibri";
const COLOR = {
  title: "0F766E",
  heading: "134E4A",
  body: "1E293B",
  muted: "64748B",
  accent: "0D9488",
  role: "0D6E4F",
};

const ROLE_OVERVIEW = {
  doctor:
    "The Clinical Workstation is the physician command centre: queue management, longitudinal charts, orders, AI-assisted triage hints, e-signatures, and referrals — all in one sidebar.",
  nurse:
    "The Nurse Station supports shift-based ward care: triage, vitals capture, medication administration (MAR), SBAR handover, and supply requests with live patient context.",
  patient:
    "The Patient Portal gives individuals control over appointments, results, medications, UniHealth cover, payments, and KDPA privacy settings — without calling the front desk.",
  admin:
    "The Admin Console is the facility control plane: user provisioning, facility registry, RBAC, AI monitoring, audit logs, and integration health for the entire pilot.",
  lab:
    "The Laboratory portal spans specimen collection through results entry, QC, imaging modalities, specialised labs, and compliance reporting for diagnostic services.",
  pharmacy:
    "The Pharmacy workstation covers the full dispensing loop: Rx queue, clinical verification, stock and KEMSA orders, interaction checks, and ModelCover claims.",
};

let figureNo = 0;

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 160, before: opts.before ?? 0 },
    alignment: opts.align ?? AlignmentType.LEFT,
    children: Array.isArray(text)
      ? text
      : [
          new TextRun({
            text,
            font: FONT,
            size: opts.size ?? 22,
            color: opts.color ?? COLOR.body,
            bold: opts.bold,
            italics: opts.italics,
          }),
        ],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, font: FONT, size: 32, bold: true, color: COLOR.heading })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, font: FONT, size: 26, bold: true, color: COLOR.heading })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, font: FONT, size: 24, bold: true, color: COLOR.body })],
  });
}

function bullet(text) {
  return new Paragraph({
    spacing: { after: 80 },
    bullet: { level: 0 },
    children: [new TextRun({ text, font: FONT, size: 22, color: COLOR.body })],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
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
              shading: ri === 0 ? { fill: "F5E6B8" } : undefined,
              children: [p(c, { size: 20, bold: ri === 0, after: 80 })],
            }),
        ),
      }),
    ),
  });
}

async function figureBlock(roleSlug, file, title, caption, roleLabel) {
  figureNo += 1;
  const imgPath = path.join(MANUALS, roleSlug, "images", `${file}.png`);
  await access(imgPath);
  const buf = await readFile(imgPath);
  const meta = await sharp(buf).metadata();
  const w = meta.width ?? DOCX_IMG_MAX;
  const h = meta.height ?? 320;
  const scale = Math.min(1, DOCX_IMG_MAX / w);
  const tw = Math.round(w * scale);
  const th = Math.round(h * scale);
  const optimized = await sharp(buf)
    .resize({ width: tw, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 280, after: 120 },
      children: [
        new ImageRun({
          data: optimized,
          transformation: { width: tw, height: th },
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: `Figure ${figureNo} · ${roleLabel}`,
          font: FONT,
          size: 18,
          bold: true,
          color: COLOR.muted,
          allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({ text: title, font: FONT, size: 22, bold: true, color: COLOR.role }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 320 },
      indent: { left: 360, right: 360 },
      children: [
        new TextRun({ text: caption, font: FONT, size: 21, color: COLOR.body, italics: false }),
      ],
    }),
  ];
}

function coverPage() {
  return [
    p("OFFICIAL USER MANUAL", {
      size: 18,
      color: COLOR.accent,
      bold: true,
      align: AlignmentType.CENTER,
      before: 1400,
      after: 200,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "UniHealth Comprehensive Dashboard Manual",
          font: FONT,
          size: 48,
          bold: true,
          color: COLOR.title,
        }),
      ],
    }),
    p("All roles — sign-in, navigation, and every dashboard tab with annotated screenshots", {
      size: 24,
      color: COLOR.muted,
      align: AlignmentType.CENTER,
      after: 400,
    }),
    p("Doctor · Nurse · Patient · Administrator · Laboratory · Pharmacy", {
      size: 22,
      bold: true,
      align: AlignmentType.CENTER,
    }),
    p("Kenya National Hospital (KNH) — UniHealth Phase 1 Pilot", {
      size: 22,
      align: AlignmentType.CENTER,
      after: 120,
    }),
    p("Version 1.0 · June 2026 · DOC-UI-COMP-001", {
      size: 20,
      color: COLOR.muted,
      align: AlignmentType.CENTER,
    }),
    pageBreak(),
  ];
}

function docFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "UniHealth Comprehensive Dashboard Manual · Pilot 2026",
            font: FONT,
            size: 18,
            color: COLOR.muted,
          }),
        ],
      }),
    ],
  });
}

async function build() {
  const children = [...coverPage()];

  children.push(h1("Table of contents"));
  children.push(p("Use Word’s Navigation pane (View → Navigation) or search for role headings."));
  for (const role of MANUAL_ROLES) {
    children.push(bullet(`${role.signInName} — sign-in, layout, all tabs, troubleshooting`));
  }
  children.push(pageBreak());

  children.push(h1("1. System overview"));
  children.push(
    p(
      "UniHealth is a role-based healthcare platform. After authentication, each user lands on a dedicated dashboard tuned to their job. This manual documents every sign-in step and sidebar tab for all six production roles, with screenshots captured at 1440×900 from the live pilot UI.",
    ),
  );
  children.push(
    mdTable([
      ["Role", "Dashboard URL", "Primary users"],
      ...MANUAL_ROLES.map((r) => [r.signInName, r.url, r.audience]),
    ]),
  );
  children.push(
    p("Staging: run ./scripts/run_staging.sh (gateway :8100) and npm run dev in frontend/app before using the web UI.", {
      italics: true,
      color: COLOR.muted,
    }),
  );
  children.push(pageBreak());

  children.push(h1("2. Universal sign-in flow"));
  children.push(p("All roles share a four-step pattern at /sign-in:"));
  children.push(bullet("Select role — scroll the carousel and choose your job tile."));
  children.push(bullet("Enter credentials — staff: professional ID, email, password; patient: ID, PIN, phone."));
  children.push(bullet("Verify MFA — email OTP (staff), SMS OTP (patient), or Practice 360 in demo."));
  children.push(bullet("Launch dashboard — confirm success, then open your workspace."));
  children.push(pageBreak());

  for (const role of MANUAL_ROLES) {
    children.push(h1(role.title.replace(" Manual", "")));
    children.push(
      p(ROLE_OVERVIEW[role.slug] ?? role.subtitle, { after: 200 }),
    );
    children.push(
      p(`Audience: ${role.audience}    |    URL: ${role.url}`, {
        size: 20,
        color: COLOR.muted,
        after: 280,
      }),
    );

    children.push(h2(`Sign-in — ${role.signInName}`));
    children.push(p(role.signInIntro));

    const signInFiles = [
      ["01-signin-role-selected", "Select your role", role.signInSteps.select],
      ["02-signin-credentials", "Enter credentials", role.signInSteps.credentials],
      ["03-signin-mfa", "Multi-factor authentication", role.signInSteps.mfa],
      ["04-signin-launch", "Launch dashboard", role.signInSteps.launch],
    ];
    for (const [file, stepTitle, caption] of signInFiles) {
      children.push(h3(`Step — ${stepTitle}`));
      children.push(...(await figureBlock(role.slug, file, stepTitle, caption, role.signInName)));
    }

    children.push(h2("Dashboard layout"));
    children.push(p(role.layoutIntro));
    children.push(
      mdTable([["Zone", "Purpose"], ...role.layoutZones]),
    );
    if (role.layoutCallout) {
      const plain = role.layoutCallout.replace(/<[^>]+>/g, "");
      children.push(p(plain, { bold: false, after: 200 }));
    }

    for (const section of role.tabSections) {
      children.push(h2(section.title));
      if (section.intro) children.push(p(section.intro));
      for (const tab of section.tabs) {
        children.push(h3(tab.title));
        children.push(
          ...(await figureBlock(role.slug, tab.file, tab.title, tab.caption, role.signInName)),
        );
      }
    }

    children.push(h2(`Tips & troubleshooting — ${role.signInName}`));
    if (role.dailyWorkflow?.length) {
      children.push(h3("Recommended daily workflow"));
      for (const step of role.dailyWorkflow) children.push(bullet(step));
    }
    children.push(h3("Common issues"));
    children.push(
      mdTable([["Issue", "What to do"], ...role.troubleshooting]),
    );
    if (role.disclaimer) {
      children.push(p(role.disclaimer.replace(/<[^>]+>/g, ""), { italics: true, color: COLOR.muted }));
    }
    children.push(pageBreak());
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        footers: { default: docFooter() },
        children,
      },
    ],
  });

  await mkdir(MANUALS, { recursive: true });
  const buf = await Packer.toBuffer(doc);
  await writeFile(OUT_FILE, buf);
  console.log("DOCX:", OUT_FILE);
  console.log(`Figures: ${figureNo}`);
  console.log(`Size: ${(buf.length / (1024 * 1024)).toFixed(2)} MB`);
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
