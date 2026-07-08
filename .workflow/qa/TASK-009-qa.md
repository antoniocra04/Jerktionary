# QA Report — TASK-009

- Date: 2026-07-08
- Branch: task/009-macos-audio-fallback (Frontend sub-repo, commits b35ec08 + 6fe996f)
- Commit: 6fe996f
- Verdict: **PASS**

## Acceptance Criteria Verification

### AC1: On macOS, when `getDisplayMedia` returns a stream with zero audio tracks, the app falls through to `captureViaVirtualAudioDevice()` instead of surfacing the error "Не удалось получить системный звук".
- Status: PASS
- Command: `npx vitest run -c vitest.config.ts src/features/audio/services/audio-capture-service.test.ts`
- Output:
```
 ✓ src/features/audio/services/audio-capture-service.test.ts (8 tests) 11ms
   ✓ AudioCaptureService — captureSystemAudio (Windows) (1)
     ✓ uses getDisplayMedia on Windows (audio: 'loopback' handled by Electron)
   ✓ AudioCaptureService — captureSystemAudio (macOS native) (7)
     ✓ uses getDisplayMedia on macOS 13+ (native ScreenCaptureKit)
     ✓ falls through to virtual-device capture when getDisplayMedia throws NotAllowedError
     ✓ throws install-guidance error when no virtual device is found on macOS fallback
     ✓ does NOT fall through on non-denial errors (propagates the error)
     ✓ empty audio tracks on macOS fall through to virtual-device capture
```
- Evidence: Test "empty audio tracks on macOS fall through to virtual-device capture" (line 234) passes. Implementation: `shouldFallbackToVirtualDevice()` at line 189-191 matches `Error("Не удалось получить системный звук")`, which is thrown at line 101 when `getAudioTracks().length === 0`.

### AC2: On macOS, when `getDisplayMedia` throws a `NotSupportedError` DOMException, the app falls through to `captureViaVirtualAudioDevice()`.
- Status: PASS
- Command: `npx vitest run -c vitest.config.ts src/features/audio/services/audio-capture-service.test.ts`
- Output:
```
 ✓ src/features/audio/services/audio-capture-service.test.ts (8 tests) 11ms
   ...
     ✓ NotSupportedError on macOS falls through to virtual-device capture
```
- Evidence: Test "NotSupportedError on macOS falls through to virtual-device capture" (line 272) passes. Implementation: `shouldFallbackToVirtualDevice()` at line 182-186 matches `DOMException` with `name === "NotSupportedError"`.

### AC3: On any platform, when `getDisplayMedia` throws a non-denial, non-unsupported error, the error is propagated unchanged — the fallback is NOT triggered for unexpected errors.
- Status: PASS
- Command: `npx vitest run -c vitest.config.ts src/features/audio/services/audio-capture-service.test.ts`
- Output:
```
 ✓ src/features/audio/services/audio-capture-service.test.ts (8 tests) 11ms
   ...
     ✓ does NOT fall through on non-denial errors (propagates the error)
```
- Evidence: Test "does NOT fall through on non-denial errors (propagates the error)" (line 224) still passes. Implementation: `shouldFallbackToVirtualDevice()` returns `false` at line 193 for unrecognized errors, so `catch` block re-throws (`throw err` at line 109).

### AC4: `npm test` passes — all existing 38 tests plus new macOS-specific tests for the fixed fallback paths.
- Status: PASS
- Command: `npm test` (vitest run)
- Output:
```
 ✓ src/features/audio/services/mac-audio-utils.test.ts (11 tests) 6ms
 ✓ src/features/transcript/store/transcript-store.test.ts (7 tests) 6ms
 ✓ src/features/transcript/services/transcript-merger.test.ts (3 tests) 3ms
 ✓ electron/main/index.test.ts (3 tests) 29ms
 ✓ src/features/live-answer/hooks/useLiveQuestion.test.ts (8 tests) 2ms
 ✓ src/features/audio/services/audio-capture-service.test.ts (8 tests) 11ms
 ✓ src/features/transcript/components/HighlightedTranscript.test.tsx (1 test) 19ms

 Test Files  7 passed (7)
      Tests  41 passed (41)
```
- Evidence: 7 test files, 41 tests (38 existing + 3 new), all pass.

### AC5: `npm run lint` passes with zero errors.
- Status: PASS
- Command: `npm run lint` (eslint .)
- Output:
```
(no output — zero errors)
```
- Evidence: ESLint exits with code 0, no warnings or errors.

## Full Test Suite
- Command: `npm test`
- Result: PASS
```
 ✓ 7 test files passed
 ✓ 41 tests passed
```

## Linter
- Command: `npm run lint`
- Result: PASS (zero errors, zero warnings)

## Type Check
- Command: `npm run typecheck`
- Result: PASS (zero errors)

## Scope Check
- `git diff ecc62ba...HEAD --stat` reviewed:
```
 src/features/audio/services/audio-capture-service.test.ts   | 78 ++++++++++++++++++++++
 src/features/audio/services/audio-capture-service.ts        | 37 +++++++---
 2 files changed, 105 insertions(+), 10 deletions(-)
```
- Diff stays within spec scope: **YES** — only the service file and its test file are touched. No other files modified.

## Failures (if any)
None — all criteria pass.

## Definition of Done
- [x] All AC pass — AC1 through AC5 all verified with test/lint output above
- [x] `npm test` passes (41 tests — 38 existing + 3 new) — confirmed
- [x] `npm run lint` passes — confirmed, zero errors
- [x] No secrets, debug code, or commented-out blocks in the diff — confirmed; diff reviewed, only production test code with explanatory inline comments
- [x] No regression in Windows system audio capture or microphone capture — existing test "uses getDisplayMedia on Windows" passes; `shouldFallbackToVirtualDevice()` gates on `platform === "darwin"` (line 177), so Windows path is unchanged
