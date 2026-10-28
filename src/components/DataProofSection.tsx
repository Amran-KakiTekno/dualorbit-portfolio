import { portfolio } from '../content/portfolio';

export function DataProofSection() {
  const { dataProof } = portfolio;

  return (
    <section id="data-proof" className="section section--alt" aria-labelledby="data-proof-heading">
      <div className="shell">
        <header className="section__header">
          <h2 id="data-proof-heading">{dataProof.heading}</h2>
          <p className="section__lede">{dataProof.lede}</p>
        </header>

        {dataProof.groups.map((group) => (
          <div key={group.id} className="proof-group" data-group-id={group.id}>
            <h3 className="proof-group__title">{group.title}</h3>
            <p className="proof-group__lede">{group.lede}</p>
            <ul className="card-grid card-grid--demos">
              {group.demos.map((demo) => (
                <li key={demo.id}>
                  <article className="card demo-card" data-demo-id={demo.id}>
                    <p className="badge badge--synthetic">{demo.status}</p>
                    <h4 className="card__title">{demo.title}</h4>
                    <p className="demo-card__technique">{demo.technique}</p>
                    <p className="card__links">
                      <a href={demo.liveUrl} target="_blank" rel="noopener noreferrer">
                        {demo.liveLabel}
                      </a>
                      <a href={demo.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {demo.sourceLabel}
                      </a>
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
