import { portfolio } from '../content/portfolio';

export function CapabilitiesSection() {
  const { capabilities } = portfolio;

  return (
    <section id="capabilities" className="section" aria-labelledby="capabilities-heading">
      <div className="shell">
        <header className="section__header">
          <h2 id="capabilities-heading">{capabilities.heading}</h2>
          <p className="section__lede">{capabilities.lede}</p>
        </header>
        <ul className="card-grid card-grid--three">
          {capabilities.items.map((item) => (
            <li key={item.id}>
              <article className="card capability-card" data-capability-id={item.id}>
                <h3 className="card__title">{item.title}</h3>
                <p className="card__summary">{item.summary}</p>
                <h4 className="card__subhead">Problem classes</h4>
                <ul className="card__list">
                  {item.problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
                <h4 className="card__subhead">Methods</h4>
                <ul className="card__list">
                  {item.methods.map((method) => (
                    <li key={method}>{method}</li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
