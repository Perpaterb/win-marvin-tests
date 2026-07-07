function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: template-matching image recognition — waitForImage,
// findImage, clickImage. App: Paint (mspaint.exe).
//
// This test needs THREE reference PNGs in the images/ folder next to this file.
// See images/README.txt for exactly what to capture. Because toolbar icons look
// the same on every launch, image matching is a reliable way to drive Paint.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Paint";

  try {
    log("Launching Paint...");
    await driver.launch("mspaint.exe");
    await driver.pause(3000);
    await driver.focusWindow(WIN);
    await driver.maximizeWindow(WIN);
    await driver.pause(1000);
    zephyrLog("Launched and maximised Paint.", "Pass");

    // 1) Wait for the Paint window to be ready by detecting a known icon.
    log("Waiting for the Paint toolbar (paint-window.png) to appear...");
    await driver.waitForImage("paint-window.png", { timeout: 15000, threshold: 0.8 });
    zephyrLog("Detected the Paint toolbar via image match.", "Pass");

    // 2) Click a tool by its icon image (e.g. the Pencil/Brush).
    log("Clicking the brush tool (brush-tool.png)...");
    await driver.clickImage("brush-tool.png", { threshold: 0.8 });
    await driver.pause(500);
    zephyrLog("Clicked the brush tool by image.", "Pass");

    // 3) Draw something on the canvas with a drag, so there's a visible result.
    log("Drawing a stroke on the canvas via drag...");
    await driver.drag(
      { from: { x: 300, y: 400 }, to: { x: 600, y: 550 } },
      { relativeTo: WIN }
    );
    await driver.pause(500);
    zephyrLog("Drew a stroke on the canvas.", "Pass");

    // 4) Confirm a reference icon is NOT present (negative check without throwing).
    log("Checking the error-dialog.png icon is absent...");
    const err = await driver.findImage("error-dialog.png", { threshold: 0.9 });
    if (err.found) {
      throw new Error("An unexpected error dialog appeared on screen.");
    }
    log("Confidence for (absent) error image: " + err.confidence);
    zephyrLog("Confirmed no error dialog is present.", "Pass");

    log("Closing Paint without saving...");
    await driver.focusWindow(WIN);
    await driver.closeWindow();
    await driver.pause(1000);
    // Paint prompts to save — press "Don't Save" (Alt+N on the classic dialog).
    await driver.keyPress("Alt", "n");
    await driver.pause(500);
    zephyrLog("Closed Paint without saving.", "Pass");

    log("PASS: Image recognition test complete.");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  }
};
