function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: UI Automation (findControl / clickControl / getControlText).
// App: Windows Calculator. Buttons and the result display are all UIA controls
// with stable AutomationIds, so we can drive it without any pixel coordinates.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Calculator";

  try {
    log("Launching Calculator...");
    await driver.launch("calc.exe");
    await driver.pause(2500);
    await driver.focusWindow(WIN);
    zephyrLog("Launched Calculator.", "Pass");

    // Calculator buttons expose AutomationIds like "num7Button", "plusButton",
    // "equalButton". We invoke them by control rather than clicking coordinates.
    log("Entering 7 + 6 = using UIA controls...");
    await driver.clickControl(WIN, { controlId: "num7Button" });
    await driver.pause(300);
    await driver.clickControl(WIN, { controlId: "plusButton" });
    await driver.pause(300);
    await driver.clickControl(WIN, { controlId: "num6Button" });
    await driver.pause(300);
    await driver.clickControl(WIN, { controlId: "equalButton" });
    await driver.pause(500);
    zephyrLog("Pressed 7 + 6 = via UIA controls.", "Pass");

    // Read the result out of the display control and verify it.
    log("Reading the result display...");
    const raw = await driver.getControlText(WIN, { controlId: "CalculatorResults" });
    log("Display reads: " + raw);

    // The display Name is typically like "Display is 13".
    const digits = (raw.match(/\d+/g) || []).join("");
    if (digits !== "13") {
      throw new Error(`Expected result 13, display read: '${raw}'`);
    }
    zephyrLog("Verified 7 + 6 = 13 from the result control.", "Pass");

    log("Closing Calculator...");
    await driver.focusWindow(WIN);
    await driver.closeWindow();
    await driver.pause(500);
    zephyrLog("Closed Calculator.", "Pass");

    log("PASS: UI Automation control test complete.");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  }
};
