#!/usr/bin/env node
/**
 * Export Innovation Metrics Canvas to PDF (A4 landscape).
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(__dirname, "../manuals/innovation-metrics-canvas.html");
const PDF = path.join(__dirname, "../manuals/Innovation-Metrics-Canvas.pdf");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${HTML}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(400);
  await page.pdf({
    path: PDF,
    format: "A4",
    landscape: true,
    printBackground: true,
    margin: { top: "8mm", right: "8mm", bottom: "8mm", left: "8mm" },
    preferCSSPageSize: true,
  });
  await browser.close();
  console.log("PDF:", PDF);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
