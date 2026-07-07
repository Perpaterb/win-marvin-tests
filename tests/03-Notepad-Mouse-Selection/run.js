function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Coordinate finder for test 03. Types a sentinel word, then double-clicks a
// grid of candidate window-relative points and reports which ones select it.
// Use the first HIT coordinate as CLICK_X / CLICK_Y in test 03.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Notepad";
  const SENTINEL = "ZEBRACODE";
  const CLIP_MARK = "__CLEARED__";
  let launched = false;

  async function resetClip() {
    await driver.setClipboard(CLIP_MARK);
    await driver.pause(120);
  }

  try {
    log("Launching a fresh Notepad...");
    await driver.launch("notepad.exe");
    await driver.pause(2000);
    await driver.focusWindow(WIN);
    await driver.maximizeWindow(WIN);
    await driver.pause(500);
    launched = true;

    log(`Typing sentinel '${SENTINEL}'...`);
    await driver.type(SENTINEL);
    await driver.pause(400);

    // Candidate points (window-relative). Sweep down and a little across,
    // since the text area top varies with the tab/tool bar height.
    const xs = [60, 100, 140];
    const ys = [70, 100, 130, 160, 190, 220];

    let firstHit = null;
    for (const y of ys) {
      for (const x of xs) {
        await resetClip();
        await driver.doubleClick(x, y, { relativeTo: WIN });
        await driver.pause(200);
        await driver.hotkey("Ctrl", "c");
        await driver.pause(200);
        const clip = await driver.getClipboard();
        const hit = clip.trim() === SENTINEL;
        log(`(${x}, ${y}) -> ${hit ? "HIT" : "miss"}  [${JSON.stringify(clip).slice(0, 30)}]`);
        if (hit && !firstHit) firstHit = { x, y };
      }
    }

    if (firstHit) {
      log(`\nFIRST HIT at (${firstHit.x}, ${firstHit.y}).`);
      log(`Set CLICK_X = ${firstHit.x} and CLICK_Y = ${firstHit.y} in test 03.`);
      zephyrLog(`Found selecting coordinate (${firstHit.x}, ${firstHit.y}).`, "Pass");
    } else {
      log("\nNo coordinate selected the sentinel. Try a wider sweep or check the");
      log("window is really maximised and focused.");
      zephyrLog("No selecting coordinate found.", "Fail");
      throw new Error("Coordinate finder found no hit.");
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
      } catch (e) {
        log("Warning: could not close Notepad: " + (e && e.message));
      }
    }
  }
};
