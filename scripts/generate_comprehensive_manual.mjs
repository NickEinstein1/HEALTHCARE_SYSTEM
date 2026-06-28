#!/usr/bin/env node
/**
 * Generate unified UniHealth comprehensive manual (all roles, continuous figure numbering).
 */
import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { MANUAL_ROLES } from "./manual_roles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANUALS = path.join(__dirname, "../manuals");

const ROLE_ACCENT = {
  doctor: "#0d6e4f",
  nurse: "#007a55",
  patient: "#2563eb",
  admin: "#6d28d9",
  lab: "#b45309",
  pharmacy: "#be123c",
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

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function figureHtml(num, imgSrc, alt, title, caption, roleLabel) {
  return `        <figure class="figure">
          <div class="figure-inner">
            <img src="${esc(imgSrc)}" alt="${esc(alt)}" width="1440" height="900" loading="lazy" decoding="async" />
            <figcaption class="figure-caption">
              <span class="figure-num">Figure ${num}${roleLabel ? ` · ${esc(roleLabel)}` : ""}</span>
              <strong>${esc(title)}</strong>
              <p>${esc(caption)}</p>
            </figcaption>
          </div>
        </figure>`;
}

function figureMd(num, imgSrc, alt, title, caption, roleLabel) {
  return `<p align="center">
  <img src="${imgSrc}" alt="${alt}" width="720" />
</p>

**Figure ${num}${roleLabel ? ` · ${roleLabel}` : ""} — ${title}**  
${caption}

---
`;
}

function imgPath(roleSlug, file) {
  return `${roleSlug}/images/${file}.png`;
}

function buildComprehensiveHtml(roles) {
  let fig = 1;

  const tocParts = [
    `<li><a href="#overview">System overview</a></li>`,
    `<li><a href="#signin-guide">Universal sign-in</a></li>`,
  ];

  for (const role of roles) {
    const rid = `role-${role.slug}`;
    const sub = [
      `<li><a href="#${rid}-signin">Sign-in</a></li>`,
      `<li><a href="#${rid}-layout">Layout</a></li>`,
      ...role.tabSections.map((s) => `<li><a href="#${rid}-${s.id}">${esc(s.title)}</a></li>`),
      `<li><a href="#${rid}-tips">Tips</a></li>`,
    ];
    tocParts.push(`<li><a href="#${rid}"><strong>${esc(role.signInName)}</strong></a><ul>${sub.join("")}</ul></li>`);
  }

  let body = "";

  // Overview
  body += `
      <section class="manual-section" id="overview">
        <h2>System overview</h2>
        <p>
          UniHealth is a role-based healthcare platform. After authentication, each user lands on a dedicated
          dashboard tuned to their job: clinicians manage encounters, nurses run the ward, patients access self-service
          records, and administrators govern the facility. Every screen in this manual was captured from the live pilot
          UI at 1440×900 resolution so layouts match what you will see in training and production.
        </p>
        <table class="manual-table">
          <thead><tr><th>Role</th><th>Dashboard URL</th><th>Primary use</th></tr></thead>
          <tbody>
${roles
  .map(
    (r) =>
      `            <tr><td><strong>${esc(r.signInName)}</strong></td><td><code>${esc(r.url)}</code></td><td>${esc(r.subtitle.split("—")[0].trim())}</td></tr>`,
  )
  .join("\n")}
          </tbody>
        </table>
        <div class="callout">
          <strong>Staging tip:</strong> Run <code>./scripts/run_staging.sh</code> (gateway on port 8100) and
          <code>npm run dev</code> in <code>frontend/app</code> before using the web UI. Hard-refresh if panels show offline.
        </div>
      </section>`;

  // Universal sign-in
  body += `
      <section class="manual-section" id="signin-guide">
        <h2>Universal sign-in flow</h2>
        <p>All roles share a four-step pattern at <code>/sign-in</code>. Staff enter a professional ID, email, and password; patients use national ID, UniHealth PIN, and mobile number. Every path ends with multi-factor authentication before the dashboard launch screen.</p>
        <ol class="steps">
          <li><strong>Select role</strong> — scroll the carousel and choose the tile that matches your job.</li>
          <li><strong>Enter credentials</strong> — role-specific fields plus password policy (staff) or PIN (patient).</li>
          <li><strong>Verify MFA</strong> — email OTP for staff, SMS OTP for patients; Practice 360 in demo environments.</li>
          <li><strong>Launch dashboard</strong> — confirm success message, then open your role workspace.</li>
        </ol>
        <p>The sections below repeat this flow with role-specific screenshots, then document <em>every sidebar tab</em> for that dashboard.</p>
      </section>`;

  for (const role of roles) {
    const rid = `role-${role.slug}`;
    const accent = ROLE_ACCENT[role.slug] ?? "#0d6e4f";
    const roleLabel = role.signInName;

    body += `
      <div class="role-part" id="${rid}">
        <header class="role-banner" style="--role-accent:${accent}">
          <span class="role-banner-label">${esc(role.signInName)}</span>
          <h2 class="role-banner-title">${esc(role.title.replace(" Manual", ""))}</h2>
          <p class="role-banner-desc">${esc(ROLE_OVERVIEW[role.slug] ?? role.subtitle)}</p>
          <div class="role-banner-meta">
            <span><strong>Audience:</strong> ${esc(role.audience)}</span>
            <span><strong>URL:</strong> ${esc(role.url)}</span>
          </div>
        </header>`;

    // Sign-in
    const signInFiles = [
      ["01-signin-role-selected", "Select your role", role.signInSteps.select],
      ["02-signin-credentials", "Enter credentials", role.signInSteps.credentials],
      ["03-signin-mfa", "Multi-factor authentication", role.signInSteps.mfa],
      ["04-signin-launch", "Launch dashboard", role.signInSteps.launch],
    ];
    body += `
        <section class="manual-section" id="${rid}-signin">
          <h2>Sign-in — ${esc(role.signInName)}</h2>
          <p>${esc(role.signInIntro)}</p>`;
    signInFiles.forEach(([file, stepTitle, caption], i) => {
      body += `\n          <h3>Step ${i + 1} — ${esc(stepTitle)}</h3>\n`;
      body += figureHtml(fig++, imgPath(role.slug, file), stepTitle, stepTitle, caption, roleLabel);
      body += "\n";
    });
    body += `        </section>`;

    // Layout
    const layoutRows = role.layoutZones
      .map(([z, p]) => `            <tr><td>${esc(z)}</td><td>${esc(p)}</td></tr>`)
      .join("\n");
    body += `
        <section class="manual-section" id="${rid}-layout">
          <h2>Dashboard layout</h2>
          <p>${esc(role.layoutIntro)}</p>
          <table class="manual-table">
            <thead><tr><th>Zone</th><th>Purpose</th></tr></thead>
            <tbody>
${layoutRows}
            </tbody>
          </table>
          ${role.layoutCallout ? `<div class="callout">${role.layoutCallout}</div>` : ""}
        </section>`;

    // Tabs
    for (const section of role.tabSections) {
      body += `
        <section class="manual-section" id="${rid}-${section.id}">
          <h2>${esc(section.title)}</h2>`;
      if (section.intro) body += `\n          <p>${esc(section.intro)}</p>\n`;
      for (const tab of section.tabs) {
        body += `          <h3>${esc(tab.title)}</h3>\n`;
        body += figureHtml(
          fig++,
          imgPath(role.slug, tab.file),
          tab.title,
          tab.title,
          tab.caption,
          roleLabel,
        );
        body += "\n";
      }
      body += `        </section>`;
    }

    // Tips
    const tipsRows = role.troubleshooting
      .map(([issue, action]) => `            <tr><td>${esc(issue)}</td><td>${esc(action)}</td></tr>`)
      .join("\n");
    body += `
        <section class="manual-section" id="${rid}-tips">
          <h2>Tips &amp; troubleshooting — ${esc(role.signInName)}</h2>
          ${
            role.dailyWorkflow
              ? `<h3>Recommended daily workflow</h3><ol class="steps">${role.dailyWorkflow.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`
              : ""
          }
          <h3>Common issues</h3>
          <table class="manual-table">
            <thead><tr><th>Issue</th><th>What to do</th></tr></thead>
            <tbody>
${tipsRows}
            </tbody>
          </table>
          ${role.disclaimer ? `<div class="callout">${role.disclaimer}</div>` : ""}
        </section>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UniHealth — Comprehensive Dashboard Manual</title>
  <link rel="stylesheet" href="shared/styles/manual.css" />
</head>
<body>
  <div class="manual-wrap manual-wrap--comprehensive">
    <nav class="manual-toc manual-toc--wide" aria-label="Table of contents">
      <h2>Contents</h2>
      <ol class="toc-root">
        ${tocParts.join("\n        ")}
      </ol>
      <p class="toc-footer">${fig - 1} figures · ${roles.length} roles · Pilot 2026</p>
    </nav>

    <main class="manual-main">
      <header class="manual-header" id="top">
        <h1>UniHealth Comprehensive Dashboard Manual</h1>
        <p class="subtitle">Complete sign-in and tab-by-tab guide for Doctor, Nurse, Patient, Administrator, Laboratory, and Pharmacy — with aligned screenshots and annotations.</p>
        <div class="manual-meta">
          <span><strong>Figures:</strong> ${fig - 1} annotated screenshots</span>
          <span><strong>Roles:</strong> 6 dashboards</span>
          <span><strong>Version:</strong> Pilot 2026</span>
        </div>
      </header>
${body}
    </main>
  </div>
</body>
</html>`;
}

function buildComprehensiveMd(roles) {
  let fig = 1;
  let md = `# UniHealth Comprehensive Dashboard Manual

Complete sign-in and tab-by-tab guide for **Doctor**, **Nurse**, **Patient**, **Administrator**, **Laboratory**, and **Pharmacy**.

**HTML version (recommended):** [comprehensive-dashboard-manual.html](comprehensive-dashboard-manual.html)

---

## System overview

UniHealth provides role-based dashboards after a unified four-step sign-in. Each section below includes sign-in screenshots and every sidebar tab for that role.

| Role | URL | Audience |
| ---- | --- | -------- |
${roles.map((r) => `| **${r.signInName}** | \`${r.url}\` | ${r.audience} |`).join("\n")}

---

## Universal sign-in

1. Select role from the carousel  
2. Enter credentials (staff ID + email + password, or patient ID + PIN + phone)  
3. Complete MFA (email/SMS OTP or Practice 360 in demo)  
4. Launch dashboard  

---

`;

  for (const role of roles) {
    md += `# ${role.title}\n\n`;
    md += `${ROLE_OVERVIEW[role.slug] ?? role.subtitle}\n\n`;
    md += `**Audience:** ${role.audience} · **URL:** \`${role.url}\`\n\n`;
    md += `## Sign-in\n\n${role.signInIntro}\n\n`;

    const signInFiles = [
      ["01-signin-role-selected", "Select role", role.signInSteps.select],
      ["02-signin-credentials", "Credentials", role.signInSteps.credentials],
      ["03-signin-mfa", "MFA", role.signInSteps.mfa],
      ["04-signin-launch", "Launch", role.signInSteps.launch],
    ];
    for (const [file, title, caption] of signInFiles) {
      md += figureMd(fig++, imgPath(role.slug, file), title, title, caption, role.signInName);
    }

    md += `## Layout\n\n${role.layoutIntro}\n\n`;
    md += `| Zone | Purpose |\n| ---- | ------- |\n`;
    md += role.layoutZones.map(([z, p]) => `| **${z}** | ${p} |`).join("\n");
    md += `\n\n---\n\n`;

    for (const section of role.tabSections) {
      md += `## ${section.title}\n\n`;
      for (const tab of section.tabs) {
        md += `### ${tab.title}\n\n`;
        md += figureMd(fig++, imgPath(role.slug, tab.file), tab.title, tab.title, tab.caption, role.signInName);
      }
    }

    md += `## Tips — ${role.signInName}\n\n`;
    md += `| Issue | Action |\n| ----- | ------ |\n`;
    md += role.troubleshooting.map(([i, a]) => `| ${i} | ${a} |`).join("\n");
    md += `\n\n${role.disclaimer ?? ""}\n\n---\n\n`;
  }

  return md;
}

async function main() {
  const html = buildComprehensiveHtml(MANUAL_ROLES);
  const md = buildComprehensiveMd(MANUAL_ROLES);
  await writeFile(path.join(MANUALS, "comprehensive-dashboard-manual.html"), html);
  await writeFile(path.join(MANUALS, "comprehensive-dashboard-manual.md"), md);
  console.log("generated comprehensive-dashboard-manual.html");
  console.log("generated comprehensive-dashboard-manual.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
