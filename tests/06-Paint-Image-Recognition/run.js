function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// DIAGNOSTIC version. Goal: find out whether the brush and colour clicks are
// actually landing on anything. Because brush + black are Paint's defaults, a
// completely failed click looks the same as a working one — so here every
// image click is logged (found? confidence? where?) and a screenshot is saved
// right after the click so you can SEE where the cursor went.
//
// Screenshots land in OUT_DIR as debug-01-brush.png, debug-02-black.png, etc.
// The cursor itself usually isn't captured, so we also log the exact x,y and
// (optionally) you can look at whether the swatch/tool appears highlighted.

const PATHS = [
  ["head", "black", [[475, 265], [497, 226], [535, 211], [565, 211], [603, 226], [625, 265], [625, 330], [588, 349], [512, 349], [475, 330], [475, 265]]],
  ["body", "black", [[440, 395], [489, 370], [550, 365], [611, 370], [660, 395], [665, 535], [594, 572], [506, 572], [435, 535], [440, 395]]],
  ["eyeL", "green", [[534, 290], [523, 304], [511, 301], [506, 290], [517, 276], [529, 279], [534, 290]]],
  ["eyeR", "green", [[594, 290], [583, 304], [571, 301], [566, 290], [577, 276], [589, 279], [594, 290]]],
  ["armL", "red", [[445, 410], [400, 440], [390, 510], [400, 580], [425, 600]]],
  ["armR", "red", [[655, 410], [700, 440], [710, 510], [700, 580], [675, 600]]],
];

const SWATCH = { black: "black.png", green: "green.png", red: "red.png" };

module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Paint";
  const OUT = parameters.OUT_DIR || ".";
  let launched = false;
  let currentColour = null;
  let shotN = 0;

  // Find an image, log the match details, click its center, then screenshot so
  // you can see where it went. Returns the match.
  async function debugClick(imageName, label) {
    shotN += 1;
    const tag = String(shotN).padStart(2, "0");
    let match;
    try {
      match = await driver.findImage(imageName, { threshold: 0.7 });
    } catch (e) {
      log("  [" + tag + "] " + label + " (" + imageName + "): findImage ERROR — " + e.message);
      throw e;
    }
    const conf = match.confidence != null ? match.confidence.toFixed(3) : "?";
    log("  [" + tag + "] " + label + " (" + imageName + "): found=" + match.found +
        " confidence=" + conf +
        " center=" + match.centerX + "," + match.centerY);

    if (!match.found) {
      // Still screenshot so you can see the current UI state.
      try { await driver.screenshot(OUT + "/debug-" + tag + "-" + label + "-NOTFOUND.png"); } catch {}
      throw new Error(label + ": image not found (" + imageName + "), confidence " + conf);
    }

    await driver.mouseClick(match.centerX, match.centerY, "left");
    await driver.pause(400);

    // Screenshot AFTER the click so a highlighted tool/swatch shows the click worked.
    try {
      await driver.screenshot(OUT + "/debug-" + tag + "-" + label + ".png");
      log("       saved debug-" + tag + "-" + label + ".png (clicked " + match.centerX + "," + match.centerY + ")");
    } catch (e) {
      log("       screenshot failed: " + e.message);
    }
    return match;
  }

  async function selectColour(colour) {
    if (colour === currentColour) return;
    await debugClick(SWATCH[colour], colour);
    currentColour = colour;
  }

  async function traceCorners(pl) {
    for (let i = 0; i < pl.length - 1; i++) {
      await driver.drag({
        from: { x: pl[i][0], y: pl[i][1] },
        to: { x: pl[i + 1][0], y: pl[i + 1][1] },
      });
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

    // Baseline screenshot of Paint right after launch, before any clicks.
    try {
      await driver.screenshot(OUT + "/debug-00-launched.png");
      log("Saved debug-00-launched.png (Paint as launched, before any clicks)");
    } catch (e) {
      log("baseline screenshot failed: " + e.message);
    }

    log("Detecting Paint UI...");
    await driver.waitForImage("paint-window.png", { timeout: 15000, threshold: 0.7 });

    log("Clicking brush tool...");
    await debugClick("brush-tool.png", "brush");

    log("Selecting starting colour (black)...");
    await selectColour("black");

    log("Drawing a few shapes with colour switches...");
    for (const [name, colour, pl] of PATHS) {
      await selectColour(colour);
      const t = Date.now();
      await traceCorners(pl);
      log("  drew " + name + " [" + colour + "] — " + (Date.now() - t) + "ms");
    }

    // Final full screenshot of the drawing.
    try {
      await driver.screenshotWindow(OUT + "/marvin-drawing.png", WIN);
      log("Saved marvin-drawing.png");
    } catch (e) {
      await driver.screenshot(OUT + "/marvin-drawing.png");
      log("Saved full-screen marvin-drawing.png");
    }

    log("PASS: diagnostic run complete. Check the debug-*.png screenshots.");
    zephyrLog("Diagnostic run complete.", "Pass");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  } finally {
    if (launched) log("Leaving Paint open.");
  }
};
