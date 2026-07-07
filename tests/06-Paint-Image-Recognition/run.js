function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Draws Marvin (Hitchhiker's Guide) in Paint as coarse line-art.
// Reduced to ~65 segments so it draws faster — each driver.drag spawns a
// PowerShell process (~1s), so fewer segments = proportionally less time.
// Brush is selected first via image match; strokes are traced as chained drags.
//
const PATHS = [["head", [[390, 265], [402, 244], [421, 227], [443, 216], [468, 213], [493, 216], [515, 227], [534, 244], [546, 265], [535, 275], [535, 340], [478, 362], [421, 340], [421, 275], [390, 265]]], ["eyeL", [[512, 282], [528, 282], [528, 298], [512, 298], [512, 282]]], ["eyeR", [[572, 282], [588, 282], [588, 298], [572, 298], [572, 282]]], ["neck", [[535, 360], [535, 385], [565, 385], [565, 360]]], ["body", [[440, 395], [452, 374], [471, 357], [493, 346], [518, 343], [543, 346], [565, 357], [584, 374], [596, 395], [660, 395], [665, 535], [658, 546], [601, 568], [544, 546], [435, 535], [440, 395]]], ["armL", [[445, 410], [395, 460], [400, 580], [425, 600]]], ["handL", [[415, 605], [442, 605], [442, 628], [415, 628], [415, 605]]], ["armR", [[655, 410], [705, 460], [700, 580], [675, 600]]], ["handR", [[658, 605], [685, 605], [685, 628], [658, 628], [658, 605]]], ["legL", [[505, 575], [500, 710]]], ["footL", [[475, 710], [525, 710]]], ["legR", [[595, 575], [602, 710]]], ["footR", [[575, 710], [625, 710]]]];

module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Paint";
  const OUT = parameters.OUT_DIR || ".";
  let launched = false;

  async function tracePolyline(pl) {
    for (let i = 0; i < pl.length - 1; i++) {
      await driver.drag({ from: { x: pl[i][0], y: pl[i][1] }, to: { x: pl[i + 1][0], y: pl[i + 1][1] } });
      // No pause here — the PowerShell spawn per drag already paces it.
    }
  }

  try {
    log("Launching Paint...");
    await driver.launch("mspaint.exe");
    await driver.pause(3000);
    await driver.focusWindow(WIN);
    await driver.maximizeWindow(WIN);
    await driver.pause(1000);
    launched = true;
    zephyrLog("Launched and maximised Paint.", "Pass");

    log("Detecting Paint UI...");
    await driver.waitForImage("paint-window.png", { timeout: 15000, threshold: 0.7 });

    log("Selecting the brush tool...");
    await driver.clickImage("brush-tool.png", { threshold: 0.7 });
    await driver.pause(1000);
    zephyrLog("Selected the brush tool.", "Pass");

    log("Drawing Marvin — " + PATHS.length + " polylines, ~65 segments...");
    for (const [name, pl] of PATHS) {
      log("  tracing: " + name + " (" + (pl.length - 1) + " segments)");
      await tracePolyline(pl);
    }
    zephyrLog("Finished drawing Marvin.", "Pass");

    try {
      await driver.screenshotWindow(OUT + "/marvin-drawing.png", WIN);
      log("Saved marvin-drawing.png");
    } catch (e) {
      await driver.screenshot(OUT + "/marvin-drawing.png");
      log("Saved full-screen marvin-drawing.png");
    }

    log("PASS: Marvin drawing complete. 'Life? Don't talk to me about life.'");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  } finally {
    // Intentionally NOT closing Paint, so you can see (and save) the drawing.
    if (launched) log("Leaving Paint open so you can admire Marvin.");
  }
};
