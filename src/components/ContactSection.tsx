import { useRef, useState, type FormEvent } from 'react';
import { portfolio } from '../content/portfolio';
import { postContact, validateContactDraft, type ContactValidationErrors } from '../contact';

type ContactState = 'idle' | 'pending' | 'success' | 'error';

export function ContactSection() {
  const { contact } = portfolio;

  /**
   * Initialised once when the form is mounted. The value is written into a
   * hidden input, and the server compares it against its own clock to reject
   * submissions that were completed too quickly.
   */
  const startedAt = useRef<number>(Date.now());

  const [state, setState] = useState<ContactState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ContactValidationErrors>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const draft = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      message: String(formData.get('message') ?? ''),
      website: String(formData.get('website') ?? ''),
      startedAt: Number(formData.get('startedAt')),
    };

    const result = validateContactDraft(draft);

    if (!result.ok) {
      setFieldErrors(result.errors);
      setState('error');
      setStatusMessage(contact.validationMessage);
      return;
    }

    setFieldErrors({});
    setState('pending');
    setStatusMessage(contact.pendingLabel);

    try {
      await postContact(result.value);
      setState('success');
      setStatusMessage(contact.successMessage);
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      // The draft is deliberately preserved so nothing typed is lost.
      setState('error');
      setStatusMessage(contact.errorMessage);
    }
  }

  const pending = state === 'pending';

  return (
    <section id="contact" className="section section--contact" aria-labelledby="contact-heading">
      <div className="shell">
        <header className="section__header">
          <h2 id="contact-heading">{contact.heading}</h2>
          <p className="section__lede">{contact.lede}</p>
        </header>

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <div className="contact-form__grid">
            <div className="field">
              <label htmlFor="contact-name">{contact.fields.name.label}</label>
              <input
                id="contact-name"
                name="name"
                type="text"
                autoComplete={contact.fields.name.autocomplete}
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-describedby="contact-name-hint"
                aria-invalid={fieldErrors.name ? true : undefined}
                required
              />
              <p className="field__hint" id="contact-name-hint">
                {contact.fields.name.hint}
              </p>
              {fieldErrors.name ? (
                <p className="field__error" data-testid="contact-error-name">
                  {fieldErrors.name}
                </p>
              ) : null}
            </div>

            <div className="field">
              <label htmlFor="contact-email">{contact.fields.email.label}</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete={contact.fields.email.autocomplete}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-describedby="contact-email-hint"
                aria-invalid={fieldErrors.email ? true : undefined}
                required
              />
              <p className="field__hint" id="contact-email-hint">
                {contact.fields.email.hint}
              </p>
              {fieldErrors.email ? (
                <p className="field__error" data-testid="contact-error-email">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>
          </div>

          <div className="field">
            <label htmlFor="contact-message">{contact.fields.message.label}</label>
            <textarea
              id="contact-message"
              name="message"
              rows={6}
              autoComplete={contact.fields.message.autocomplete}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              aria-describedby="contact-message-hint"
              aria-invalid={fieldErrors.message ? true : undefined}
              required
            />
            <p className="field__hint" id="contact-message-hint">
              {contact.fields.message.hint}
            </p>
            {fieldErrors.message ? (
              <p className="field__error" data-testid="contact-error-message">
                {fieldErrors.message}
              </p>
            ) : null}
          </div>

          {/* Honeypot: visually hidden, never filled by a real person. */}
          <div className="visually-hidden">
            <label htmlFor="contact-website">{contact.honeypotLabel}</label>
            <input
              id="contact-website"
              name="website"
              type="text"
              autoComplete="off"
              tabIndex={-1}
              defaultValue=""
            />
          </div>

          <input type="hidden" name="startedAt" id="contact-startedAt" defaultValue={String(startedAt.current)} />

          <div className="contact-form__actions">
            <button className="button button--primary" type="submit" disabled={pending}>
              {pending ? contact.pendingLabel : contact.submitLabel}
            </button>
            <p className="contact-form__fallback">{contact.fallbackNote}</p>
          </div>

          <p
            className={`contact-form__status contact-form__status--${state}`}
            role={state === 'error' ? 'alert' : 'status'}
            data-testid="contact-status"
            data-state={state}
          >
            {statusMessage}
          </p>

          <p className="contact-form__privacy">{contact.privacyNote}</p>
        </form>
      </div>
    </section>
  );
}
