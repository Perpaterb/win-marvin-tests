function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Marvin in colour, using FIXED palette coordinates for colour selection.
//
// Colour swatches are plain filled squares — template matching can't tell them
// apart (it keys on shape/detail, not colour), so all three matched the same
// cell. The palette doesn't move, so we click its cells by fixed screen
// coordinates instead. Brush selection still uses clickImage because the brush
// icon has real detail and matched at confidence 1.000.
//
// Palette cell centers (read from debug-00-launched.png):
const COLOUR_XY = {
  black: { x: 764, y: 63 },
  red:   { x: 829, y: 63 },
  green: { x: 849, y: 63 },
};

const PATHS = [
  ["head", "black", [[475, 265], [497, 226], [535, 211], [565, 211], [603, 226], [625, 265], [625, 330], [588, 349], [512, 349], [475, 330], [475, 265]]],
  ["body", "black", [[440, 395], [489, 370], [550, 365], [611, 370], [660, 395], [665, 535], [594, 572], [506, 572], [435, 535], [440, 395]]],
  ["neck", "black", [[535, 360], [535, 385], [565, 385], [565, 360]]],
  ["eyeL", "green", [[534, 290], [523, 304], [511, 301], [506, 290], [517, 276], [529, 279], [534, 290]]],
  ["eyeR", "green", [[594, 290], [583, 304], [571, 301], [566, 290], [577, 276], [589, 279], [594, 290]]],
  ["handL", "green", [[448, 615], [432, 633], [416, 629], [408, 615], [424, 597], [440, 601], [448, 615]]],
  ["handR", "green", [[692, 615], [676, 633], [660, 629], [652, 615], [668, 597], [684, 601], [692, 615]]],
  ["armL", "red", [[445, 410], [400, 440], [390, 510], [400, 580], [425, 600]]],
  ["armR", "red", [[655, 410], [700, 440], [710, 510], [700, 580], [675, 600]]],
  ["legL", "red", [[505, 575], [500, 650], [498, 710]]],
  ["footL", "red", [[475, 710], [525, 710]]],
  ["legR", "red", [[595, 575], [600, 650], [602, 710]]],
  ["footR", "red", [[575, 710], [625, 710]]],
];

module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Paint";
  const OUT = parameters.OUT_DIR || ".";
  // Set VERIFY_SHOTS=true to save a screenshot after each colour click so you
  // can confirm the right cell was selected.
  const VERIFY_SHOTS = parameters.VERIFY_SHOTS === true;
  let launched = false;
  let currentColour = null;
  let shotN = 0;

  // Select a colour by clicking its fixed palette coordinate. No image match.
  async function selectColour(colour) {
    if (colour === currentColour) return;
    const xy = COLOUR_XY[colour];
    if (!xy) throw new Error("No coordinate mapped for colour: " + colour);
    log("  colour -> " + colour + " (click " + xy.x + "," + xy.y + ")");
    await driver.mouseClick(xy.x, xy.y, "left");
    await driver.pause(300);
    if (VERIFY_SHOTS) {
      shotN += 1;
      const tag = String(shotN).padStart(2, "0");
      try {
        await driver.screenshot(OUT + "/colour-" + tag + "-" + colour + ".png");
        log("       saved colour-" + tag + "-" + colour + ".png");
      } catch (e) {
        log("       verify screenshot failed: " + e.message);
      }
    }
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

  const totalDrags = PATHS.reduce((n, [, , pl]) => n + (pl.length - 1), 0);

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

    // Start on black explicitly.
    log("Selecting starting colour (black)...");
    await selectColour("black");
    zephyrLog("Selected starting colour black.", "Pass");

    log("Drawing Marvin — " + totalDrags + " drags, colours black/green/red...");
    const tStart = Date.now();
    for (const [name, colour, pl] of PATHS) {
      await selectColour(colour);
      const t = Date.now();
      await traceCorners(pl);
      log("  " + name + " [" + colour + "] (" + (pl.length - 1) + " drags) — " + (Date.now() - t) + "ms");
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
