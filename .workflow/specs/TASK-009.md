---
task: TASK-009
title: "Fix macOS system audio: empty-tracks and NotSupportedError don't fall through to virtual-device"
status: approved
gates: []
branch: "task/009-macos-audio-fallback"
created: "2026-07-08"
spec_version: 1
---

# TASK-009 — Fix macOS system audio fallback gaps

## User Story

As a macOS user, I want "Система" audio mode to work on my Mac without showing
"Не удалось получить системный звук" or "not supported", so that the app
automatically falls back to an installed virtual audio device when native
ScreenCaptureKit doesn't provide audio.

## Root Cause (from pattern discovery)

`audio-capture-service.ts:101` throws a plain `Error("Не удалось получить
системный звук")` when `getDisplayMedia` succeeds but returns zero audio tracks.
This happens when the macOS native picker grants screen capture but the user
unticks audio, or when the macOS version doesn't include audio in screen capture.

The `catch` block at line 105 only falls through to `captureViaVirtualAudioDevice()`
when `isUserDeniedOrUnavailable(err)` returns `true` — but that helper only matches
`DOMException` instances with name `NotAllowedError` or `NotFoundError`. A plain
`Error` never matches, so the virtual-device fallback is unreachable for the
empty-audio-tracks case.

Additionally, `getDisplayMedia` on macOS may throw `NotSupportedError` (not in
the helper's match list), which also bypasses the virtual-device fallback.

## Acceptance Criteria

- [x] AC1: On macOS, when `getDisplayMedia` returns a stream with zero audio tracks
  (e.g. user grants screen but unticks audio in OS picker, or macOS version lacks
  system-audio support), the app falls through to `captureViaVirtualAudioDevice()`
  instead of surfacing the error "Не удалось получить системный звук".
  Verify: `audio-capture-service.test.ts` has a test "empty audio tracks on macOS
  fall through to virtual-device capture".
- [x] AC2: On macOS, when `getDisplayMedia` throws a `NotSupportedError`
  DOMException (e.g. macOS < 13 with no ScreenCaptureKit), the app falls through
  to `captureViaVirtualAudioDevice()`.
  Verify: `audio-capture-service.test.ts` has a test "NotSupportedError on macOS
  falls through to virtual-device capture".
- [x] AC3: On any platform, when `getDisplayMedia` throws a non-denial,
  non-unsupported error (e.g. a genuine network/permission/hardware error), the
  error is propagated to the user unchanged — the fallback is NOT triggered for
  unexpected errors.
  Verify: existing test "does NOT fall through on non-denial errors" still passes.
- [x] AC4: `npm test` passes — all existing 38 tests plus new macOS-specific tests
  for the fixed fallback paths.
- [x] AC5: `npm run lint` passes with zero errors.

## Definition of Done

- [x] All AC pass
- [x] `npm test` passes (38+ tests)
- [x] `npm run lint` passes
- [x] No secrets, debug code, or commented-out blocks in the diff
- [x] No regression in Windows system audio capture or microphone capture

## Implementation Notes

- `b35ec08` — Renamed `isUserDeniedOrUnavailable` to `shouldFallbackToVirtualDevice( err, platform )`. The helper now gates on `platform === "darwin"` and matches `NotSupportedError` DOMException plus the empty-audio-tracks `Error("Не удалось получить системный звук")`. Call site in `captureSystemAudio()` updated to pass `platform`.
- `6fe996f` — Added 3 tests: empty audio tracks → virtual device fallback; `NotSupportedError` → virtual device fallback; empty audio tracks + no virtual device → install-guidance error.
- `npm test`: 41 tests pass (38 existing + 3 new). `npm run lint`: zero errors.
