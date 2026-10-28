import { portfolio } from '../content/portfolio';

export function ApproachSection() {
  const { approach } = portfolio;

  return (
    <section id="approach" className="section section--alt" aria-labelledby="approach-heading">
      <div className="shell">
        <header className="section__header">
          <h2 id="approach-heading">{approach.heading}</h2>
          <p className="section__lede">{approach.lede}</p>
        </header>

        <div className="approach__body">
          {approach.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>

        <ul className="card-grid card-grid--three">
          {approach.points.map((point) => (
            <li key={point.title}>
              <article className="card approach-card">
                <h3 className="card__title">{point.title}</h3>
                <p className="card__summary">{point.body}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
