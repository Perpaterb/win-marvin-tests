function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Find each swatch image, click the CENTER of where it's found, screenshot to
// confirm. Exactly that — no coordinates, no colour logic. The matcher finds
// the region that looks like your image and clicks its middle.
//
// The ONLY requirement for this to work: each image must match its own palette
// cell and nothing else. Two rules for the crops:
//   1. The target colour cell must be at the CENTER of the image (that's where
//      the click lands).
//   2. The image must include enough surrounding cells that it can't match a
//      different spot (e.g. a plain black crop wrongly matches the big Color 1
//      box). A few neighbouring cells around the target make it unique.
//
// This probe clicks each swatch and screenshots after, so you can see whether
// the click landed on the right cell (watch the Color 1 box change).

const SWATCH = { black: "black.png", red: "red.png", green: "green.png" };

module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Paint";
  const OUT = parameters.OUT_DIR || ".";
  const THRESHOLD = parameters.SWATCH_THRESHOLD != null ? parameters.SWATCH_THRESHOLD : 0.6;
  let launched = false;
  let n = 0;

  async function findClickShoot(colour) {
    const swatch = SWATCH[colour];
    n += 1;
    const tag = String(n).padStart(2, "0");
    let match;
    try {
      match = await driver.findImage(swatch, { threshold: THRESHOLD });
    } catch (e) {
      log("  " + colour + " (" + swatch + "): findImage error — " + e.message);
      return;
    }
    const conf = match.confidence != null ? match.confidence.toFixed(3) : "?";
    if (!match.found) {
      log("  " + colour + " (" + swatch + "): NOT FOUND at threshold " + THRESHOLD + " (conf " + conf + ")");
      return;
    }
    log("  " + colour + " (" + swatch + "): found conf=" + conf + " center=" + match.centerX + "," + match.centerY + " -> clicking center");
    await driver.mouseClick(match.centerX, match.centerY, "left");
    await driver.pause(400);
    try {
      await driver.screenshot(OUT + "/swatch-" + tag + "-" + colour + ".png");
      log("     saved swatch-" + tag + "-" + colour + ".png (check Color 1 box)");
    } catch (e) {
      log("     screenshot failed: " + e.message);
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

    log("Detecting Paint UI...");
    await driver.waitForImage("paint-window.png", { timeout: 15000, threshold: 0.7 });

    log("Selecting the brush tool...");
    await driver.clickImage("brush-tool.png", { threshold: 0.7 });
    await driver.pause(1000);

    log("Probing swatches — find image, click center, screenshot:");
    for (const colour of ["black", "red", "green"]) {
      await findClickShoot(colour);
    }

    zephyrLog("Swatch probe complete.", "Pass");
    log("PASS: check the swatch-*.png shots — did Color 1 change to each colour?");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  } finally {
    if (launched) log("Leaving Paint open.");
  }
};
