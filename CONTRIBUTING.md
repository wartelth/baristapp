# Contributing to Baristapp

Thanks for your interest in contributing.

## Ground Rules

- Be respectful and constructive in discussions and reviews.
- Keep pull requests focused and small when possible.
- Prefer schema-first changes for mini-app primitives:
  - update `shared/` first
  - then wire app/server behavior
- Never commit secrets (`.env`, API keys, tokens).

## Development Setup

1. Fork and clone:

```bash
git clone https://github.com/wartelth/baristapp.git
cd baristapp
npm install
```

2. Configure:
   - Copy `server/.env.example` to `server/.env`
   - Update `baristapp.config.js` for local network/API values

3. Run:

```bash
npm run server
npm run app
```

Optional:

```bash
npm run docs
cd website && npm run dev
```

## Branching

- Create feature branches from main:
  - `feat/<short-name>`
  - `fix/<short-name>`
  - `chore/<short-name>`

## Commit Style

Use clear, intent-based messages, for example:

- `feat(app): add mobile menu backdrop close behavior`
- `fix(server): validate skillCall resultKey defaults`
- `docs: refresh root readme architecture section`

## Pull Request Checklist

- [ ] Change is scoped and explained
- [ ] No secrets or local credentials committed
- [ ] Updated docs when behavior/contracts changed
- [ ] Ran relevant checks:
  - `npm run typecheck`
  - `npm run test --workspace=server` (if server touched)
  - `cd website && npm run lint` (if website touched)
- [ ] Added screenshots or recordings for UI changes
- [ ] Added/updated tests where practical

## Where To Change What

- `shared/`: schema/types contracts
- `app/`: renderer/UI/client behavior
- `server/`: orchestration, generation, APIs, persistence
- `docs/`: Docusaurus technical docs
- `website/`: marketing/showcase site

## Reporting Security Issues

Please do not open public issues for sensitive vulnerabilities.
Contact maintainers privately via `support@baristapp.app`.
