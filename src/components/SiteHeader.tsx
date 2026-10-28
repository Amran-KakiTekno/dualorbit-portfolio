import { portfolio } from '../content/portfolio';
import { OrbitMotif } from './OrbitMotif';

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <div className="shell site-header__inner">
        <a className="brand" href="#top">
          <OrbitMotif className="brand__mark" />
          <span className="brand__name">{portfolio.brand.name}</span>
        </a>
        <nav className="site-nav" aria-label="Primary">
          <ul className="site-nav__list">
            {portfolio.navigation.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
