function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: mouse gestures driven by OCR-located targets.
// App: Notepad.
//
// Fixed-coordinate clicking failed entirely (an 18-point grid all missed),
// so instead we OCR the screen to find the SENTINEL word's bounding box and
// click its centre. This is robust to window position, resolution, and the
// tab/tool-bar height. Uses SCREEN coordinates (no relativeTo assumption).
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Notepad";
  const SENTINEL = "ZEBRACODE";
  const CLIP_MARK = "__CLEARED__";
  let launched = false;

  async function resetClip() {
    await driver.setClipboard(CLIP_MARK);
    await driver.pause(150);
  }

  // OCR the screen and return the centre {x, y} of the first word whose text
  // matches `target` (case-insensitive, ignoring non-letters). Throws if absent.
  async function findWordCentre(target) {
    const ocr = await driver.readText(null, {});
    const norm = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const want = norm(target);
    const words = (ocr && ocr.words) || [];
    log(`OCR saw ${words.length} words (confidence ${ocr && ocr.confidence}).`);
    for (const w of words) {
      if (norm(w.text) === want && w.bbox) {
        const cx = Math.round((w.bbox.x0 + w.bbox.x1) / 2);
        const cy = Math.round((w.bbox.y0 + w.bbox.y1) / 2);
        log(`Found '${target}' at bbox [${w.bbox.x0},${w.bbox.y0},${w.bbox.x1},${w.bbox.y1}] -> centre (${cx}, ${cy}).`);
        return { x: cx, y: cy };
      }
    }
    // Log what OCR did see, to help debugging if the word wasn't found.
    log("Words seen: " + words.map((w) => w.text).join(" | ").slice(0, 300));
    throw new Error(`OCR could not locate the word '${target}' on screen.`);
  }

  try {
    log("Resetting clipboard to a known marker...");
    await resetClip();

    log("Launching a fresh Notepad...");
    await driver.launch("notepad.exe");
    await driver.pause(2000);
    await driver.focusWindow(WIN);
    await driver.maximizeWindow(WIN);
    await driver.pause(600);
    launched = true;
    zephyrLog("Launched and maximised Notepad.", "Pass");

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

    // Type the sentinel in a large-ish context. Notepad's default font is small,
    // which can hurt OCR, so we type it a couple of times with spacing to give
    // OCR a clear target.
    log(`Typing sentinel word '${SENTINEL}'...`);
    await driver.type(SENTINEL);
    await driver.keyPress("Enter");
    await driver.type("second line here");
    await driver.pause(500);
    zephyrLog("Typed the sentinel word and a second line.", "Pass");

    // Locate the word via OCR.
    log("Locating the sentinel word via OCR...");
    const centre = await findWordCentre(SENTINEL);
    zephyrLog("Located the sentinel word on screen via OCR.", "Pass");

    // --- Double-click the located word ---
    log("Double-clicking the located word...");
    await resetClip();
    await driver.doubleClick(centre.x, centre.y); // screen coordinates
    await driver.pause(300);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);

    let clip = await driver.getClipboard();
    log("Word selection copied: " + JSON.stringify(clip));
    if (clip.trim() !== SENTINEL) {
      throw new Error(`Double-click did not select '${SENTINEL}' (got '${clip.trim()}').`);
    }
    zephyrLog("Double-click selected the sentinel word.", "Pass");

    // --- Triple-click selects the whole line ---
    log("Triple-clicking to select the whole line...");
    await resetClip();
    await driver.tripleClick(centre.x, centre.y);
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

    // --- Range select: click at the word, shift-click to its right ---
    log("Range-selecting with mouseClick then shiftClick...");
    await resetClip();
    await driver.mouseClick(centre.x, centre.y, "left");
    await driver.pause(200);
    await driver.shiftClick(centre.x + 120, centre.y, "left");
    await driver.pause(300);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);
    clip = await driver.getClipboard();
    log("Range selection copied: " + JSON.stringify(clip));
    zephyrLog("Performed a shift-click range selection.", "Pass");

    log("PASS: OCR-located mouse selection test complete.");
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
        await driver.keyPress("Alt", "n");
        await driver.pause(500);
      } catch (closeErr) {
        log("Warning: could not close Notepad cleanly: " + (closeErr && closeErr.message));
      }
    }
  }
};
