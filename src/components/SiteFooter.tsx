import { portfolio } from '../content/portfolio';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <p className="site-footer__note">{portfolio.brand.footerNote}</p>
        <p className="site-footer__note site-footer__note--muted">{portfolio.brand.tagline}</p>
      </div>
    </footer>
  );
}
