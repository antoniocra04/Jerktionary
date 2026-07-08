# Evidence Pack — TASK-009

- Date: 2026-07-08
- Branch: `task/009-macos-audio-fallback`
- Spec: `.workflow/specs/TASK-009.md`

## Gate Verdicts

| Gate | Verdict | Report |
|------|---------|--------|
| QA | PASS | `.workflow/qa/TASK-009-qa.md` |
| Design | N/A (gates: []) | — |
| Security | PASS (0 findings) | `.workflow/security/TASK-009-sec.md` |

## Commits (2)

```
6fe996f test(audio): add macOS fallback tests for empty-tracks and NotSupportedError [TASK-009]
b35ec08 refactor(audio): rename and broaden fallback helper for macOS empty-tracks and NotSupportedError [TASK-009]
```

## Diff Stat

```
2 files changed, 105 insertions(+), 10 deletions(-)
```

| File | +/- |
|------|-----|
| `src/features/audio/services/audio-capture-service.ts` | +27/-10 |
| `src/features/audio/services/audio-capture-service.test.ts` | +78 |

## Test Output

```
cmd /c "npm test"
 Test Files  7 passed (7)
      Tests  41 passed (41)
```
```
cmd /c "npm run lint"
(clean exit, 0 errors)
```
```
cmd /c "npm run typecheck"
(clean exit, 0 errors)
```

## Root Cause Fixed

`audio-capture-service.ts:101` threw plain `Error("Не удалось получить системный звук")` when `getDisplayMedia` returned zero audio tracks. The catch block only fell through to virtual-device on `NotAllowedError`/`NotFoundError` DOMExceptions — a plain `Error` never matched. Also `NotSupportedError` was unhandled.

**Fix:** Renamed `isUserDeniedOrUnavailable` → `shouldFallbackToVirtualDevice`, added `NotSupportedError` and the empty-audio-tracks `Error` to the match list, gated on `platform === "darwin"`.

## HITL (Human-in-the-Loop)

- [ ] AC1/AC2 — Manual verification on real macOS: pick "Система", verify the app falls through to virtual-device capture (no "Не удалось" error)
- [ ] AC3 — Verify that unexpected errors still propagate (e.g. disconnect audio device mid-capture)
