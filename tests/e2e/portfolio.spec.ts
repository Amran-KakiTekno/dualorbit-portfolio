import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

/** Cloudflare assigned a suffixed canonical subdomain to this Pages project. */
const LIVE_URL_OVERRIDES: Record<string, string> = {
  'n8n-workflows': 'https://n8n-workflows-a8s.pages.dev',
};

function liveUrlFor(id: string): string {
  return LIVE_URL_OVERRIDES[id] ?? `https://${id}.pages.dev`;
}

const SYSTEMS = [
  'big-grin-dental',
  'tusyen',
  'synergy-solution',
  'ezibiz-hub',
  'diana-the-cleaning-fairy',
  'haze-workz',
  'business-capability-universe',
  'service_system',
  '06-accountant-portable',
  '11-misi-dskp',
  'PinjamJap',
  'sudoku-quest',
];

const MODULES = ['ezibiz-jmb', 'ezibiz-crms', 'ezibiz-hrms', 'ezibiz-akaun'];

const ORIGIN = 'http://127.0.0.1:4109';

async function setStartedAt(page: Page, offsetMs: number) {
  await page.evaluate((offset) => {
    const input = document.querySelector('#contact-startedAt') as HTMLInputElement | null;
    if (input) {
      input.value = String(Date.now() - offset);
    }
  }, offsetMs);
}

async function fillForm(page: Page, message = 'We would like to talk about a governed data pipeline.') {
  await page.fill('#contact-name', 'Ada Lovelace');
  await page.fill('#contact-email', 'ada@example.com');
  await page.fill('#contact-message', message);
  await setStartedAt(page, 10_000);
}

test.describe('Dual Orbit portfolio', () => {
  test('header navigation and hero present the published anchors', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toHaveText('Dual Orbit');
    await expect(page.locator('.hero__tagline')).toHaveText(
      'Data engineering, analysis, and systems that move work forward.',
    );

    const navLinks = page.locator('nav[aria-label="Primary"] a');
    await expect(navLinks).toHaveText(['Capabilities', 'Data proof', 'Systems', 'Contact']);
    await expect(navLinks.nth(0)).toHaveAttribute('href', '#capabilities');
    await expect(navLinks.nth(1)).toHaveAttribute('href', '#data-proof');
    await expect(navLinks.nth(2)).toHaveAttribute('href', '#systems');
    await expect(navLinks.nth(3)).toHaveAttribute('href', '#contact');

    await expect(page.locator('.hero__actions a.button--primary')).toHaveAttribute('href', '#capabilities');
    await expect(page.locator('.hero__actions a.button--secondary')).toHaveAttribute('href', '#contact');
  });

  test('publishes three capability cards', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('[data-capability-id]');
    await expect(cards).toHaveCount(3);
    await expect(cards).toHaveText([
      /Data Engineering/,
      /Data Analysis/,
      /System Development/,
    ]);
  });

  test('publishes all eight demo cards with live and source links', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('[data-demo-id]')).toHaveCount(8);

    for (const demo of DEMOS) {
      const card = page.locator(`[data-demo-id="${demo}"]`);
      await expect(card).toHaveCount(1);
      await expect(card).toContainText('Synthetic interactive demo');
      await expect(card.locator('a[href="' + liveUrlFor(demo) + '"]')).toHaveCount(1);
      await expect(card.locator('a[href="https://github.com/Amran-KakiTekno/' + demo + '"]')).toHaveCount(1);
      await expect(card.locator('a')).toHaveText(['Open demo', 'Source']);
    }
  });

  test('publishes all twelve system entries and the four EziBiz modules', async ({ page }) => {
    await page.goto('/');

    for (const system of SYSTEMS) {
      await expect(page.locator(`[data-system-id="${system}"]`)).toHaveCount(1);
    }
    await expect(page.locator('[data-system-id]')).toHaveCount(12);

    for (const module of MODULES) {
      await expect(page.locator(`[data-module-id="${module}"]`)).toHaveCount(1);
    }
    await expect(page.locator('[data-module-id]')).toHaveCount(4);

    await expect(page.locator('[data-system-id="haze-workz"]')).toContainText('In development');
    await expect(
      page.locator('[data-system-id="haze-workz"] a[href="https://haze-workz.vercel.app"]'),
    ).toHaveCount(1);
    await expect(page.locator('[data-system-id="ezibiz-hub"]')).toContainText(
      'Demo shells / selected live deployments',
    );
  });

  test('contact is the last section inside main', async ({ page }) => {
    await page.goto('/');

    const structure = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return null;
      const sections = Array.from(main.querySelectorAll(':scope > section'));
      return {
        count: sections.length,
        lastId: sections.length > 0 ? sections[sections.length - 1].id : null,
        lastElementId: main.lastElementChild ? (main.lastElementChild as HTMLElement).id : null,
      };
    });

    expect(structure).not.toBeNull();
    expect(structure?.count).toBeGreaterThan(0);
    expect(structure?.lastId).toBe('contact');
    expect(structure?.lastElementId).toBe('contact');
  });

  test('a successful submission shows the success state', async ({ page }) => {
    let captured: Record<string, unknown> | null = null;

    await page.route('**/api/contact', async (route) => {
      captured = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto('/');
    await fillForm(page);
    await page.click('button[type="submit"]');

    const status = page.locator('[data-testid="contact-status"]');
    await expect(status).toHaveAttribute('data-state', 'success');
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toContainText('Thank you');
    await expect(page.locator('button[type="submit"]')).toBeEnabled();

    expect(captured).not.toBeNull();
    const body = captured as unknown as Record<string, unknown>;
    expect(body.name).toBe('Ada Lovelace');
    expect(body.email).toBe('ada@example.com');
    expect(typeof body.startedAt).toBe('number');
    expect(body.website).toBe('');
  });

  test('a failed submission shows the error state and preserves the draft', async ({ page }) => {
    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, error: 'storage failure' }),
      });
    });

    await page.goto('/');
    const message = 'The pipeline question we would like to discuss.';
    await fillForm(page, message);
    await page.click('button[type="submit"]');

    const status = page.locator('[data-testid="contact-status"]');
    await expect(status).toHaveAttribute('data-state', 'error');
    await expect(status).toHaveAttribute('role', 'alert');
    await expect(status).toContainText('could not send');
    await expect(page.locator('#contact-message')).toHaveValue(message);
    await expect(page.locator('#contact-name')).toHaveValue('Ada Lovelace');
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('an invalid draft is reported before any request is made', async ({ page }) => {
    let requested = false;
    await page.route('**/api/contact', async (route) => {
      requested = true;
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    await page.goto('/');
    await page.fill('#contact-name', 'A');
    await page.fill('#contact-email', 'not-an-email');
    await page.fill('#contact-message', 'short');
    await setStartedAt(page, 10_000);
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="contact-status"]')).toHaveAttribute('data-state', 'error');
    await expect(page.locator('[data-testid="contact-error-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-error-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-error-message"]')).toBeVisible();
    expect(requested).toBe(false);
  });

  test('has zero serious or critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`);
    expect(blocking).toEqual([]);
  });

  test('does not overflow horizontally at 390px or 1280px', async ({ page }) => {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        innerWidth: window.innerWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
    }
  });

  test('makes no unexpected external runtime requests', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => {
      requests.push(request.url());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const unexpected = requests.filter((url) => {
      if (url.startsWith(ORIGIN)) return false;
      if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return false;
      return true;
    });

    expect(unexpected).toEqual([]);
  });
});
