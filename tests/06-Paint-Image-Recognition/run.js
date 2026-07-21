function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// FASTER Marvin with NO driver changes.
//
// Your slowness is per-call overhead: every driver.drag() spawns a PowerShell
// process carrying ~630ms of Start-Sleep, regardless of how long the stroke is.
// A 10px drag and a 500px drag cost the same. So the ONLY test-side lever is
// to make FEWER drag calls.
//
// driver.drag() already interpolates smoothly between its own from/to, so we
// don't need every intermediate point as its own drag. We keep only the
// "corner" points where the line actually changes direction and let drag draw
// each straight run in a single call. Curves are simplified to a few chords.
//
// This cuts the original ~230 segment-drags down to ~70 corner-drags — roughly
// a 3x fewer PowerShell spawns, so ~3x faster, with zero rebuild.
//
// Each shape below is a REDUCED point list: only turn points, not every sample.
const PATHS = [
  // head: octagon-ish top + straight sides + flat-ish bottom (8 chords vs 33)
  ["head", [[475, 265], [497, 226], [535, 211], [565, 211], [603, 226], [625, 265], [625, 330], [588, 349], [512, 349], [475, 330], [475, 265]]],
  // eyes: hexagon approximations (6 chords vs 15) — still read as round at size
  ["eyeL", [[534, 290], [523, 304], [511, 301], [506, 290], [517, 276], [529, 279], [534, 290]]],
  ["eyeR", [[594, 290], [583, 304], [571, 301], [566, 290], [577, 276], [589, 279], [594, 290]]],
  // neck: 3 straight sides, unchanged
  ["neck", [[535, 360], [535, 385], [565, 385], [565, 360]]],
  // body: barrel shape reduced to top curve corners + straight sides + bottom curve (10 chords vs 37)
  ["body", [[440, 395], [489, 370], [550, 365], [611, 370], [660, 395], [665, 535], [594, 572], [506, 572], [435, 535], [440, 395]]],
  // arms: already sparse, keep as-is
  ["armL", [[445, 410], [400, 440], [390, 510], [400, 580], [425, 600]]],
  ["armR", [[655, 410], [700, 440], [710, 510], [700, 580], [675, 600]]],
  // hands: hexagon approximations (6 chords vs 15)
  ["handL", [[448, 615], [432, 633], [416, 629], [408, 615], [424, 597], [440, 601], [448, 615]]],
  ["handR", [[692, 615], [676, 633], [660, 629], [652, 615], [668, 597], [684, 601], [692, 615]]],
  // legs + feet: straight lines, unchanged
  ["legL", [[505, 575], [500, 650], [498, 710]]],
  ["footL", [[475, 710], [525, 710]]],
  ["legR", [[595, 575], [600, 650], [602, 710]]],
  ["footR", [[575, 710], [625, 710]]],
];

module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Paint";
  const OUT = parameters.OUT_DIR || ".";
  let launched = false;

  // One drag per straight run between consecutive corner points. Uses ONLY
  // driver.drag — no new driver methods, no rebuild. Fewer, longer drags.
  async function traceCorners(pl) {
    for (let i = 0; i < pl.length - 1; i++) {
      await driver.drag({
        from: { x: pl[i][0], y: pl[i][1] },
        to: { x: pl[i + 1][0], y: pl[i + 1][1] },
      });
    }
  }

  // Count total drag calls so you can see the reduction in the log.
  const totalDrags = PATHS.reduce((n, [, pl]) => n + (pl.length - 1), 0);

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

    log("Drawing Marvin — " + totalDrags + " drag calls total (was ~230)...");
    const tStart = Date.now();
    for (const [name, pl] of PATHS) {
      const t = Date.now();
      await traceCorners(pl);
      log("  " + name + " (" + (pl.length - 1) + " drags) — " + (Date.now() - t) + "ms");
    }
    log("Total draw time: " + (Date.now() - tStart) + "ms");
    zephyrLog("Finished drawing Marvin.", "Pass");

    try {
      await driver.screenshotWindow(OUT + "/marvin-drawing.png", WIN);
      log("Saved marvin-drawing.png");
    } catch (e) {
      await driver.screenshot(OUT + "/marvin-drawing.png");
      log("Saved full-screen marvin-drawing.png");
    }

    log("PASS: Marvin drawing complete. Here I am, brain the size of a planet...");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  } finally {
    if (launched) log("Leaving Paint open so you can see the drawing.");
  }
};
