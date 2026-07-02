# Jerktionary Desktop Frontend

Electron + React + TypeScript frontend for a local realtime microphone transcript backend.

## Install

```bash
npm install
```

Node.js is required. The backend is expected to run separately on `127.0.0.1:8000`.

## Dev Frontend

```bash
npm run dev
```

The app uses `electron-vite`. In dev mode it connects to the existing local backend; it does not start the backend process.

## Backend Connection

Default endpoints:

```text
HTTP: http://127.0.0.1:8000
WS:   ws://127.0.0.1:8000/ws/audio
```

Override them in `.env`:

```env
VITE_BACKEND_HTTP_URL=http://127.0.0.1:8000
VITE_BACKEND_WS_URL=ws://127.0.0.1:8000/ws/audio
VITE_BACKEND_SWAGGER_URL=http://127.0.0.1:8000/docs
```

## Model Providers

Open settings in the app to switch each model path independently:

```text
Whisper transcription: Local or API key
LLM answers:           Local or API key
```

When Whisper is set to `API key`, the frontend connects to `/ws/audio` with:

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

## Swagger

Open Swagger at:

```text
http://127.0.0.1:8000/docs
```

The app also has an `Open Swagger` button on the backend unavailable screen.

## Desktop Build

```bash
npm run build
```

Package installers/bundles for each desktop OS:

```bash
npm run build:win
npm run build:linux
npm run build:mac
```

Artifacts are written to `release/`. macOS packaging should be run on macOS when signing or notarization is required.

## Microphone Check

1. Start the backend.
2. Run `npm run dev`.
3. Confirm `/health` and `/ready` are green in the top bar.
4. Click `Start Listening`.
5. Grant microphone access.
6. The level meter should react while audio chunks stream to the WebSocket.

## WebSocket Debugging

The frontend opens one WebSocket per listening session:

```text
ws://127.0.0.1:8000/ws/audio
```

It sends binary PCM frames only: `16 kHz`, `mono`, signed `int16`, little-endian. Incoming JSON events are shown in the sidebar under `Last events`.

## Backend Unavailable

If the backend is down, the main view shows `Backend недоступен`, the expected backend URL, and actions for retrying and opening Swagger.

If `/ready` returns `ready=false`, the sidebar lists each component and marks required failing services separately from optional services like `llm`.

## CORS

If Vite runs from `http://127.0.0.1:5173`, the backend may need to allow that origin. A fetch/CORS failure is shown as:

```text
Backend недоступен или CORS не разрешает dev origin. Проверьте backend и CORS.
```

## Tests

```bash
npm test
```

Current tests cover transcript span normalization, overlap resolution, invalid span filtering, and basic highlighted rendering.
