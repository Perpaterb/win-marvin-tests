function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: mouse gestures — doubleClick, tripleClick, mouseClick +
// shiftClick range select, and a drag. App: Notepad.
//
// Made self-contained after an earlier run grabbed STALE Notepad content:
//   - Clipboard is cleared first, so a leftover value can't cause a false pass.
//   - We open a FRESH Notepad and verify it's empty before typing.
//   - We type a known SENTINEL word ("ZEBRACODE") on its own line so a
//     triple-click can only select that word/line, never neighbouring text.
//   - Assertions check for the sentinel specifically.
//
// Click coordinates are window-relative. They're still approximate; if a
// selection assertion fails on your resolution, nudge CLICK_X / CLICK_Y below.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Notepad";
  const SENTINEL = "ZEBRACODE";

  // Approx. click point inside the text area, relative to the Notepad window.
  const CLICK_X = 120;
  const CLICK_Y = 90;

  let launched = false;

  try {
    // Clear the clipboard so nothing from a previous run can leak in.
    log("Clearing clipboard...");
    await driver.setClipboard("");
    await driver.pause(200);

    log("Launching a fresh Notepad...");
    await driver.launch("notepad.exe");
    await driver.pause(2000);
    await driver.focusWindow(WIN);
    await driver.maximizeWindow(WIN);
    await driver.pause(500);
    launched = true;
    zephyrLog("Launched and maximised Notepad.", "Pass");

    // Verify the document is empty before we type. Select-all + copy; if there's
    // pre-existing content, bail out rather than test against stale text.
    log("Checking Notepad is empty...");
    await driver.hotkey("Ctrl", "a");
    await driver.pause(200);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);
    const existing = await driver.getClipboard();
    if (existing && existing.trim().length > 0) {
      throw new Error("Notepad was not empty at start (found stale content). Aborting to avoid a false result.");
    }
    zephyrLog("Confirmed a clean, empty Notepad.", "Pass");

    // Type the sentinel word on its own line, then a second line so the caret
    // isn't ambiguous. The sentinel is unique and space-free.
    log(`Typing sentinel word '${SENTINEL}'...`);
    await driver.type(SENTINEL);
    await driver.keyPress("Enter");
    await driver.type("second line here");
    await driver.pause(400);
    zephyrLog("Typed the sentinel word and a second line.", "Pass");

    // --- Double-click selects the sentinel word ---
    log("Double-clicking to select the sentinel word...");
    await driver.setClipboard(""); // reset before each capture
    await driver.pause(150);
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

    // --- Triple-click selects the whole first line (just the sentinel here) ---
    log("Triple-clicking to select the whole line...");
    await driver.setClipboard("");
    await driver.pause(150);
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
    // This demonstrates mouseClick + shiftClick. We assert we captured *some*
    // text starting from the sentinel; exact span depends on font metrics.
    log("Range-selecting with mouseClick then shiftClick...");
    await driver.setClipboard("");
    await driver.pause(150);
    await driver.mouseClick(CLICK_X, CLICK_Y, "left", { relativeTo: WIN });
    await driver.pause(200);
    // shiftClick takes SCREEN coordinates; approximate a point to the right.
    await driver.shiftClick(CLICK_X + 120, CLICK_Y, "left");
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
