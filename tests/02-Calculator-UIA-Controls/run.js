function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: UI Automation controls (clickControl / getControlText).
// App: the CLASSIC Win32 Calculator (window class 'CalcFrame').
//
// Discovery findings:
//   - Digit buttons (7=136, 6=135) support InvokePattern -> clickControl works.
//   - Operator buttons (+=93, ==121) expose NEITHER InvokePattern NOR a
//     clickable point, so clickControl fails on them ("no clickable point").
//   - Display is a Static control (id 150) whose Name is the current value.
//
// So we click the DIGITS via clickControl (showcasing UIA), send the OPERATORS
// via keyboard, and verify the result by reading control 150. Hybrid, reliable.
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

    // Clear any leftover value from a previous run.
    log("Clearing calculator state (Escape)...");
    await driver.keyPress("Escape");
    await driver.pause(300);

    // Digit 7 via UIA control (Invoke works on digit buttons).
    log("Clicking digit 7 via clickControl (id 136)...");
    await driver.clickControl(WIN, { controlId: "136" });
    await driver.pause(300);
    zephyrLog("Clicked digit 7 via UIA control.", "Pass");

    // Operator '+' via keyboard (the button has no clickable point).
    log("Sending '+' via keyboard...");
    await driver.type("+");
    await driver.pause(300);

    // Digit 6 via UIA control.
    log("Clicking digit 6 via clickControl (id 135)...");
    await driver.clickControl(WIN, { controlId: "135" });
    await driver.pause(300);
    zephyrLog("Clicked digit 6 via UIA control.", "Pass");

    // Equals via keyboard (Enter = '=').
    log("Sending '=' via keyboard (Enter)...");
    await driver.keyPress("Enter");
    await driver.pause(500);
    zephyrLog("Submitted the calculation.", "Pass");

    // Read the result from the display Static control (id 150).
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
