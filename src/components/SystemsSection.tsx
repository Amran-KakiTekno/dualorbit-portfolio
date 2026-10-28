import { portfolio } from '../content/portfolio';

function statusSlug(status: string): string {
  return status.toLowerCase().replace(/[^a-z]+/g, '-').replace(/(^-|-$)/g, '');
}

export function SystemsSection() {
  const { systems } = portfolio;

  return (
    <section id="systems" className="section" aria-labelledby="systems-heading">
      <div className="shell">
        <header className="section__header">
          <h2 id="systems-heading">{systems.heading}</h2>
          <p className="section__lede">{systems.lede}</p>
          <dl className="status-key">
            {Object.entries(systems.statusNotes).map(([status, note]) => (
              <div key={status} className="status-key__row">
                <dt>
                  <span className={`badge badge--${statusSlug(status)}`}>{status}</span>
                </dt>
                <dd>{note}</dd>
              </div>
            ))}
          </dl>
        </header>

        <ul className="system-list">
          {systems.entries.map((entry) => (
            <li key={entry.id} className="system-entry" data-system-id={entry.id}>
              <div className="system-entry__head">
                <h3 className="system-entry__title">{entry.title}</h3>
                <p className={`badge badge--${statusSlug(entry.status)}`}>{entry.status}</p>
              </div>
              <p className="system-entry__description">{entry.description}</p>
              {entry.liveUrl ? (
                <p className="card__links">
                  <a href={entry.liveUrl} target="_blank" rel="noopener noreferrer">
                    {entry.liveLabel ?? 'Open'}
                  </a>
                </p>
              ) : null}
              {entry.sourceUrl ? (
                <p className="card__links">
                  <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {entry.sourceLabel ?? 'Source'}
                  </a>
                </p>
              ) : null}

              {entry.modules ? (
                <div className="system-entry__modules">
                  <h4 className="card__subhead">Modules</h4>
                  <ul className="module-list">
                    {entry.modules.map((module) => (
                      <li key={module.id} className="module-item" data-module-id={module.id}>
                        <span className="module-item__name">{module.title}</span>
                        <span className={`badge badge--${statusSlug(module.status)}`}>{module.status}</span>
                        <span className="module-item__links">
                          {module.liveUrl ? (
                            <a href={module.liveUrl} target="_blank" rel="noopener noreferrer">
                              {module.liveLabel ?? 'Open demo'}
                            </a>
                          ) : null}
                          {module.sourceUrl ? (
                            <a href={module.sourceUrl} target="_blank" rel="noopener noreferrer">
                              {module.sourceLabel ?? 'Source'}
                            </a>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
