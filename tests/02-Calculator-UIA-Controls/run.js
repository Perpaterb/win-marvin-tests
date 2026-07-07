function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: real mouse-clicking of calculator buttons by coordinate.
// App: classic CalcFrame Calculator.
//
// Key fix: the calculator kept dropping BEHIND the Marvin window, so clicks
// landed on the wrong window and the display stayed 0. We now focus + raise the
// calculator immediately before EACH click, so it's guaranteed frontmost when
// the click lands. Result is verified via getControlText(id 150).
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Calculator";
  let launched = false;

  // Window-relative button centres (measured from a 422x636 window screenshot).
  const BTN = {
    "7": { x: 52,  y: 396 },
    "*": { x: 285, y: 452 },
    "9": { x: 208, y: 396 },
    "=": { x: 365, y: 555 },
  };

  async function clickBtn(label) {
    const p = BTN[label];
    if (!p) throw new Error("No coordinate for button " + label);
    // Re-focus the calculator right before the click so it can't be behind
    // another window (e.g. Marvin) when the click fires.
    await driver.focusWindow(WIN);
    await driver.pause(250);
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

    // Bring it to front and clear state.
    await driver.focusWindow(WIN);
    await driver.pause(300);
    log("Clearing calculator state (Escape)...");
    await driver.keyPress("Escape");
    await driver.pause(300);

    log("Computing 7 * 9 = by clicking buttons (re-focusing each time)...");
    await clickBtn("7");
    await clickBtn("*");
    await clickBtn("9");
    await clickBtn("=");
    zephyrLog("Clicked 7 * 9 = via mouse.", "Pass");

    // Re-focus before reading, then verify.
    await driver.focusWindow(WIN);
    await driver.pause(200);
    log("Reading the result display (id 150)...");
    const raw = await driver.getControlText(WIN, { controlId: "150" });
    log("Display reads: " + raw);

    const digits = (raw.match(/\d+/g) || []).join("");
    if (digits !== "63") {
      throw new Error(
        `Expected 63, display read '${raw}'. If it's 0, the calculator was ` +
        `likely still behind another window or a coordinate is off; if it's a ` +
        `different number, a coordinate landed on the wrong button.`
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
