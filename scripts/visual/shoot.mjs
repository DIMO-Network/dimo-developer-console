// Screenshots every harness route. Usage:
//   node scripts/visual/shoot.mjs --label=after [--themes=dark,light] [--viewports=desktop,mobile] [--only=<regex>] [--debug]
// --debug prints browser console errors and failed requests for each shot.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loadKeys } from './keys.mjs';
import { ROUTES } from './routes.mjs';
import * as fx from './fixtures.mjs';
import { identityHandler } from './identity.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')),
);
const label = args.label ?? 'after';
const themes = (args.themes ?? 'dark,light').split(',');
const viewports = (args.viewports ?? 'desktop,mobile').split(',');
const only = args.only ? new RegExp(args.only) : null;
const BASE = args.base ?? 'http://localhost:3000';
const debug = 'debug' in args;
// Next's dev-mode indicator ("N" / "1 Issue" badge) is not part of the UI.
const HIDE_DEV_OVERLAY = 'nextjs-portal { display: none !important; }';
const MAX_HEIGHT = 8000;
const SIZES = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out', label);
await fs.mkdir(outDir, { recursive: true });
const keys = await loadKeys();
const browser = await chromium.launch();
const failures = [];

async function prepare(context, route, theme) {
  await context.route('https://identity-api.dev.dimo.zone/query', (r) =>
    identityHandler(r, { noLicenses: route.noLicenses }),
  );
  await context.route(/\/api\/templates\?/, (r) =>
    r.fulfill({ json: fx.TEMPLATE_SEARCH }),
  );
  await context.route(/\/api\/templates\/[^/?]+/, (r) =>
    r.fulfill({ json: fx.TEMPLATE_DETAIL }),
  );
  await context.route(/\/api\/vehicle-signals/, (r) =>
    r.fulfill({ json: fx.VEHICLE_SIGNALS }),
  );
  await context.addInitScript((t) => {
    if (t === 'light') localStorage.setItem('dimo-theme', 'light');
  }, theme);
  if (route.guest) return;
  await context.addCookies([
    {
      name: 'session-token',
      value: keys.sessionJwt,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await context.addInitScript(
    ({ session, embedded, devJwtKey, devJwts }) => {
      sessionStorage.setItem('globalAccount', JSON.stringify(session));
      localStorage.setItem('GlobalAccountEmbeddedKey', JSON.stringify(embedded));
      localStorage.setItem(devJwtKey, JSON.stringify(devJwts));
    },
    {
      session: {
        email: fx.USER_EMAIL,
        role: 'OWNER',
        subOrganizationId: fx.SUB_ORG.subOrganizationId,
        token: keys.credentialBundle,
        expiry: Math.floor(Date.now() / 1000) + 86400,
      },
      embedded: keys.embeddedPrivateKey,
      devJwtKey: `devJwt_${fx.LICENSE.clientId}_list_v1`,
      devJwts: [{ token: keys.devJwt, createdAt: Date.parse('2026-09-20T14:30:00Z') }],
    },
  );
}

// The console scrolls inside a fixed-height layout, so fullPage alone captures one
// viewport. Grow the viewport by the inner scroll overflow and reset scroll.
async function growToContent(page, size) {
  const overflow = await page.evaluate(() => {
    let max = 0;
    for (const el of document.querySelectorAll('*')) {
      if (!/(auto|scroll)/.test(getComputedStyle(el).overflowY)) continue;
      max = Math.max(max, el.scrollHeight - el.clientHeight);
      el.scrollTop = 0;
    }
    return max;
  });
  if (overflow > 0) {
    await page.setViewportSize({
      width: size.width,
      height: Math.min(size.height + overflow, MAX_HEIGHT),
    });
    await page.waitForTimeout(300);
  }
}

async function shootOnce(route, theme, vp, file) {
  const context = await browser.newContext({ viewport: SIZES[vp], bypassCSP: true });
  await prepare(context, route, theme);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && /hydrat|did not match/i.test(m.text()))
      consoleErrors.push(m.text());
    if (debug && m.type() === 'error' && !/^Failed to load resource/.test(m.text()))
      console.log(`    [console] ${m.text().slice(0, 300)}`);
  });
  if (debug) {
    const noise = /\/__nextjs|\/_next\/webpack-hmr/;
    page.on('pageerror', (e) =>
      console.log(
        `    [pageerror] ${e.message.slice(0, 3000)}\n${(e.stack ?? '').slice(0, 600)}`,
      ),
    );
    page.on('requestfailed', (r) => {
      if (!noise.test(r.url()))
        console.log(`    [failed] ${r.method()} ${r.url()} ${r.failure()?.errorText}`);
    });
    page.on('response', (r) => {
      if (r.status() >= 400 && !noise.test(r.url()))
        console.log(`    [${r.status()}] ${r.request().method()} ${r.url()}`);
    });
  }
  try {
    await page.goto(BASE + route.path, { waitUntil: 'networkidle', timeout: 90_000 });
    const expected = new URL(BASE + route.path).pathname;
    if (new URL(page.url()).pathname !== expected)
      throw new Error(`redirected to ${page.url()}`);
    if (route.ready)
      await page.getByText(route.ready).first().waitFor({ timeout: 30_000 });
    for (const [selector, value] of Object.entries(route.fill ?? {}))
      await page.locator(selector).first().fill(value);
    for (const selector of [route.click ?? []].flat()) {
      await page.locator(selector).first().click();
      await page.waitForTimeout(600);
    }
    if (route.after)
      await page.getByText(route.after).first().waitFor({ timeout: 30_000 });
    await page.waitForTimeout(400);
    await page.addStyleTag({ content: HIDE_DEV_OVERLAY });
    await growToContent(page, SIZES[vp]);
    if (consoleErrors.length)
      throw new Error(`hydration error: ${consoleErrors[0].slice(0, 160)}`);
    await page.screenshot({ path: file, fullPage: true });
    await fs.rm(file.replace(/\.png$/, '.FAILED.png'), { force: true });
  } catch (e) {
    await page
      .screenshot({ path: file.replace(/\.png$/, '.FAILED.png'), fullPage: true })
      .catch(() => {});
    throw e;
  } finally {
    await context.close();
  }
}

for (const route of ROUTES) {
  if (only && !only.test(route.name)) continue;
  for (const theme of themes) {
    for (const vp of viewports) {
      if (route.viewports && !route.viewports.includes(vp)) continue;
      const file = path.join(outDir, `${route.name}--${theme}--${vp}.png`);
      let error;
      // One retry: another agent's save can hot-reload the shared dev server mid-run.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await shootOnce(route, theme, vp, file);
          error = null;
          break;
        } catch (e) {
          error = e;
        }
      }
      if (error)
        failures.push(`${route.name} ${theme} ${vp}: ${error.message.split('\n')[0]}`);
      console.log(`${error ? '✗' : '✓'} ${route.name} ${theme} ${vp}`);
    }
  }
}
await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} failed:\n${failures.join('\n')}`);
  process.exit(1);
}
