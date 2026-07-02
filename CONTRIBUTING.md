# Contributing

Thanks for helping improve Jerktionary.

## Development Setup

1. Install Node.js 20 or newer.
2. Install dependencies:

```bash
npm install
```

3. Start the compatible backend on `127.0.0.1:8000`.
4. Start the desktop frontend:

```bash
npm run dev
```

## Quality Checks

Run these before opening a pull request:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Pull Requests

- Keep changes focused and explain the user-facing impact.
- Add or update tests when behavior changes.
- Update README or docs when changing setup, model-provider behavior, or backend contracts.
- Do not commit generated output from `out/`, `release/`, or dependency folders.
- Do not commit real API keys or local `.env` files.

## Commit Style

Use short imperative commit messages, for example:

```text
Add model provider settings
Fix transcript merge ordering
Document backend API contract
```
