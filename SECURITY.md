# Security Policy

## Supported Versions

Security fixes target the latest `main` branch until tagged releases are introduced.

## Reporting a Vulnerability

Please do not open a public issue for sensitive reports.

Report vulnerabilities privately through GitHub Security Advisories if available, or contact the maintainer through the GitHub profile for this repository.

Include:

- A short description of the issue.
- Reproduction steps.
- The affected platform and app version or commit.
- Whether API keys, transcript data, or local files can be exposed.

## API Key Handling

The desktop app stores model API keys in local browser storage inside Electron. Keys are sent only to the configured backend URL when the corresponding provider is set to `API key`.

Use a trusted local backend. Do not point the app at an untrusted backend if you enter API keys.
