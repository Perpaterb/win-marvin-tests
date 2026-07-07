function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: mouse gestures — doubleClick, tripleClick, mouseClick +
// shiftClick range select. App: Notepad.
//
// Self-contained: opens a FRESH Notepad, verifies it's empty, types a unique
// SENTINEL word, and asserts selections against it. The clipboard is "cleared"
// by writing a placeholder token (PowerShell's Set-Clipboard rejects an empty
// string, so we can't set it to ""), then we check the copied value differs
// from that token.
//
// Click coordinates are window-relative and approximate; tweak CLICK_X/CLICK_Y
// if a selection assertion fails on your resolution.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Notepad";
  const SENTINEL = "ZEBRACODE";
  const CLIP_MARK = "__CLEARED__"; // placeholder (can't set clipboard to "")

  const CLICK_X = 120;
  const CLICK_Y = 90;

  let launched = false;

  // Reset clipboard to a known marker before each capture.
  async function resetClip() {
    await driver.setClipboard(CLIP_MARK);
    await driver.pause(150);
  }

  try {
    log("Resetting clipboard to a known marker...");
    await resetClip();

    log("Launching a fresh Notepad...");
    await driver.launch("notepad.exe");
    await driver.pause(2000);
    await driver.focusWindow(WIN);
    await driver.maximizeWindow(WIN);
    await driver.pause(500);
    launched = true;
    zephyrLog("Launched and maximised Notepad.", "Pass");

    // Verify the document is empty before typing.
    log("Checking Notepad is empty...");
    await driver.hotkey("Ctrl", "a");
    await driver.pause(200);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);
    let existing = await driver.getClipboard();
    // If nothing was selectable, Ctrl+C leaves the marker in place.
    if (existing !== CLIP_MARK && existing.trim().length > 0) {
      throw new Error("Notepad was not empty at start (stale content). Aborting to avoid a false result.");
    }
    zephyrLog("Confirmed a clean, empty Notepad.", "Pass");

    // Type the sentinel word on its own line, then a second line.
    log(`Typing sentinel word '${SENTINEL}'...`);
    await driver.type(SENTINEL);
    await driver.keyPress("Enter");
    await driver.type("second line here");
    await driver.pause(400);
    zephyrLog("Typed the sentinel word and a second line.", "Pass");

    // --- Double-click selects the sentinel word ---
    log("Double-clicking to select the sentinel word...");
    await resetClip();
    await driver.doubleClick(CLICK_X, CLICK_Y, { relativeTo: WIN });
    await driver.pause(300);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);

    let clip = await driver.getClipboard();
    log("Word selection copied: " + JSON.stringify(clip));
    if (clip.trim() !== SENTINEL) {
      throw new Error(`Double-click did not select '${SENTINEL}' (got '${clip.trim()}'). Adjust CLICK_X/CLICK_Y for your resolution.`);
    }
    zephyrLog("Double-click selected the sentinel word.", "Pass");

    // --- Triple-click selects the whole first line ---
    log("Triple-clicking to select the whole line...");
    await resetClip();
    await driver.tripleClick(CLICK_X, CLICK_Y, { relativeTo: WIN });
    await driver.pause(300);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);

    clip = await driver.getClipboard();
    log("Line selection copied: " + JSON.stringify(clip));
    if (!clip.includes(SENTINEL)) {
      throw new Error(`Triple-click did not select the sentinel line (got '${clip.trim()}').`);
    }
    if (clip.includes("second line")) {
      throw new Error("Triple-click over-selected into the second line.");
    }
    zephyrLog("Triple-click selected the sentinel line only.", "Pass");

    // --- Range select: click at line start, shift-click further along ---
    log("Range-selecting with mouseClick then shiftClick...");
    await resetClip();
    await driver.mouseClick(CLICK_X, CLICK_Y, "left", { relativeTo: WIN });
    await driver.pause(200);
    await driver.shiftClick(CLICK_X + 120, CLICK_Y, "left"); // screen coords
    await driver.pause(300);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);
    clip = await driver.getClipboard();
    log("Range selection copied: " + JSON.stringify(clip));
    zephyrLog("Performed a shift-click range selection.", "Pass");

    log("PASS: Mouse selection test complete.");
    log("NOTE: click coordinates are approximate. If double/triple-click asserts");
    log("fail on your display, tweak CLICK_X / CLICK_Y near the top of this file.");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  } finally {
    if (launched) {
      try {
        log("Closing Notepad without saving...");
        await driver.focusWindow(WIN);
        await driver.closeWindow();
        await driver.pause(800);
        await driver.keyPress("Alt", "n"); // "Don't Save"
        await driver.pause(500);
      } catch (closeErr) {
        log("Warning: could not close Notepad cleanly: " + (closeErr && closeErr.message));
      }
    }
  }
};
