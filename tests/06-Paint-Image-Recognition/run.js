function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// OPTION A: try to make Paint draw using only the test-level drag API.
// Strategy: select the brush (single click works), then attempt several drag
// styles and screenshot after each so we can SEE which, if any, drew a stroke.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Paint";
  const OUT = parameters.OUT_DIR || ".";
  let launched = false;

  try {
    log("Launching Paint...");
    await driver.launch("mspaint.exe");
    await driver.pause(3000);
    await driver.focusWindow(WIN);
    await driver.maximizeWindow(WIN);
    await driver.pause(1000);
    launched = true;
    zephyrLog("Launched and maximised Paint.", "Pass");

    // Confirm UI and select the brush (click works for big targets).
    log("Detecting Paint UI...");
    await driver.waitForImage("paint-window.png", { timeout: 15000, threshold: 0.7 });

    log("Selecting the brush tool...");
    const brush = await driver.findImage("brush-tool.png", { threshold: 0.7 });
    if (!brush.found) throw new Error("Could not find brush tool.");
    await driver.clickImage("brush-tool.png", { threshold: 0.7 });
    await driver.pause(1000); // give the selection time to take
    zephyrLog("Selected the brush tool.", "Pass");

    // A canvas point well clear of the toolbar. The canvas starts ~y=140 and
    // spans a large area; pick coordinates comfortably inside it.
    const baseX = 300, baseY = 400;

    // --- Attempt 1: one slow, long drag ---
    log("Attempt 1: single long drag...");
    await driver.mouseMove(baseX, baseY);
    await driver.pause(400);
    await driver.drag({ from: { x: baseX, y: baseY }, to: { x: baseX + 250, y: baseY } });
    await driver.pause(600);
    await driver.screenshot(`${OUT}/06-drag-attempt1.png`);
    log("Saved 06-drag-attempt1.png");

    // --- Attempt 2: chained short drags through intermediate points ---
    log("Attempt 2: chained short drags...");
    const y2 = baseY + 80;
    const steps = [0, 50, 100, 150, 200, 250];
    for (let i = 0; i < steps.length - 1; i++) {
      const fx = baseX + steps[i];
      const tx = baseX + steps[i + 1];
      await driver.mouseMove(fx, y2);
      await driver.pause(150);
      await driver.drag({ from: { x: fx, y: y2 }, to: { x: tx, y: y2 } });
      await driver.pause(200);
    }
    await driver.screenshot(`${OUT}/06-drag-attempt2.png`);
    log("Saved 06-drag-attempt2.png");

    // --- Attempt 3: window-relative drag (in case screen coords are the issue) ---
    log("Attempt 3: window-relative drag...");
    const y3 = baseY + 160;
    await driver.drag(
      { from: { x: baseX, y: y3 }, to: { x: baseX + 250, y: y3 } },
      { relativeTo: WIN }
    );
    await driver.pause(600);
    await driver.screenshot(`${OUT}/06-drag-attempt3.png`);
    log("Saved 06-drag-attempt3.png");

    log("Done. Inspect 06-drag-attempt1/2/3.png to see which (if any) drew a stroke.");
    log("If NONE drew, the drag primitive needs the driver-level fix (Option B).");
    zephyrLog("Drag attempts complete — inspect the saved screenshots.", "Pass");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  } finally {
    if (launched) {
      try {
        log("Closing Paint without saving...");
        await driver.focusWindow(WIN);
        await driver.closeWindow();
        await driver.pause(1000);
        await driver.keyPress("Alt", "n");
        await driver.pause(500);
      } catch (closeErr) {
        log("Warning: could not close Paint cleanly: " + (closeErr && closeErr.message));
      }
    }
  }
};
