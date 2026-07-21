function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Draws Marvin (Hitchhiker's Guide) in Paint as line-art.
// Each polyline is drawn with ONE mouse-down/up and cheap moves in between,
// instead of one drag per segment. That collapses the per-segment VM
// round-trips (down/move/up each time) into a single press per shape,
// which is where nearly all the time was going.
//
const PATHS = [["head", [[475, 265], [476, 254], [481, 244], [488, 234], [497, 226], [508, 219], [521, 214], [535, 211], [550, 210], [565, 211], [579, 214], [592, 219], [603, 226], [612, 234], [619, 244], [624, 254], [625, 265], [625, 265], [625, 330], [625, 330], [622, 336], [615, 341], [603, 346], [588, 349], [569, 351], [550, 352], [531, 351], [512, 349], [497, 346], [485, 341], [478, 336], [475, 330], [475, 330], [475, 265]]], ["eyeL", [[534, 290], [533, 296], [529, 301], [523, 304], [517, 304], [511, 301], [507, 296], [506, 290], [507, 284], [511, 279], [517, 276], [523, 276], [529, 279], [533, 284], [534, 290]]], ["eyeR", [[594, 290], [593, 296], [589, 301], [583, 304], [577, 304], [571, 301], [567, 296], [566, 290], [567, 284], [571, 279], [577, 276], [583, 276], [589, 279], [593, 284], [594, 290]]], ["neck", [[535, 360], [535, 385], [565, 385], [565, 360]]], ["body", [[440, 395], [442, 389], [448, 384], [459, 378], [472, 374], [489, 370], [508, 367], [529, 366], [550, 365], [571, 366], [592, 367], [611, 370], [628, 374], [641, 378], [652, 384], [658, 389], [660, 395], [660, 395], [665, 535], [665, 535], [663, 543], [656, 550], [646, 557], [631, 563], [614, 568], [594, 572], [572, 574], [550, 575], [528, 574], [506, 572], [486, 568], [469, 563], [454, 557], [444, 550], [437, 543], [435, 535], [435, 535], [440, 395]]], ["armL", [[445, 410], [400, 440], [390, 510], [400, 580], [425, 600]]], ["handL", [[448, 615], [446, 623], [440, 629], [432, 633], [424, 633], [416, 629], [410, 623], [408, 615], [410, 607], [416, 601], [424, 597], [432, 597], [440, 601], [446, 607], [448, 615]]], ["armR", [[655, 410], [700, 440], [710, 510], [700, 580], [675, 600]]], ["handR", [[692, 615], [690, 623], [684, 629], [676, 633], [668, 633], [660, 629], [654, 623], [652, 615], [654, 607], [660, 601], [668, 597], [676, 597], [684, 601], [690, 607], [692, 615]]], ["legL", [[505, 575], [500, 650], [498, 710]]], ["footL", [[475, 710], [525, 710]]], ["legR", [[595, 575], [600, 650], [602, 710]]], ["footR", [[575, 710], [625, 710]]]];

module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Paint";
  const OUT = parameters.OUT_DIR || ".";
  // Optional knobs. Set FAST_STROKE=false to force the old drag-per-segment
  // path if the mouse primitives misbehave on a given VM.
  const USE_FAST_STROKE = parameters.FAST_STROKE !== false;
  const SEG_PAUSE = parameters.SEG_PAUSE != null ? parameters.SEG_PAUSE : 0;
  const PATH_PAUSE = parameters.PATH_PAUSE != null ? parameters.PATH_PAUSE : 20;

  let launched = false;

  // Detect whether the driver exposes low-level mouse primitives. If it does,
  // we press once, glide through every point, and release once.
  const hasMousePrimitives =
    typeof driver.mouseDown === "function" &&
    typeof driver.mouseUp === "function" &&
    (typeof driver.mouseMove === "function" || typeof driver.moveMouse === "function");

  const moveMouse = async (pt) => {
    if (typeof driver.mouseMove === "function") return driver.mouseMove(pt);
    return driver.moveMouse(pt);
  };

  // Fast path: single down/up per polyline.
  async function strokePolyline(pl) {
    await moveMouse({ x: pl[0][0], y: pl[0][1] });
    await driver.mouseDown();
    for (let i = 1; i < pl.length; i++) {
      await moveMouse({ x: pl[i][0], y: pl[i][1] });
      if (SEG_PAUSE) await driver.pause(SEG_PAUSE);
    }
    await driver.mouseUp();
  }

  // Fallback path: chained short drags (the original technique), minus the
  // heavy per-segment pause.
  async function dragPolyline(pl) {
    for (let i = 0; i < pl.length - 1; i++) {
      const from = { x: pl[i][0], y: pl[i][1] };
      const to = { x: pl[i + 1][0], y: pl[i + 1][1] };
      await driver.drag({ from, to });
      if (SEG_PAUSE) await driver.pause(SEG_PAUSE);
    }
  }

  const tracePolyline =
    USE_FAST_STROKE && hasMousePrimitives ? strokePolyline : dragPolyline;

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

    log(
      "Drawing Marvin — " +
        PATHS.length +
        " polylines using the " +
        (tracePolyline === strokePolyline ? "fast stroke" : "chained drag") +
        " method..."
    );

    for (const [name, pl] of PATHS) {
      log("  tracing: " + name + " (" + (pl.length - 1) + " segments)");
      await tracePolyline(pl);
      if (PATH_PAUSE) await driver.pause(PATH_PAUSE);
    }
    zephyrLog("Finished drawing Marvin.", "Pass");

    // Save a screenshot of the result.
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
    if (launched) {
      log("Leaving Paint open so you can see the drawing.");
      // Not closing — so you can admire (or save) Marvin.
    }
  }
};
