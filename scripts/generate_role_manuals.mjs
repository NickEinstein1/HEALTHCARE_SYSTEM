#!/usr/bin/env node
/**
 * Generate HTML + Markdown role manuals from scripts/manual_roles.mjs
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { MANUAL_ROLES } from "./manual_roles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANUALS = path.join(__dirname, "../manuals");

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function figureHtml(num, file, alt, title, caption) {
  return `        <figure class="figure">
          <div class="figure-inner">
            <img src="images/${file}.png" alt="${esc(alt)}" width="1440" height="900" loading="lazy" />
            <figcaption class="figure-caption">
              <span class="figure-num">Figure ${num}</span>
              <strong>${esc(title)}</strong>
              <p>${esc(caption)}</p>
            </figcaption>
          </div>
        </figure>`;
}

function figureMd(num, file, alt, title, caption) {
  return `<p align="center">
  <img src="images/${file}.png" alt="${alt}" width="720" />
</p>

**Figure ${num} — ${title}**  
${caption}

---
`;
}

function buildHtml(role) {
  let fig = 1;
  const signInFigs = [
    ["01-signin-role-selected", `Sign-in with ${role.signInName} selected`, `Role selection — ${role.signInName}`, role.signInSteps.select],
    ["02-signin-credentials", `${role.signInName} credentials form`, `${role.signInName} credentials`, role.signInSteps.credentials],
    ["03-signin-mfa", "MFA verification step", "MFA verification", role.signInSteps.mfa],
    ["04-signin-launch", "Launch dashboard success screen", "Ready to launch", role.signInSteps.launch],
  ];

  const toc = [
    `<li><a href="#intro">Introduction</a></li>`,
    `<li><a href="#signin">Sign-in (${esc(role.signInName)})</a></li>`,
    `<li><a href="#layout">Dashboard layout</a></li>`,
    ...role.tabSections.map((s) => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`),
    `<li><a href="#tips">Tips &amp; troubleshooting</a></li>`,
  ];

  let signInHtml = "";
  const signInSteps = ["Select role", "Enter credentials", "Verify MFA", "Launch dashboard"];
  signInSteps.forEach((step, i) => {
    signInHtml += `\n        <h3>Step ${i + 1} — ${esc(step)}</h3>\n        <p>${esc(role.signInSteps[`step${i + 1}Intro`] ?? signInFigs[i][3])}</p>\n`;
    signInHtml += figureHtml(fig++, signInFigs[i][0], signInFigs[i][1], signInFigs[i][2], signInFigs[i][3]);
    signInHtml += "\n";
  });

  let tabsHtml = "";
  for (const section of role.tabSections) {
    tabsHtml += `\n      <section class="manual-section" id="${section.id}">\n        <h2>${esc(section.number)}. ${esc(section.title)}</h2>\n`;
    if (section.intro) tabsHtml += `        <p>${esc(section.intro)}</p>\n`;
    for (const tab of section.tabs) {
      tabsHtml += `        <h3 id="${tab.slug}">${esc(tab.title)}</h3>\n`;
      tabsHtml += figureHtml(fig++, tab.file, tab.title, tab.title, tab.caption);
      tabsHtml += "\n";
    }
    tabsHtml += `      </section>\n`;
  }

  const tipsRows = role.troubleshooting
    .map(([issue, action]) => `            <tr><td>${esc(issue)}</td><td>${esc(action)}</td></tr>`)
    .join("\n");

  const layoutRows = role.layoutZones
    .map(([zone, purpose]) => `            <tr><td>${esc(zone)}</td><td>${esc(purpose)}</td></tr>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UniHealth — ${esc(role.title)}</title>
  <link rel="stylesheet" href="../shared/styles/manual.css" />
</head>
<body>
  <div class="manual-wrap">
    <nav class="manual-toc" aria-label="Table of contents">
      <h2>Contents</h2>
      <ol>
        ${toc.join("\n        ")}
      </ol>
    </nav>

    <main class="manual-main">
      <header class="manual-header" id="intro">
        <h1>${esc(role.title)}</h1>
        <p class="subtitle">${esc(role.subtitle)}</p>
        <div class="manual-meta">
          <span><strong>Audience:</strong> ${esc(role.audience)}</span>
          <span><strong>URL:</strong> ${esc(role.url)}</span>
          <span><strong>Version:</strong> Pilot 2026</span>
        </div>
      </header>

      <section class="manual-section" id="signin">
        <h2>1. Sign-in — ${esc(role.signInName)}</h2>
        <p>${esc(role.signInIntro)}</p>
${signInHtml}
      </section>

      <section class="manual-section" id="layout">
        <h2>2. Dashboard layout</h2>
        <p>${esc(role.layoutIntro)}</p>
        <table class="manual-table">
          <thead><tr><th>Zone</th><th>Purpose</th></tr></thead>
          <tbody>
${layoutRows}
          </tbody>
        </table>
        ${role.layoutCallout ? `<div class="callout">${role.layoutCallout}</div>` : ""}
      </section>
${tabsHtml}
      <section class="manual-section" id="tips">
        <h2>${role.tabSections.length + 3}. Tips &amp; troubleshooting</h2>
        ${role.dailyWorkflow ? `<h3>Recommended workflow</h3><ol class="steps">${role.dailyWorkflow.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
        <h3>Common issues</h3>
        <table class="manual-table">
          <thead><tr><th>Issue</th><th>Action</th></tr></thead>
          <tbody>
${tipsRows}
          </tbody>
        </table>
        ${role.disclaimer ? `<div class="callout">${role.disclaimer}</div>` : ""}
      </section>
    </main>
  </div>
</body>
</html>
`;
}

function buildMd(role) {
  let fig = 1;
  const signInFiles = [
    ["01-signin-role-selected", "Role selection", role.signInSteps.select],
    ["02-signin-credentials", "Credentials", role.signInSteps.credentials],
    ["03-signin-mfa", "MFA", role.signInSteps.mfa],
    ["04-signin-launch", "Launch", role.signInSteps.launch],
  ];

  let md = `# ${role.title}

**Audience:** ${role.audience}  
**URL:** \`${role.url}\`  
**HTML manual:** [${role.slug}-dashboard-manual.html](${role.slug}-dashboard-manual.html)

---

## 1. Sign-in — ${role.signInName}

${role.signInIntro}

`;

  for (const [file, title, caption] of signInFiles) {
    md += figureMd(fig++, file, title, title, caption);
  }

  md += `## 2. Dashboard layout

| Zone | Purpose |
| ---- | ------- |
${role.layoutZones.map(([z, p]) => `| **${z}** | ${p} |`).join("\n")}

---

`;

  for (const section of role.tabSections) {
    md += `## ${section.number}. ${section.title}\n\n`;
    if (section.intro) md += `${section.intro}\n\n`;
    for (const tab of section.tabs) {
      md += `### ${tab.title}\n\n`;
      md += figureMd(fig++, tab.file, tab.title, tab.title, tab.caption);
    }
  }

  md += `## ${role.tabSections.length + 3}. Tips & troubleshooting\n\n`;
  md += `| Issue | Action |\n| ----- | ------ |\n`;
  md += role.troubleshooting.map(([i, a]) => `| ${i} | ${a} |`).join("\n");
  md += `\n\n${role.disclaimer ?? ""}\n`;

  return md;
}

async function main() {
  for (const role of MANUAL_ROLES) {
    const dir = path.join(MANUALS, role.slug);
    await mkdir(path.join(dir, "images"), { recursive: true });
    const html = buildHtml(role);
    const md = buildMd(role);
    await writeFile(path.join(dir, `${role.slug}-dashboard-manual.html`), html);
    await writeFile(path.join(dir, `${role.slug}-dashboard-manual.md`), md);
    console.log("generated", role.slug);
  }

  const indexLinks = MANUAL_ROLES.map(
    (r) => `<li><a href="${r.slug}/${r.slug}-dashboard-manual.html">${esc(r.title)}</a> — ${esc(r.audience)}</li>`,
  ).join("\n        ");

  await writeFile(
    path.join(MANUALS, "index.html"),
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UniHealth Manuals</title>
  <link rel="stylesheet" href="shared/styles/manual.css" />
</head>
<body>
  <div class="manual-wrap" style="grid-template-columns:1fr;max-width:720px;">
    <main class="manual-main">
      <header class="manual-header">
        <h1>UniHealth User Manuals</h1>
        <p class="subtitle">Role-based guides with annotated screenshots for every dashboard tab.</p>
      </header>
      <section class="manual-section">
        <h2>Comprehensive manual (all roles)</h2>
        <p>Single document covering sign-in and every tab for Doctor, Nurse, Patient, Admin, Lab, and Pharmacy — ${MANUAL_ROLES.length * 4 + MANUAL_ROLES.reduce((n, r) => n + r.tabSections.reduce((m, s) => m + s.tabs.length, 0), 0)} annotated figures.</p>
        <p><a href="comprehensive-dashboard-manual.html"><strong>Open Comprehensive Dashboard Manual (HTML) →</strong></a></p>
        <p><a href="UniHealth-Comprehensive-Dashboard-Manual.docx"><strong>Download Comprehensive Manual (Word .docx) →</strong></a></p>
      </section>
      <section class="manual-section">
        <h2>Individual role manuals</h2>
        <ol>${indexLinks}</ol>
        <p style="margin-top:1.5rem;font-size:0.9375rem;color:var(--manual-muted);">
          Regenerate: <code>node scripts/generate_role_manuals.mjs</code> ·
          Screenshots: <code>node scripts/capture_all_manual_screenshots.mjs</code>
        </p>
      </section>
    </main>
  </div>
</body>
</html>`,
  );

  spawnSync(process.execPath, [path.join(__dirname, "generate_comprehensive_manual.mjs")], { stdio: "inherit" });
  spawnSync(process.execPath, [path.join(__dirname, "build_comprehensive_manual_docx.mjs")], { stdio: "inherit" });

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
