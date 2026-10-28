# Dual Orbit — capability portfolio

Static, single-page capability portfolio for **Dual Orbit**, published at
`https://dualorbit.pages.dev`.

It presents three practices — **Data Engineering**, **Data Analysis**, and
**System Development** — and backs each of them with proof: eight clean-room,
client-side interactive demos, plus a text register of twelve system-development
entries carrying their honest status. The page ends with a contact form.

The public brand is Dual Orbit. Kaki Tekno appears only as the engineering
label on repositories and in the page footer.

## Architecture

- Vite + React + TypeScript, built to a static `dist/` directory.
- The page itself makes no runtime data request, loads no external font or
  asset, and uses system fonts plus an inline SVG motif only.
- `src/content/portfolio.json` is the single source of truth for brand copy,
  demo links, system entries and statuses, and contact copy.
  `src/content/portfolio.ts` gives that manifest a typed shape.
- `src/contact.ts` owns the browser-side contact contract: draft validation and
  a single same-origin `POST /api/contact`. No D1 code and no credential exist
  in the browser bundle.
- `src/components/ContactSection.tsx` renders the form and the
  pending/success/failure states, and reads the form through `FormData` on
  submit so the hidden `startedAt` value is included.
- `functions/api/contact.ts` is the only server code. It accepts `POST
  /api/contact`, validates the submission, and writes one row to D1.
- `migrations/` holds the D1 schema; `wrangler.jsonc` binds `DB` to the
  `dualorbit-contacts` database and points at that directory.

## Local commands

```sh
npm install                 # install dependencies
npm run dev                 # local dev server on 127.0.0.1:4109
npm run typecheck           # TypeScript no-emit check (app and tests)
npm run typecheck:functions # TypeScript no-emit check (Pages Functions)
npm run test                # Vitest unit tests (client and function)
npm run build               # typecheck + vite build -> dist/
npm run test:e2e            # Playwright (system Chrome) against the built site
npm run check:contract      # mechanical content contract check

npm run d1:migrate:local    # apply migrations to the local D1 database
npm run pages:dev           # wrangler pages dev dist --port 4109
npm run test:contact        # reset local D1, migrate, run contact browser tests
npm run verify:contact      # full local contact gate, ends with CONTACT_VERIFY_OK

npm run verify              # typecheck + unit + build + browser + build check
npm run d1:migrate:remote   # release only: apply migrations to remote D1
npm run verify:remote-contact # release only: live insert/read/delete probe
npm run verify:live         # M12 utility: checks the nine published sites
npm run verify:remote-repos # M12 utility: checks the nine public repositories
```

`npm run verify` ends with `VERIFY_OK dualorbit-portfolio`.
`npm run check:contract` ends with `PORTFOLIO_CONTRACT_OK demos=8 systems=12`.
`npm run verify:contact` ends with `CONTACT_VERIFY_OK localRows=1`.

The browser suites use Playwright with the installed system Chrome
(`channel: "chrome"`, headless). The portfolio suite serves the production
build with `vite preview`; the contact suite serves it with
`wrangler pages dev`, so the real Pages Function and local D1 are exercised.

## Fixed demo URLs

Every demo is published under the `Amran-KakiTekno` account, one repository and
one Cloudflare Pages project each. The portfolio links are fixed and are
checked mechanically by `npm run check:contract`.

| Demo | Live | Source |
|---|---|---|
| ProDAX pipeline | https://prodax-pipeline.pages.dev | https://github.com/Amran-KakiTekno/prodax-pipeline |
| Data modelling | https://data-modelling.pages.dev | https://github.com/Amran-KakiTekno/data-modelling |
| RS toolstring | https://rs-toolstring.pages.dev | https://github.com/Amran-KakiTekno/rs-toolstring |
| n8n workflows | https://n8n-workflows-a8s.pages.dev | https://github.com/Amran-KakiTekno/n8n-workflows |
| Data quality checker | https://data-quality-checker.pages.dev | https://github.com/Amran-KakiTekno/data-quality-checker |
| WS exploratory analysis | https://ws-ml.pages.dev | https://github.com/Amran-KakiTekno/ws-ml |
| Service type analysis | https://service-type-analysis.pages.dev | https://github.com/Amran-KakiTekno/service-type-analysis |
| KSSM corpus | https://kssm-corpus.pages.dev | https://github.com/Amran-KakiTekno/kssm-corpus |

The portfolio itself is `https://dualorbit.pages.dev`, sourced from
`https://github.com/Amran-KakiTekno/dualorbit-portfolio`.

## Contact form

The form in the last section of `<main>` is the only contact channel on the
site. No email address is published anywhere.

- Browser validation: trimmed name 2–80 characters, email 3–254 characters in a
  conventional single-`@` shape, trimmed message 10–2000 characters, and a
  required `startedAt` timestamp.
- Spam mitigation without a secret: a visually hidden honeypot field plus a
  form-open timestamp, both sent to the server for it to judge.
- Transport: same-origin `POST /api/contact` with `Content-Type:
  application/json` and the fields `name`, `email`, `message`, `website`, and a
  numeric `startedAt`.
- Result: HTTP 201 with `{ "ok": true }` is success. Any other answer shows a
  non-destructive error and keeps the typed draft.

## D1 wiring

The contact endpoint is a Cloudflare Pages Function at
`functions/api/contact.ts`, bound to the `DB` D1 database declared in
`wrangler.jsonc`. It is the only server route: there is no inbox, no read or
list endpoint, and no admin UI.

Server behaviour:

- Only `POST` is accepted; every other method returns 405 with `Allow: POST`.
- The request must be `application/json` and at most 16 KiB; malformed JSON and
  wrong field types are rejected with 400 and never throw.
- Fields are trimmed and validated against the same limits as the browser, and
  `startedAt` must be at least 3 seconds old and no more than 24 hours old,
  measured against the server clock; future timestamps (including anything more
  than 60 seconds ahead) are rejected.
- A non-empty `website` honeypot receives the same 201 `{ "ok": true }` answer
  as a real submission, without any database access.
- Valid rows are inserted with bound parameters into `contact_submissions`
  (`name`, `email`, `message`, and a server-generated ISO `created_at`). The
  honeypot and `startedAt` are never stored.
- A database failure returns a generic 500 `{ "ok": false, error: "Unable to
  store your enquiry." }`; no stack trace, SQL, binding, or database detail is
  exposed. All responses carry `Cache-Control: no-store`.

Schema: `migrations/0001_create_contact_submissions.sql` creates
`contact_submissions` idempotently.

Local verification:

```sh
npm run verify:contact
```

This typechecks the app and the Function, runs all unit tests, builds, resets
`D:/portfolio/dualorbit-portfolio/.wrangler/state`, applies the migration with
`--local`, runs the contact browser suite against `wrangler pages dev`, and
asserts that exactly one row exists for the fixed synthetic local identity.

The remote migration and the live contact probe are release steps run by the
orchestrator only (`npm run d1:migrate:remote`, `npm run verify:remote-contact`).
They are never part of local verification.
