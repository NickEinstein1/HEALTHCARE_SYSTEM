#!/usr/bin/env node
/**
 * Optimize user-manual screenshots for web, print, and email distribution.
 * - Archives full-res PNGs to images/archive/full-res/
 * - Writes compressed PNGs (1280px max) to images/
 * - Writes email bundle (WebP + JPEG, 960px max) to images/email/
 */
import sharp from "sharp";
import { mkdir, readdir, rename, stat, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG = path.join(__dirname, "../docs/user-manuals/images");
const ARCHIVE = path.join(IMG, "archive/full-res");
const EMAIL = path.join(IMG, "email");

const MANUAL_MAX = 1280;
const EMAIL_MAX = 960;
const WEBP_QUALITY = 78;
const JPEG_QUALITY = 82;

async function bytes(p) {
  const s = await stat(p);
  return s.size;
}

function fmt(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

async function optimizeOne(file) {
  const src = path.join(IMG, file);
  const base = file.replace(/\.png$/i, "");
  const archivePath = path.join(ARCHIVE, file);

  const before = await bytes(src);
  if (before > 800 * 1024) {
    await rename(src, archivePath).catch(async () => {
      const { copyFile } = await import("fs/promises");
      await copyFile(src, archivePath);
    });
    var input = archivePath;
  } else {
    var input = src;
  }

  const pipeline = sharp(input).rotate();
  const meta = await pipeline.metadata();

  // Manual / HTML — PNG (temp file avoids sharp same-path error)
  const manualOut = path.join(IMG, file);
  const manualTmp = path.join(IMG, `.tmp-${file}`);
  await sharp(input)
    .resize({ width: MANUAL_MAX, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: meta.width > 600 })
    .toFile(manualTmp);
  const { rename: mv } = await import("fs/promises");
  await mv(manualTmp, manualOut);

  // Email — WebP (primary) + JPEG (fallback)
  const webpOut = path.join(EMAIL, `${base}.webp`);
  const jpgOut = path.join(EMAIL, `${base}.jpg`);
  await sharp(input)
    .resize({ width: EMAIL_MAX, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(webpOut);
  await sharp(input)
    .resize({ width: EMAIL_MAX, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(jpgOut);

  const afterManual = await bytes(manualOut);
  const afterWebp = await bytes(webpOut);
  const afterJpg = await bytes(jpgOut);

  return { file, before, afterManual, afterWebp, afterJpg };
}

async function main() {
  await mkdir(ARCHIVE, { recursive: true });
  await mkdir(EMAIL, { recursive: true });

  const files = (await readdir(IMG)).filter((f) => /^\d{2}-.*\.png$/i.test(f));
  if (!files.length) {
    console.error("No manual PNGs found in", IMG);
    process.exit(1);
  }

  const rows = [];
  for (const f of files.sort()) {
    rows.push(await optimizeOne(f));
  }

  let totalBefore = 0;
  let totalManual = 0;
  let totalWebp = 0;
  let totalJpg = 0;
  for (const r of rows) {
    totalBefore += r.before;
    totalManual += r.afterManual;
    totalWebp += r.afterWebp;
    totalJpg += r.afterJpg;
    console.log(
      `${r.file}: ${fmt(r.before)} → manual ${fmt(r.afterManual)}, email webp ${fmt(r.afterWebp)}, jpg ${fmt(r.afterJpg)}`,
    );
  }

  const manifest = {
    generated: new Date().toISOString(),
    manualMaxWidth: MANUAL_MAX,
    emailMaxWidth: EMAIL_MAX,
    totals: {
      before: totalBefore,
      manualPng: totalManual,
      emailWebp: totalWebp,
      emailJpeg: totalJpg,
    },
    files: rows.map((r) => ({
      name: r.file,
      beforeBytes: r.before,
      manualPngBytes: r.afterManual,
      emailWebpBytes: r.afterWebp,
      emailJpegBytes: r.afterJpg,
    })),
  };

  await writeFile(path.join(EMAIL, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(
    path.join(EMAIL, "README.txt"),
    [
      "UniHealth User Manual — Email image bundle",
      "============================================",
      "",
      `Generated: ${manifest.generated}`,
      "",
      "Use WebP images in modern email clients; attach JPEG where WebP is unsupported.",
      `Total WebP bundle: ${fmt(totalWebp)} (recommended attachment set)`,
      `Total JPEG bundle: ${fmt(totalJpg)}`,
      `Optimized manual PNGs: ${fmt(totalManual)} (in ../ for HTML manual)`,
      "",
      "Attach UniHealth-Web-User-Manual.html + images/email/*.webp",
      "Or zip this email/ folder (~" + fmt(totalWebp) + " WebP).",
      "",
    ].join("\n"),
  );

  console.log("\nTotals:");
  console.log(`  Before:      ${fmt(totalBefore)}`);
  console.log(`  Manual PNG:  ${fmt(totalManual)} (${((1 - totalManual / totalBefore) * 100).toFixed(0)}% smaller)`);
  console.log(`  Email WebP:  ${fmt(totalWebp)}`);
  console.log(`  Email JPEG:  ${fmt(totalJpg)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
