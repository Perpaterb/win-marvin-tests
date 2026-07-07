function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// DIAGNOSTIC for test 03: OCR finds the word, then we probe the click path.
// Screenshots are saved so you can SEE where clicks actually land.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Notepad";
  const SENTINEL = "ZEBRACODE";
  const CLIP_MARK = "__CLEARED__";
  const OUT = parameters.OUT_DIR || ".";
  let launched = false;

  async function resetClip() {
    await driver.setClipboard(CLIP_MARK);
    await driver.pause(150);
  }

  async function findWord(target) {
    const ocr = await driver.readText(null, {});
    const norm = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    for (const w of (ocr.words || [])) {
      if (norm(w.text) === norm(target) && w.bbox) {
        return {
          cx: Math.round((w.bbox.x0 + w.bbox.x1) / 2),
          cy: Math.round((w.bbox.y0 + w.bbox.y1) / 2),
          bbox: w.bbox,
        };
      }
    }
    throw new Error(`OCR could not find '${target}'.`);
  }

  // Try a double-click at (x,y), then report what got selected.
  async function tryDouble(x, y, label) {
    await resetClip();
    await driver.focusWindow(WIN);      // ensure foreground
    await driver.pause(200);
    await driver.mouseMove(x, y);        // move first
    await driver.pause(200);
    await driver.doubleClick(x, y);
    await driver.pause(300);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);
    const clip = await driver.getClipboard();
    const hit = clip.trim() === SENTINEL;
    log(`${label}: click (${x},${y}) -> ${hit ? "HIT" : "miss"} [${JSON.stringify(clip).slice(0,25)}]`);
    return hit;
  }

  try {
    await resetClip();
    log("Launching a fresh Notepad...");
    await driver.launch("notepad.exe");
    await driver.pause(2000);
    await driver.focusWindow(WIN);
    await driver.maximizeWindow(WIN);
    await driver.pause(600);
    launched = true;

    log(`Typing '${SENTINEL}'...`);
    await driver.type(SENTINEL);
    await driver.pause(500);

    const w = await findWord(SENTINEL);
    log(`OCR centre: (${w.cx}, ${w.cy}), bbox [${w.bbox.x0},${w.bbox.y0},${w.bbox.x1},${w.bbox.y1}]`);

    // Screenshot the current state so we can see the word's real position.
    await driver.screenshot(`${OUT}/03diag-before.png`);
    log(`Saved ${OUT}/03diag-before.png`);

    // Probe the OCR centre and several vertical offsets below it, in case the
    // reported bbox top is high relative to the actual glyphs.
    let anyHit = false;
    anyHit = (await tryDouble(w.cx, w.cy, "OCR centre")) || anyHit;
    anyHit = (await tryDouble(w.cx, w.cy + 10, "centre +10y")) || anyHit;
    anyHit = (await tryDouble(w.cx, w.cy + 20, "centre +20y")) || anyHit;
    anyHit = (await tryDouble(w.cx, w.cy + 30, "centre +30y")) || anyHit;
    anyHit = (await tryDouble(w.cx, w.cy + 40, "centre +40y")) || anyHit;

    // Screenshot after, to see final caret/selection.
    await driver.screenshot(`${OUT}/03diag-after.png`);
    log(`Saved ${OUT}/03diag-after.png`);

    if (anyHit) {
      zephyrLog("At least one click offset selected the word.", "Pass");
      log("SUCCESS: note which offset HIT above and use it in test 03.");
    } else {
      zephyrLog("No click offset selected the word.", "Fail");
      log("No offset worked. Open 03diag-before.png and tell me the pixel");
      log("position of the word vs where OCR reported it.");
      throw new Error("No click offset selected the sentinel.");
    }
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  } finally {
    if (launched) {
      try {
        await driver.focusWindow(WIN);
        await driver.closeWindow();
        await driver.pause(800);
        await driver.keyPress("Alt", "n");
        await driver.pause(500);
      } catch (e) {}
    }
  }
};
