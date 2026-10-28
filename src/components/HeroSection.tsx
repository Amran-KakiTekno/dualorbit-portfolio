import { portfolio } from '../content/portfolio';
import { OrbitMotif } from './OrbitMotif';

export function HeroSection() {
  const { hero } = portfolio;

  return (
    <section id="top" className="hero" aria-labelledby="hero-heading">
      <div className="shell hero__inner">
        <div className="hero__copy">
          <p className="eyebrow">{hero.eyebrow}</p>
          <h1 id="hero-heading" className="hero__title">
            {hero.title}
          </h1>
          <p className="hero__tagline">{portfolio.brand.tagline}</p>
          <p className="hero__lede">{hero.lede}</p>
          <div className="hero__actions">
            <a className="button button--primary" href={hero.primary.href}>
              {hero.primary.label}
            </a>
            <a className="button button--secondary" href={hero.secondary.href}>
              {hero.secondary.label}
            </a>
          </div>
          <ul className="hero__notes">
            {hero.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
        <div className="hero__figure" aria-hidden="true">
          <OrbitMotif className="hero__mark" />
        </div>
      </div>
    </section>
  );
}
