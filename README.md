# Marvin Example Tests — Windows Capability Showcase

A set of focused example tests, one per capability area, all driving built-in
Windows applications. Run each in **Desktop mode** (the Desktop/Web toggle in the
UI). Desktop tests are Windows-only.

Point Marvin at a repo containing this `tests/` folder, and each subfolder below
becomes a test card.

| # | Test | Capability shown | App |
|---|------|------------------|-----|
| 01 | Notepad — Keyboard, Hotkeys & Clipboard | `type`, `keyPress`, `hotkey`, `setClipboard`, `getClipboard` | Notepad |
| 02 | Calculator — UI Automation Controls | `findControl`, `clickControl`, `getControlText` (no coordinates) | Calculator |
| 03 | Notepad — Mouse Gestures | `doubleClick`, `tripleClick`, `mouseClick`, `shiftClick`, `drag`, window-relative coords | Notepad |
| 04 | Explorer — Window Management & Screenshots | `findWindow`, `focusWindow`, `maximizeWindow`, `getWindowTitle`, `screenshot`, `screenshotWindow` | Explorer |
| 05 | Calculator — OCR | `readText`, `waitForText` | Calculator |
| 06 | Paint — Image Recognition | `waitForImage`, `clickImage`, `findImage` (needs reference PNGs) | Paint |
| 07 | Notepad — Parameters & Secrets | `parameters.*`, injected secrets, `${{ secrets.NAME }}` | Notepad |

## Before you run

- **Test 06 needs three reference images.** See
  `tests/06-Paint-Image-Recognition/images/README.txt` for exactly what to
  capture and the filenames to use. The other six tests run as-is.
- **Test 07 (secrets).** Add a secret named `DEMO_SECRET` in the Secrets Manager
  to fully exercise the secret-injection path. Without it the test still runs and
  just skips the secret portion.
- **Test 04 screenshots** are written to the current directory by default; set
  the `SCREENSHOT_DIR` parameter on the card to change that.

## Notes on coordinates

Tests 03 and 06 use a few pixel coordinates for mouse actions. These are
approximate and may need nudging for your screen resolution / display scaling.
Each affected file calls this out in a comment or trailing log line, and uses
window-relative coordinates (`{ relativeTo: "..." }`) where possible to reduce
brittleness. UIA-based (test 02) and OCR-based (test 05) tests are
coordinate-free and the most robust to run first.

## Suggested demo order

1. **02 (UIA)** and **05 (OCR)** — coordinate-free, most reliable, good openers.
2. **01 (keyboard/clipboard)** and **04 (window mgmt)** — solid, no setup.
3. **07 (parameters/secrets)** — after adding the `DEMO_SECRET`.
4. **03 (mouse gestures)** and **06 (image recognition)** — last, since they may
   need a coordinate tweak / the reference PNGs.
