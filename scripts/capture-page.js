#!/usr/bin/env node
/**
 * Capture a Greedy Adventures page into knowledge/sources/<id>.json and
 * download its images into public/images/<id>/.
 *
 * Usage:
 *   node scripts/capture-page.js <url> [--id <slug>]
 *       Load the page in headless Chromium, extract its text sections and
 *       media URLs, write knowledge/sources/<id>.json (with `capturedAt` set
 *       to the time of the run), then download every image.
 *
 *   node scripts/capture-page.js --from-json knowledge/sources/<id>.json
 *       Skip the capture and only download the images listed in an existing
 *       source file. The source file is not modified.
 *
 * Options:
 *   --id <slug>     Source id; defaults to the last path segment of the URL.
 *   --no-images     Capture the page without downloading images.
 *   --force         Re-download images that already exist locally.
 *
 * Requires Playwright (`npm i -D playwright && npx playwright install chromium`).
 * Behind an HTTPS proxy on Node 22+, run with NODE_USE_ENV_PROXY=1 so the
 * image downloads go through it.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SOURCES_DIR = path.join(ROOT, 'knowledge', 'sources');
const PUBLIC_IMAGES_DIR = path.join(ROOT, 'public', 'images');

function parseArgs(argv) {
  const args = { url: null, id: null, fromJson: null, images: true, force: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--id') args.id = argv[++i];
    else if (arg === '--from-json') args.fromJson = argv[++i];
    else if (arg === '--no-images') args.images = false;
    else if (arg === '--force') args.force = true;
    else if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
    else args.url = arg;
  }
  if (!args.url && !args.fromJson) {
    throw new Error('Usage: node scripts/capture-page.js <url> [--id <slug>] | --from-json <file>');
  }
  return args;
}

function slugFromUrl(url) {
  const segments = new URL(url).pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'home';
}

// Runs inside the page. Walks block-level text in document order and groups it
// under the most recent heading; content before the first heading is "Intro".
function extractFromPage() {
  const clean = (s) => s.replace(/\s+/g, ' ').trim();
  const isVisible = (el) => {
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
  };

  const root = document.querySelector('main') || document.body;
  const BLOCKS = 'h1, h2, h3, h4, p, li, dt, dd, figcaption, blockquote';
  const sections = [];
  let current = { heading: 'Intro', anchor: null, lines: [] };

  for (const el of root.querySelectorAll(BLOCKS)) {
    // Text of nested blocks is already part of the outer block.
    if (el.parentElement.closest(BLOCKS) && !el.matches('li')) continue;
    if (!isVisible(el)) continue;
    const text = clean(el.innerText);
    if (!text) continue;

    if (/^H[1-4]$/.test(el.tagName)) {
      if (current.lines.length || current.heading !== 'Intro') sections.push(current);
      const anchorEl = el.closest('[id]');
      current = { heading: text, anchor: anchorEl ? anchorEl.id : null, lines: [] };
    } else {
      current.lines.push(el.matches('li, dt, dd') ? `- ${text}` : text);
    }
  }
  sections.push(current);

  // Unwrap optimiser URLs (/_next/image?url=...) to the original asset.
  const resolve = (raw) => {
    if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return null;
    const url = new URL(raw, location.href);
    const inner = url.pathname.endsWith('/_next/image') && url.searchParams.get('url');
    return inner ? new URL(inner, location.href).href : url.href;
  };
  const unique = (list) => [...new Set(list.filter(Boolean))];

  const images = unique([
    ...[...document.images].map((img) => resolve(img.currentSrc || img.src)),
    ...[...document.querySelectorAll('video[poster]')].map((v) => resolve(v.getAttribute('poster'))),
  ]).filter((u) => !/\.svg(\?|$)/i.test(u));
  const videos = unique([
    ...[...document.querySelectorAll('video[src]')].map((v) => resolve(v.getAttribute('src'))),
    ...[...document.querySelectorAll('video source[src]')].map((s) => resolve(s.getAttribute('src'))),
  ]);
  const pdfs = unique(
    [...document.querySelectorAll('a[href]')]
      .map((a) => resolve(a.getAttribute('href')))
      .filter((u) => u && /\.pdf(\?|#|$)/i.test(u)),
  );

  return {
    title: document.title,
    sections: sections.map(({ heading, anchor, lines }) => ({ heading, anchor, text: lines.join('\n') })),
    media: { images, videos, pdfs },
  };
}

async function capture(url, id) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle' });

    // Scroll to the bottom so lazy-loaded images and videos get their src.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');

    const extracted = await page.evaluate(extractFromPage);
    return {
      id,
      title: extracted.title,
      url: page.url(),
      capturedAt: new Date().toISOString(),
      sections: extracted.sections,
      media: extracted.media,
    };
  } finally {
    await browser.close();
  }
}

// File name is the URL's base name; on a clash, the parent folder is prefixed.
function localNameFor(url, taken) {
  const parts = decodeURIComponent(new URL(url).pathname).split('/').filter(Boolean);
  let name = parts[parts.length - 1];
  if (taken.has(name)) name = `${parts[parts.length - 2]}-${name}`;
  taken.add(name);
  return name;
}

async function downloadImages(source, { force }) {
  const dir = path.join(PUBLIC_IMAGES_DIR, source.id);
  fs.mkdirSync(dir, { recursive: true });
  const taken = new Set();
  let failed = 0;

  for (const url of source.media.images) {
    const file = path.join(dir, localNameFor(url, taken));
    const rel = path.relative(ROOT, file);
    if (!force && fs.existsSync(file)) {
      console.log(`skip  ${rel} (exists)`);
      continue;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') || '';
      if (!type.startsWith('image/')) throw new Error(`unexpected content-type "${type}"`);
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      console.log(`saved ${rel} <- ${url}`);
    } catch (err) {
      failed++;
      console.error(`FAIL  ${url}: ${err.cause?.message || err.message}`);
    }
  }
  return failed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let source;

  if (args.fromJson) {
    source = JSON.parse(fs.readFileSync(path.resolve(args.fromJson), 'utf8'));
  } else {
    source = await capture(args.url, args.id || slugFromUrl(args.url));
    fs.mkdirSync(SOURCES_DIR, { recursive: true });
    const out = path.join(SOURCES_DIR, `${source.id}.json`);
    fs.writeFileSync(out, `${JSON.stringify(source, null, 2)}\n`);
    console.log(`wrote ${path.relative(ROOT, out)} (capturedAt ${source.capturedAt})`);
  }

  if (args.images) {
    const failed = await downloadImages(source, args);
    if (failed) {
      console.error(`${failed} image(s) failed to download`);
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
