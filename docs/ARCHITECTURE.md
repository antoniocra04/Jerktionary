# Architecture

Jerktionary is the desktop frontend. It is intentionally thin: it captures audio, renders transcript state, stores user settings, and sends requests to a local backend.

The backend remains required even when cloud/API model providers are selected.

## High-Level Flow

```text
User audio
  -> Electron renderer audio capture
  -> WebSocket /ws/audio on local backend
  -> backend provider selection
      -> local Whisper or Whisper API
      -> Natasha / term extraction pipeline
      -> local LLM or external LLM API
  -> JSON events and SSE streams
  -> Electron renderer UI
```

## Responsibilities

### Frontend

- Captures microphone or system audio.
- Converts audio to PCM chunks.
- Opens `/ws/audio` and sends binary audio frames.
- Renders transcript, highlighted terms, explanations, answers, backend status, and settings.
- Stores backend URL, display name, audio source, model-provider mode, and API keys in local storage.
- Passes model-provider settings to the backend.

### Backend

- Owns the actual model integrations.
- Receives PCM audio chunks.
- Runs local Whisper or calls a Whisper-compatible API.
- Runs the NLP/term extraction pipeline, including Natasha if your backend uses it.
- Runs a local LLM or calls an external LLM API.
- Streams transcript updates, term updates, explanations, and answers back to the frontend.
- Validates provider settings and API keys.

## Why The Backend Is Still Needed

The desktop frontend cannot replace the backend cleanly because the backend coordinates several server-side concerns:

- Audio WebSocket ingestion and session state.
- Local model processes and CPU/GPU resource management.
- Natasha or other NLP pipelines for term extraction.
- Provider-specific API clients.
- Consistent `/health`, `/ready`, and streaming contracts.
- Keeping external model calls out of renderer code.

Selecting `API key` in the frontend means "ask my backend to use an API provider for this path." It does not mean the frontend directly calls the external model provider.

## Model Provider Contract

### Whisper

When Whisper transcription is set to `API key`, the WebSocket URL includes:

```text
/ws/audio?whisper_provider=api&whisper_api_key=<key>
```

When it is set to `Local`, the URL includes:

```text
/ws/audio?whisper_provider=local
```

The backend should choose local Whisper or a Whisper-compatible API based on `whisper_provider`.

### LLM

Term explanation and answer requests include:

```json
{
  "llm": {
    "provider": "api",
    "api_key": "<key>"
  }
}
```

For local mode:

```json
{
  "llm": {
    "provider": "local"
  }
}
```

The backend should use this field for:

- `POST /api/terms/explain`
- `POST /api/terms/explain/stream`
- `POST /api/answer/stream`

## Expected Backend Endpoints

- `GET /health`
- `GET /ready`
- `GET /api/docs`
- `POST /api/terms/explain`
- `POST /api/terms/explain/stream`
- `POST /api/answer/stream`
- `WebSocket /ws/audio`

## Data Privacy Notes

- API keys entered in the app are stored locally by Electron.
- Keys are sent to the configured backend when API mode is active.
- Audio and transcript content are processed by the backend and may be forwarded to an external provider if API mode is active.
- Users should only configure trusted backend URLs.
