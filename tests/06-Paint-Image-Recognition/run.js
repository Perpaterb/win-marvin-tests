function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Minimal Paint test for timing experiments.
// Draws one small box (4 sides) and nothing else, timing every driver call
// so you can see exactly where the ~1s floor is coming from and try to kill it.
//
// A box is just 4 corners. Change DRAW_METHOD to compare approaches without
// waiting for a full drawing each run.

const BOX = [
  [500, 300], // top-left
  [650, 300], // top-right
  [650, 450], // bottom-right
  [500, 450], // bottom-left
  [500, 300], // back to start
];

module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Paint";
  const OUT = parameters.OUT_DIR || ".";
  // "stroke"  = one mouseDown, glide corners, one mouseUp
  // "drag"    = one driver.drag per side
  // "click"   = just click each corner (no lines) — fastest possible baseline
  const DRAW_METHOD = parameters.DRAW_METHOD || "stroke";

  // Time any async driver call and log how long it took.
  async function timed(label, fn) {
    const t = Date.now();
    const r = await fn();
    log("  [" + (Date.now() - t) + "ms] " + label);
    return r;
  }

  const moveMouse = async (pt) => {
    if (typeof driver.mouseMove === "function") return driver.mouseMove(pt);
    if (typeof driver.moveMouse === "function") return driver.moveMouse(pt);
    throw new Error("no mouseMove/moveMouse on driver");
  };

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

    log("Selecting the brush tool...");
    await driver.clickImage("brush-tool.png", { threshold: 0.7 });
    await driver.pause(1000);
    zephyrLog("Selected the brush tool.", "Pass");

    log("Drawing a box using method: " + DRAW_METHOD);
    const tStart = Date.now();

    if (DRAW_METHOD === "stroke") {
      await timed("mouseMove -> start", () => moveMouse({ x: BOX[0][0], y: BOX[0][1] }));
      await timed("mouseDown", () => driver.mouseDown());
      for (let i = 1; i < BOX.length; i++) {
        await timed("mouseMove corner " + i, () => moveMouse({ x: BOX[i][0], y: BOX[i][1] }));
      }
      await timed("mouseUp", () => driver.mouseUp());
    } else if (DRAW_METHOD === "drag") {
      for (let i = 0; i < BOX.length - 1; i++) {
        const from = { x: BOX[i][0], y: BOX[i][1] };
        const to = { x: BOX[i + 1][0], y: BOX[i + 1][1] };
        await timed("drag side " + (i + 1), () => driver.drag({ from, to }));
      }
    } else if (DRAW_METHOD === "click") {
      for (let i = 0; i < BOX.length; i++) {
        await timed("click corner " + i, () => driver.click({ x: BOX[i][0], y: BOX[i][1] }));
      }
    } else {
      throw new Error("unknown DRAW_METHOD: " + DRAW_METHOD);
    }

    log("Total draw time: " + (Date.now() - tStart) + "ms");
    zephyrLog("Finished drawing box.", "Pass");

    try {
      await driver.screenshotWindow(OUT + "/box-drawing.png", WIN);
      log("Saved box-drawing.png");
    } catch (e) {
      await driver.screenshot(OUT + "/box-drawing.png");
      log("Saved full-screen box-drawing.png");
    }

    log("PASS: box complete.");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  } finally {
    if (launched) log("Leaving Paint open.");
  }
};
