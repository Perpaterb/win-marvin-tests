function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: text selection + clipboard, driven by KEYBOARD.
// App: Notepad.
//
// History: mouse-coordinate selection (double/triple/shift-click) was tried
// extensively and proved unreliable on this environment — OCR located the text
// correctly and coordinates/scaling were right, but synthesized mouse clicks
// didn't register in Notepad's edit control. Keyboard selection is rock solid
// and demonstrates the same capability (select, copy, verify).
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Notepad";
  const CLIP_MARK = "__CLEARED__";
  let launched = false;

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
    await driver.pause(400);
    launched = true;
    zephyrLog("Launched Notepad.", "Pass");

    // Verify empty.
    log("Checking Notepad is empty...");
    await driver.hotkey("Ctrl", "a");
    await driver.pause(200);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);
    const existing = await driver.getClipboard();
    if (existing !== CLIP_MARK && existing.trim().length > 0) {
      throw new Error("Notepad was not empty at start (stale content). Aborting.");
    }
    zephyrLog("Confirmed a clean, empty Notepad.", "Pass");

    // Type three known lines.
    const L1 = "First line ALPHA";
    const L2 = "Second line BRAVO";
    const L3 = "Third line CHARLIE";
    log("Typing three known lines...");
    await driver.type(L1);
    await driver.keyPress("Enter");
    await driver.type(L2);
    await driver.keyPress("Enter");
    await driver.type(L3);
    await driver.pause(400);
    zephyrLog("Typed three known lines.", "Pass");

    // --- Select the CURRENT line (Home, then Shift+End) ---
    // Caret is at end of L3. Home to line start, Shift+End to select the line.
    log("Selecting the current line with Home + Shift+End...");
    await resetClip();
    await driver.keyPress("Home");
    await driver.pause(150);
    await driver.hotkey("Shift", "End");
    await driver.pause(200);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);

    let clip = await driver.getClipboard();
    log("Current-line selection copied: " + JSON.stringify(clip));
    if (clip.trim() !== L3) {
      throw new Error(`Expected to select '${L3}', got '${clip.trim()}'.`);
    }
    zephyrLog("Selected the current line (Home + Shift+End).", "Pass");

    // --- Extend selection UP one line (Shift+Up, Shift+Home) ---
    log("Extending the selection up one line...");
    await resetClip();
    // Caret currently at end of L3 with L3 selected; collapse to end first.
    await driver.keyPress("End");
    await driver.pause(150);
    await driver.hotkey("Shift", "Up");   // extend up into L2
    await driver.hotkey("Shift", "Home"); // to start of L2
    await driver.pause(200);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);
    clip = await driver.getClipboard();
    log("Multi-line selection copied: " + JSON.stringify(clip));
    if (!clip.includes("BRAVO") || !clip.includes("CHARLIE")) {
      throw new Error(`Expected selection to span BRAVO..CHARLIE, got '${clip.trim()}'.`);
    }
    zephyrLog("Extended selection across two lines.", "Pass");

    // --- Select ALL (Ctrl+A) and verify every line is present ---
    log("Selecting all with Ctrl+A...");
    await resetClip();
    await driver.hotkey("Ctrl", "a");
    await driver.pause(200);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);
    clip = await driver.getClipboard();
    log("Select-all copied: " + JSON.stringify(clip));
    if (!clip.includes("ALPHA") || !clip.includes("BRAVO") || !clip.includes("CHARLIE")) {
      throw new Error(`Select-all did not capture all three lines (got '${clip.trim()}').`);
    }
    zephyrLog("Select-all captured all three lines.", "Pass");

    log("PASS: Keyboard text-selection test complete.");
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
        await driver.keyPress("Alt", "n"); // "Don't Save" (classic Notepad)
        await driver.pause(500);
      } catch (closeErr) {
        log("Warning: could not close Notepad cleanly: " + (closeErr && closeErr.message));
      }
    }
  }
};
