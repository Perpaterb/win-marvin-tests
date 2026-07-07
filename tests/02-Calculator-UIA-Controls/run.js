function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: UI Automation controls (findControl / clickControl /
// getControlText). App: the CLASSIC Win32 Calculator (window class 'CalcFrame').
//
// Confirmed via discovery: buttons are Win32 controls addressed by numeric
// control ID, and the display is a Static control (id 150) whose Name holds the
// current value. No coordinates, no OCR — pure control automation.
//   7 = 136, 6 = 135, + = 93, = = 121, display = 150, clear (C) = 82
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Calculator";
  let launched = false;

  try {
    log("Launching Calculator...");
    await driver.launch("calc.exe");
    await driver.pause(2500);
    await driver.focusWindow(WIN);
    launched = true;
    zephyrLog("Launched Calculator.", "Pass");

    // Clear any leftover value from a previous run so state can't carry over.
    log("Clearing calculator state (Escape)...");
    await driver.keyPress("Escape");
    await driver.pause(300);

    log("Entering 7 + 6 = using control IDs...");
    await driver.clickControl(WIN, { controlId: "136" }); // 7
    await driver.pause(300);
    await driver.clickControl(WIN, { controlId: "93" });  // +
    await driver.pause(300);
    await driver.clickControl(WIN, { controlId: "135" }); // 6
    await driver.pause(300);
    await driver.clickControl(WIN, { controlId: "121" }); // =
    await driver.pause(500);
    zephyrLog("Pressed 7 + 6 = via UIA controls.", "Pass");

    // The display (id 150) is a Static control whose Name is the value.
    log("Reading the result display (id 150)...");
    const raw = await driver.getControlText(WIN, { controlId: "150" });
    log("Display reads: " + raw);

    const digits = (raw.match(/\d+/g) || []).join("");
    if (digits !== "13") {
      throw new Error(`Expected result 13, display read: '${raw}'`);
    }
    zephyrLog("Verified 7 + 6 = 13 from the result control.", "Pass");

    log("PASS: UI Automation control test complete.");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  } finally {
    // Always close Calculator, whether the test passed or failed.
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
