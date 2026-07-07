function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: real mouse-clicking of UI buttons by coordinate, verified by
// reading a UIA control. App: classic CalcFrame Calculator.
//
// Why coordinates: this calculator's number/operator keys are owner-drawn — they
// expose NO InvokePattern/clickable point (so clickControl fails) and NEITHER
// Tesseract NOR Windows OCR can read the digit glyphs (only text labels like
// MR/MS). So we click by measured window-relative coordinates. Coordinates were
// measured from a screenshot of the calculator window (~433px wide). They are
// relative to the window's top-left, so they survive the window moving.
//
// Crucially, we VERIFY the result via getControlText(id 150) after clicking, so
// if a coordinate is off (e.g. window renders at a different size), the test
// FAILS LOUDLY rather than silently mis-clicking.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Calculator";
  let launched = false;

  // Window-relative button centres, measured from the calc.png screenshot.
  const BTN = {
    "7": { x: 52,  y: 396 },
    "*": { x: 285, y: 452 },
    "9": { x: 208, y: 396 },
    "=": { x: 365, y: 555 },
  };

  async function clickBtn(label) {
    const p = BTN[label];
    if (!p) throw new Error("No coordinate for button " + label);
    log(`Clicking '${label}' at window-relative (${p.x}, ${p.y})...`);
    await driver.mouseClick(p.x, p.y, "left", { relativeTo: WIN });
    await driver.pause(400);
  }

  try {
    log("Launching Calculator...");
    await driver.launch("calc.exe");
    await driver.pause(2500);
    await driver.focusWindow(WIN);
    await driver.pause(400);
    launched = true;
    zephyrLog("Launched Calculator.", "Pass");

    // Clear any prior state.
    log("Clearing calculator state (Escape)...");
    await driver.keyPress("Escape");
    await driver.pause(300);

    // Compute 7 * 9 = 63 by clicking the buttons.
    log("Computing 7 * 9 = by clicking buttons...");
    await clickBtn("7");
    await clickBtn("*");
    await clickBtn("9");
    await clickBtn("=");
    zephyrLog("Clicked 7 * 9 = via mouse.", "Pass");

    // Verify the result by reading the display control.
    log("Reading the result display (id 150)...");
    const raw = await driver.getControlText(WIN, { controlId: "150" });
    log("Display reads: " + raw);

    const digits = (raw.match(/\d+/g) || []).join("");
    if (digits !== "63") {
      throw new Error(
        `Expected 63, display read '${raw}'. If the display shows a different ` +
        `number, a button coordinate is off (the window may render at a ` +
        `different size than the screenshot). Adjust BTN coordinates.`
      );
    }
    zephyrLog("Verified 7 * 9 = 63 by clicking buttons and reading the display.", "Pass");

    log("PASS: Mouse-click calculator test complete.");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  } finally {
    if (launched) {
      try {
        log("Closing Calculator...");
        await driver.focusWindow(WIN);
        await driver.closeWindow();
        await driver.pause(500);
      } catch (closeErr) {
        log("Warning: could not close Calculator cleanly: " + (closeErr && closeErr.message));
      }
    }
  }
};
