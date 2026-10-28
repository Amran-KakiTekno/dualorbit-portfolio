import rawPortfolio from './portfolio.json';

/**
 * Typed schema for the public content manifest.
 *
 * `portfolio.json` is the single source of truth for brand copy, demo links,
 * system-development entries and statuses, and contact copy. This module gives
 * that manifest a compile-time shape so components cannot drift from it.
 */

export type Discipline = 'Data Engineering' | 'Data Analysis';

export type DemoStatus = 'Synthetic interactive demo';

export type SystemStatus =
  | 'Live deployment'
  | 'Demo shells / selected live deployments'
  | 'In development'
  | 'Internal';

export type ModuleStatus = 'Live demo shell' | 'Source-available demo shell';

export interface NavigationItem {
  label: string;
  href: string;
}

export interface BrandContent {
  name: string;
  tagline: string;
  description: string;
  footerNote: string;
}

export interface HeroContent {
  eyebrow: string;
  title: string;
  lede: string;
  primary: NavigationItem;
  secondary: NavigationItem;
  notes: string[];
}

export interface CapabilityItem {
  id: string;
  title: string;
  summary: string;
  problems: string[];
  methods: string[];
}

export interface CapabilitiesContent {
  heading: string;
  lede: string;
  items: CapabilityItem[];
}

export interface DemoItem {
  id: string;
  title: string;
  discipline: Discipline;
  status: DemoStatus;
  technique: string;
  liveUrl: string;
  sourceUrl: string;
  liveLabel: string;
  sourceLabel: string;
}

export interface DemoGroup {
  id: string;
  title: string;
  lede: string;
  demos: DemoItem[];
}

export interface DataProofContent {
  heading: string;
  lede: string;
  groups: DemoGroup[];
}

export interface SystemModule {
  id: string;
  title: string;
  status: ModuleStatus;
  liveUrl?: string;
  sourceUrl?: string;
  liveLabel?: string;
  sourceLabel?: string;
}

export interface SystemEntry {
  id: string;
  title: string;
  status: SystemStatus;
  description: string;
  liveUrl?: string;
  sourceUrl?: string;
  liveLabel?: string;
  sourceLabel?: string;
  modules?: SystemModule[];
}

export interface SystemsContent {
  heading: string;
  lede: string;
  statusNotes: Record<string, string>;
  entries: SystemEntry[];
}

export interface ApproachPoint {
  title: string;
  body: string;
}

export interface ApproachContent {
  heading: string;
  lede: string;
  paragraphs: string[];
  points: ApproachPoint[];
}

export interface ContactFieldCopy {
  label: string;
  hint: string;
  autocomplete: string;
}

export interface ContactContent {
  heading: string;
  lede: string;
  privacyNote: string;
  fields: {
    name: ContactFieldCopy;
    email: ContactFieldCopy;
    message: ContactFieldCopy;
  };
  submitLabel: string;
  pendingLabel: string;
  successMessage: string;
  errorMessage: string;
  validationMessage: string;
  honeypotLabel: string;
  fallbackNote: string;
}

export interface PortfolioContent {
  brand: BrandContent;
  navigation: NavigationItem[];
  hero: HeroContent;
  capabilities: CapabilitiesContent;
  dataProof: DataProofContent;
  systems: SystemsContent;
  approach: ApproachContent;
  contact: ContactContent;
}

export const portfolio = rawPortfolio as unknown as PortfolioContent;

/** All eight data demos, in manifest order. */
export const allDemos: DemoItem[] = portfolio.dataProof.groups.flatMap((group) => group.demos);

/** The twelve scoped system-development entries, in manifest order. */
export const allSystemEntries: SystemEntry[] = portfolio.systems.entries;
