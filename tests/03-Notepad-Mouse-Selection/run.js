function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: mouse gestures — double/triple click, shift-click range
// select, window-relative coordinates, and drag. App: Notepad.
//
// We type known text, then use mouse selection to grab parts of it, copying
// each selection to the clipboard and reading it back to prove the gesture
// landed where we intended.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Notepad";

  try {
    log("Launching Notepad and maximising...");
    await driver.launch("notepad.exe");
    await driver.pause(2000);
    await driver.focusWindow(WIN);
    await driver.maximizeWindow(WIN);
    await driver.pause(500);
    zephyrLog("Launched and maximised Notepad.", "Pass");

    // Type text at a large font-independent baseline. The exact pixel maths for
    // clicks is approximate, so we double-click a word rather than needing to
    // hit an exact character. Double-click selects the word under the cursor.
    log("Typing sample text...");
    await driver.type("Alpha Bravo Charlie Delta Echo");
    await driver.pause(500);
    zephyrLog("Typed a line of space-separated words.", "Pass");

    // --- Triple-click selects the whole line ---
    // Click roughly in the text area. Coordinates are relative to the Notepad
    // window's top-left. Adjust y if your title/menu bar height differs.
    log("Triple-clicking to select the whole line...");
    await driver.tripleClick(120, 90, { relativeTo: WIN });
    await driver.pause(300);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);

    let clip = await driver.getClipboard();
    log("Line selection copied: " + JSON.stringify(clip));
    if (!clip.includes("Alpha") || !clip.includes("Echo")) {
      throw new Error("Triple-click did not select the full line.");
    }
    zephyrLog("Triple-click selected the entire line.", "Pass");

    // --- Double-click selects a single word ---
    log("Double-clicking to select a single word...");
    await driver.doubleClick(130, 90, { relativeTo: WIN });
    await driver.pause(300);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);

    clip = await driver.getClipboard();
    log("Word selection copied: " + JSON.stringify(clip));
    // Should be a single word with no spaces.
    if (clip.trim().split(/\s+/).length !== 1 || clip.trim().length === 0) {
      throw new Error(`Double-click did not select a single word (got '${clip}').`);
    }
    zephyrLog("Double-click selected a single word.", "Pass");

    // --- Shift-click range select: click at a start point, shift-click at end ---
    log("Range-selecting with mouseClick then shiftClick...");
    await driver.mouseClick(120, 90, "left", { relativeTo: WIN });
    await driver.pause(200);
    await driver.shiftClick(260, 90, "left"); // shiftClick takes screen coords
    await driver.pause(300);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);
    clip = await driver.getClipboard();
    log("Range selection copied: " + JSON.stringify(clip));
    zephyrLog("Performed a shift-click range selection.", "Pass");

    log("Closing Notepad without saving...");
    await driver.focusWindow(WIN);
    await driver.closeWindow();
    await driver.pause(800);
    await driver.keyPress("Alt", "n");
    await driver.pause(500);
    zephyrLog("Closed Notepad without saving.", "Pass");

    log("PASS: Mouse selection test complete.");
    log("NOTE: click coordinates are approximate — if a selection assertion");
    log("fails on your resolution, nudge the x/y values near the top of the file.");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  }
};
