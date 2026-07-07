function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: UI Automation controls — findControl (locate + inspect) and
// getControlText (read a control's value). App: classic CalcFrame Calculator.
//
// What works on this calculator via UIA: locating controls by AutomationId and
// reading the display's value. What does NOT: clickControl on the operator keys
// (they expose no InvokePattern/clickable point — an app limitation). And the
// keys can't be OCR'd either. So this test showcases UIA's strengths: it FINDS
// and inspects the button controls, drives the calc by keyboard, then READS the
// result from the display control to verify it.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Calculator";
  let launched = false;

  try {
    log("Launching Calculator...");
    await driver.launch("calc.exe");
    await driver.pause(2500);
    await driver.focusWindow(WIN);
    await driver.pause(400);
    launched = true;
    zephyrLog("Launched Calculator.", "Pass");

    // --- UIA: locate and inspect controls by AutomationId ---
    // Confirms UI Automation can find the button controls and read their
    // properties (name/class/automationId), even though we can't invoke them.
    log("Inspecting button controls via findControl...");
    const toInspect = [
      { id: "136", label: "digit 7" },
      { id: "135", label: "digit 6" },
      { id: "93",  label: "plus" },
      { id: "121", label: "equals" },
      { id: "150", label: "display" },
    ];
    for (const c of toInspect) {
      const ctrl = await driver.findControl(WIN, { controlId: c.id });
      log(`  ${c.label} (id ${c.id}) -> class='${ctrl.className}' name='${ctrl.name}' autoId='${ctrl.automationId}'`);
    }
    zephyrLog("Located and inspected calculator controls via UIA.", "Pass");

    // --- Drive the calculation by keyboard ---
    // (The operator button controls can't be invoked via UIA, so keyboard is
    // the reliable input path; UIA's job here is reading the result.)
    log("Clearing, then entering 7 + 6 = via keyboard...");
    await driver.keyPress("Escape");
    await driver.pause(300);
    await driver.type("7");
    await driver.pause(150);
    await driver.type("+");
    await driver.pause(150);
    await driver.type("6");
    await driver.pause(150);
    await driver.keyPress("Enter"); // '='
    await driver.pause(500);
    zephyrLog("Entered 7 + 6 = via keyboard.", "Pass");

    // --- UIA: read the result from the display control ---
    log("Reading the result from display control (id 150) via getControlText...");
    const raw = await driver.getControlText(WIN, { controlId: "150" });
    log("Display control value: " + raw);

    const digits = (raw.match(/\d+/g) || []).join("");
    if (digits !== "13") {
      throw new Error(`Expected 13, display control read '${raw}'.`);
    }
    zephyrLog("Verified 7 + 6 = 13 by reading the display control via UIA.", "Pass");

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
