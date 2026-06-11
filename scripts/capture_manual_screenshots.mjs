#!/usr/bin/env node
/**
 * Capture screenshots for the combined UniHealth web user manual.
 * Requires: dev server at http://127.0.0.1:5173
 */
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../docs/user-manuals/images");
const BASE = "http://127.0.0.1:5173";

async function goto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(900);
}

async function shot(page, name, opts = {}) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false, ...opts });
  console.log("saved", file);
}

async function staffToMfa(page) {
  await goto(page, `${BASE}/sign-in`);
  await page.locator("button.rc").filter({ hasText: "Doctor" }).first().click();
  await page.waitForTimeout(250);
  await page.locator("button").filter({ hasText: "Continue" }).first().click();
  await page.waitForTimeout(500);
  await shot(page, "03-signin-step2-credentials");
  await page.locator("button.altbn").filter({ hasText: "Practice 360" }).click();
  await page.waitForTimeout(1400);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  await goto(page, `${BASE}/`);
  await shot(page, "01-landing");

  await goto(page, `${BASE}/sign-in`);
  await shot(page, "02-signin-step1-role-select");

  await staffToMfa(page);
  await shot(page, "04-signin-step3-mfa");
  for (let i = 1; i <= 6; i++) {
    await page.locator(`#mfa-o${i}`).fill(String(i));
  }
  await page.locator("button.btn").filter({ hasText: "Verify Code" }).click();
  await page.waitForTimeout(2000);
  await shot(page, "05-signin-step4-launch");

  await goto(page, `${BASE}/sign-in`);
  await page.locator("button.rc").filter({ hasText: "Patient" }).first().click();
  await page.waitForTimeout(250);
  await page.locator("button").filter({ hasText: "Continue" }).first().click();
  await page.waitForTimeout(500);
  await shot(page, "06-signin-patient-credentials");

  await goto(page, `${BASE}/register`);
  await shot(page, "07-register");

  await goto(page, `${BASE}/portal`);
  await shot(page, "08-portal", { fullPage: true });

  const dashboards = [
    ["doctor", "09-dashboard-doctor"],
    ["nurse", "10-dashboard-nurse"],
    ["patient", "11-dashboard-patient"],
    ["admin", "12-dashboard-admin"],
    ["lab", "13-dashboard-lab"],
    ["pharmacy", "14-dashboard-pharmacy"],
  ];
  for (const [role, name] of dashboards) {
    await goto(page, `${BASE}/dashboard/${role}`);
    await page.waitForTimeout(800);
    await shot(page, name);
  }

  await goto(page, `${BASE}/modules/emr`);
  await shot(page, "15-module-emr");

  await browser.close();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
