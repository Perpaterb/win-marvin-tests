function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: reading a UI Automation control (getControlText).
// App: the CLASSIC Win32 Calculator (window class 'CalcFrame').
//
// Discovery findings on this build:
//   - CalcFrame BUTTONS don't reliably support InvokePattern and expose no
//     clickable point, so clickControl fails on them ("no clickable point").
//   - The DISPLAY is a Static control (id 150) whose Name holds the current
//     value, and getControlText reads it cleanly.
//
// So we drive the calculation by KEYBOARD (reliable on this app) and VERIFY the
// result by reading UIA control id 150. This showcases getControlText against a
// real Win32 control without depending on the uncooperative buttons.
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

    // Drive 7 + 6 = via keyboard (reliable on CalcFrame).
    log("Entering 7 + 6 = via keyboard...");
    await driver.type("7");
    await driver.pause(200);
    await driver.type("+");
    await driver.pause(200);
    await driver.type("6");
    await driver.pause(200);
    await driver.keyPress("Enter"); // '=' in Calculator
    await driver.pause(600);
    zephyrLog("Entered 7 + 6 = via keyboard.", "Pass");

    // Verify the result by READING the UIA display control (id 150).
    log("Reading the result display via getControlText (id 150)...");
    const raw = await driver.getControlText(WIN, { controlId: "150" });
    log("Display control reads: " + raw);

    const digits = (raw.match(/\d+/g) || []).join("");
    if (digits !== "13") {
      throw new Error(`Expected result 13, display control read: '${raw}'`);
    }
    zephyrLog("Verified 7 + 6 = 13 by reading UIA control id 150.", "Pass");

    log("PASS: getControlText verification complete.");
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
