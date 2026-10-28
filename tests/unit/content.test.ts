import { describe, expect, it } from 'vitest';
import { allDemos, allSystemEntries, portfolio } from '../../src/content/portfolio';

/** Cloudflare assigned a suffixed canonical subdomain to this Pages project. */
const LIVE_URL_OVERRIDES: Record<string, string> = {
  'n8n-workflows': 'https://n8n-workflows-a8s.pages.dev',
};

function liveUrlFor(id: string): string {
  return LIVE_URL_OVERRIDES[id] ?? `https://${id}.pages.dev`;
}

describe('content manifest', () => {
  it('publishes exactly eight data demos', () => {
    expect(allDemos).toHaveLength(8);
    expect(allDemos.filter((demo) => demo.discipline === 'Data Engineering')).toHaveLength(5);
    expect(allDemos.filter((demo) => demo.discipline === 'Data Analysis')).toHaveLength(3);
  });

  it('labels every demo as a synthetic interactive demo', () => {
    for (const demo of allDemos) {
      expect(demo.status).toBe('Synthetic interactive demo');
      expect(demo.liveUrl).toBe(liveUrlFor(demo.id));
      expect(demo.sourceUrl).toBe(`https://github.com/Amran-KakiTekno/${demo.id}`);
    }
  });

  it('publishes exactly twelve system-development entries', () => {
    expect(allSystemEntries).toHaveLength(12);
  });

  it('keeps EziBiz as one family entry with four module records', () => {
    const ezibiz = allSystemEntries.find((entry) => entry.id === 'ezibiz-hub');
    expect(ezibiz).toBeDefined();
    expect(ezibiz?.liveUrl).toBeUndefined();
    expect(ezibiz?.modules).toHaveLength(4);
  });

  it('publishes the agreed privacy note', () => {
    expect(portfolio.contact.privacyNote).toBe(
      'We store your name, email, message, and submission timestamp so we can respond to your enquiry; we do not share them.',
    );
  });

  it('publishes no email address anywhere in the manifest', () => {
    const text = JSON.stringify(portfolio);
    expect(text).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    expect(text.toLowerCase()).not.toContain('mailto:');
  });
});
