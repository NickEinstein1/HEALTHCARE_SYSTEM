#!/usr/bin/env node
/**
 * Build branded PDF cover + full user manual PDF from HTML.
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(__dirname, "../docs/user-manuals");
const MANUAL_HTML = path.join(DOCS, "UniHealth-Web-User-Manual.html");
const COVER_HTML = path.join(DOCS, "UniHealth-Web-User-Manual-Cover.html");
const COVER_PDF = path.join(DOCS, "UniHealth-Web-User-Manual-Cover.pdf");
const FULL_PDF = path.join(DOCS, "UniHealth-Web-User-Manual.pdf");

async function pdfFromHtml(browser, htmlPath, pdfPath, opts = {}) {
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(600);
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: opts.margin ?? { top: "12mm", right: "12mm", bottom: "14mm", left: "12mm" },
    ...opts,
  });
  await page.close();
  console.log("PDF:", pdfPath);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  await pdfFromHtml(browser, COVER_HTML, COVER_PDF, {
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    pageRanges: "1",
  });
  await pdfFromHtml(browser, MANUAL_HTML, FULL_PDF, {
    margin: { top: "14mm", right: "14mm", bottom: "16mm", left: "14mm" },
  });
  await browser.close();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
