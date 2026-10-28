#!/usr/bin/env node
/**
 * Live-site verification utility (owned by M12; not run in M01).
 *
 * Visits the nine published sites with Playwright's system Chrome, requires a
 * successful response and a rendered page marker on each, then renders the
 * portfolio itself and requires the eight exact demo links and a contact
 * section that is the last section inside <main>.
 *
 * Run: npm run verify:live
 */
import { chromium } from 'playwright';

const PORTFOLIO_URL = 'https://dualorbit.pages.dev';

const DEMOS = [
  'prodax-pipeline',
  'data-modelling',
  'rs-toolstring',
  'n8n-workflows',
  'data-quality-checker',
  'ws-ml',
  'service-type-analysis',
  'kssm-corpus',
];

/** Cloudflare assigned a suffixed canonical subdomain to this project. */
const LIVE_URL_OVERRIDES = {
  'n8n-workflows': 'https://n8n-workflows-a8s.pages.dev',
};

function liveUrlFor(demo) {
  return LIVE_URL_OVERRIDES[demo] ?? `https://${demo}.pages.dev`;
}

const SITES = [
  { name: 'dualorbit-portfolio', url: PORTFOLIO_URL, portfolio: true },
  ...DEMOS.map((demo) => ({ name: demo, url: liveUrlFor(demo), portfolio: false })),
];

const failures = [];

function fail(message) {
  failures.push(message);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  for (const site of SITES) {
    let response;
    try {
      response = await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    } catch (error) {
      fail(`${site.name}: navigation failed (${error.message})`);
      continue;
    }

    if (!response || !response.ok()) {
      fail(`${site.name}: response status ${response ? response.status() : 'none'}`);
      continue;
    }

    const marker = await page.evaluate(() => {
      const heading = document.querySelector('h1');
      const title = document.title;
      return {
        heading: heading ? (heading.textContent || '').trim() : '',
        title: (title || '').trim(),
        bodyLength: (document.body && document.body.innerText ? document.body.innerText : '').trim().length,
      };
    });

    if (!marker.heading) {
      fail(`${site.name}: no rendered h1 marker found`);
    }
    if (!marker.title) {
      fail(`${site.name}: no document title marker found`);
    }
    if (marker.bodyLength < 120) {
      fail(`${site.name}: rendered content too short (${marker.bodyLength} chars)`);
    }

    if (site.portfolio) {
      for (const demo of DEMOS) {
        const liveHref = liveUrlFor(demo);
        const sourceHref = `https://github.com/Amran-KakiTekno/${demo}`;
        const liveCount = await page.locator(`a[href="${liveHref}"]`).count();
        const sourceCount = await page.locator(`a[href="${sourceHref}"]`).count();
        if (liveCount !== 1) {
          fail(`portfolio: expected exactly one "${liveHref}" link, found ${liveCount}`);
        }
        if (sourceCount !== 1) {
          fail(`portfolio: expected exactly one "${sourceHref}" link, found ${sourceCount}`);
        }
      }

      const contactIsLast = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) return false;
        const sections = main.querySelectorAll(':scope > section');
        if (sections.length === 0) return false;
        const last = sections[sections.length - 1];
        return last.id === 'contact';
      });
      if (!contactIsLast) {
        fail('portfolio: contact section is not the last section inside <main>');
      }
    }
  }
} finally {
  await context.close();
  await browser.close();
}

if (failures.length > 0) {
  console.error(`LIVE_VERIFY_FAILED pages=${SITES.length} failures=${failures.length}`);
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log(`LIVE_VERIFY_OK pages=${SITES.length} demoLinks=${DEMOS.length}`);
