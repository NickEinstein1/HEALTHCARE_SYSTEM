#!/usr/bin/env node
/**
 * Capture sign-in + all dashboard tab screenshots for every role manual.
 * Requires: npm run dev (default http://localhost:5173)
 * Usage: node scripts/capture_all_manual_screenshots.mjs [role-slug...]
 */
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { MANUAL_ROLES, getTabsForCapture } from "./manual_roles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.MANUAL_CAPTURE_BASE?.trim() || "http://localhost:5173";

async function goto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(900);
}

async function shot(page, outDir, name, opts = {}) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false, ...opts });
  console.log("saved", file);
}

async function clickNav(page, label) {
  const btn = page.locator("button.ni").filter({ hasText: label }).first();
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.waitForTimeout(1000);
}

async function completeMfa(page) {
  for (let i = 1; i <= 6; i++) {
    await page.locator(`#mfa-o${i}`).fill(String(i));
  }
  await page.locator("button.btn").filter({ hasText: "Verify Code" }).click();
  await page.waitForTimeout(1800);
}

async function staffSignIn(page, role, outDir) {
  await goto(page, `${BASE}/sign-in`);
  await page.locator("button.rc").filter({ hasText: role.signInRoleButton }).first().click();
  await page.waitForTimeout(300);
  await shot(page, outDir, "01-signin-role-selected");
  await page.locator("button").filter({ hasText: "Continue" }).first().click();
  await page.waitForTimeout(600);
  await shot(page, outDir, "02-signin-credentials");
  await page.locator("button.altbn").filter({ hasText: "Practice 360" }).first().click();
  await page.waitForTimeout(1400);
  await shot(page, outDir, "03-signin-mfa");
  await completeMfa(page);
  await shot(page, outDir, "04-signin-launch");
}

async function patientSignIn(page, outDir) {
  await goto(page, `${BASE}/sign-in`);
  await page.locator("button.rc").filter({ hasText: "Patient" }).first().click();
  await page.waitForTimeout(300);
  await shot(page, outDir, "01-signin-role-selected");
  await page.locator("button").filter({ hasText: "Continue" }).first().click();
  await page.waitForTimeout(600);
  await shot(page, outDir, "02-signin-credentials");
  await page.locator("button.altbn").filter({ hasText: "Practice 360" }).first().click();
  await page.waitForTimeout(1400);
  await shot(page, outDir, "03-signin-mfa");
  await completeMfa(page);
  await shot(page, outDir, "04-signin-launch");
}

async function captureRole(page, role) {
  const outDir = path.join(__dirname, "../manuals", role.slug, "images");
  await mkdir(outDir, { recursive: true });

  if (role.signInType === "patient") {
    await patientSignIn(page, outDir);
  } else {
    await staffSignIn(page, role, outDir);
  }

  await goto(page, `${BASE}${role.url}`);
  await page.waitForTimeout(1200);

  const tabs = getTabsForCapture(role);
  for (const { nav, file } of tabs) {
    await clickNav(page, nav);
    await shot(page, outDir, file);
  }
}

async function main() {
  const filter = process.argv.slice(2);
  const roles = filter.length
    ? MANUAL_ROLES.filter((r) => filter.includes(r.slug))
    : MANUAL_ROLES;

  if (!roles.length) {
    console.error("No matching roles. Available:", MANUAL_ROLES.map((r) => r.slug).join(", "));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  for (const role of roles) {
    console.log(`\n=== ${role.slug} ===`);
    await captureRole(page, role);
  }

  await browser.close();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
