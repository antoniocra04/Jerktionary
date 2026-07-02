# Jerktionary

Jerktionary is an Electron desktop frontend for realtime speech transcription, term extraction, and short interview-style answers. It connects to a local backend over HTTP and WebSocket.

The app can use local models or API-backed models, but it still requires your backend to be running. The backend is the orchestrator: it receives audio chunks, runs or proxies Whisper, extracts terms with the backend NLP pipeline such as Natasha, and calls the selected LLM provider.

## Features

- Realtime microphone or system-audio capture.
- Live transcript rendering with backend-provided term highlights.
- Term explanations and live answers streamed from the backend.
- Settings for local or API-backed Whisper transcription.
- Settings for local or API-backed LLM explanations and answers.
- Electron packaging for Windows, Linux, and macOS.

## Architecture

```text
Electron renderer
  -> WebSocket /ws/audio
  -> Local backend
      -> local Whisper or Whisper API
      -> Natasha / term extraction pipeline
      -> local LLM or external LLM API
  <- transcript, terms, explanations, answers
```

The frontend does not talk directly to OpenAI, Whisper, or LLM APIs. API keys entered in settings are stored locally in the desktop app and sent to your local backend for the relevant request path.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the detailed flow and backend contract.

## Requirements

- Node.js 20 or newer.
- npm 10 or newer.
- A running Jerktionary-compatible backend on `127.0.0.1:8000`.

## Install

```bash
npm install
```

Copy the environment example if you need non-default backend URLs:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Development

Start the backend first, then run:

```bash
npm run dev
```

The app uses `electron-vite`. In dev mode it connects to the existing backend; it does not start the backend process.

Default backend endpoints:

```text
HTTP: http://127.0.0.1:8000
WS:   ws://127.0.0.1:8000/ws/audio
Docs: http://127.0.0.1:8000/docs
```

## Model Providers

Open settings in the app to switch each model path independently:

```text
Whisper transcription: Local or API key
LLM answers:           Local or API key
```

When Whisper is set to `API key`, the frontend connects to `/ws/audio` with query parameters:

```text
whisper_provider=api
whisper_api_key=<key>
```

When LLM answers are set to `API key`, explanation and answer requests include:

```json
{
  "llm": {
    "provider": "api",
    "api_key": "<key>"
  }
}
```

The local backend decides whether to run a local model or call an external provider.

## Scripts

```bash
npm run dev          # Start Electron in development mode
npm run typecheck    # TypeScript type checking
npm test             # Run unit tests
npm run lint         # Run ESLint
npm run build        # Build Electron/Vite output
npm run build:win    # Package Windows build
npm run build:linux  # Package Linux build
npm run build:mac    # Package macOS build
```

Build artifacts are written to `release/`. macOS packaging should be run on macOS when signing or notarization is required.

## Microphone Check

1. Start the backend.
2. Run `npm run dev`.
3. Confirm `/health` and `/ready` are green in the top bar.
4. Click the microphone button.
5. Grant microphone access.
6. The level meter should react while audio chunks stream to the WebSocket.

## Backend Contract

The frontend expects:

- `GET /health`
- `GET /ready`
- `GET /api/docs`
- `POST /api/terms/explain`
- `POST /api/terms/explain/stream`
- `POST /api/answer/stream`
- `WebSocket /ws/audio`

The WebSocket receives binary PCM frames: `16 kHz`, `mono`, signed `int16`, little-endian. Incoming JSON events are shown in the sidebar under `Last events`.

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

## Security

Do not commit real API keys. API keys entered in the desktop app are stored in local app storage and sent only to the configured backend URL. See [SECURITY.md](SECURITY.md) for reporting guidance.

## License

Jerktionary is released under the [MIT License](LICENSE).
