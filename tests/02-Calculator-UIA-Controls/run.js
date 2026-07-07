function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: UI Automation (findControl / clickControl / getControlText).
// App: Windows Calculator.
//
// IMPORTANT: Calculator's control identifiers differ across Windows versions.
// Older builds expose AutomationIds like "num7Button" / "plusButton".
// Windows 11's Calculator often exposes buttons only by Name ("Seven", "Plus",
// "Equals") and the display by Name too. This test targets by NAME, which is the
// most stable option, and falls back gracefully. If a name doesn't match on your
// build, run the discovery block (see DISCOVERY note below) to see real names.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Calculator";

  // Helper: try clicking a control by name, and if that throws, try the next
  // candidate. Lets us tolerate naming differences between Windows versions.
  async function clickByAnyName(names) {
    let lastErr;
    for (const name of names) {
      try {
        await driver.clickControl(WIN, { name });
        return name;
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(
      "None of these control names were found: " + names.join(", ") +
      " (last error: " + (lastErr && lastErr.message) + ")"
    );
  }

  try {
    log("Launching Calculator...");
    await driver.launch("calc.exe");
    await driver.pause(2500);
    await driver.focusWindow(WIN);
    zephyrLog("Launched Calculator.", "Pass");

    // ---- DISCOVERY (optional) --------------------------------------------
    // If the clicks below fail on your build, uncomment this to confirm the
    // window is found and inspect a known control. findControl throws if not
    // found, so wrapping in try/catch tells you which identifiers are valid.
    // try {
    //   const c = await driver.findControl(WIN, { name: "Seven" });
    //   log("Found 'Seven' control: " + JSON.stringify(c));
    // } catch (e) { log("'Seven' not found: " + e.message); }
    // ----------------------------------------------------------------------

    log("Entering 7 + 6 = using UIA controls (by Name)...");
    const seven = await clickByAnyName(["Seven", "7"]);
    log("Clicked digit control: " + seven);
    await driver.pause(300);

    await clickByAnyName(["Plus", "Add", "+"]);
    await driver.pause(300);

    await clickByAnyName(["Six", "6"]);
    await driver.pause(300);

    await clickByAnyName(["Equals", "Equal", "="]);
    await driver.pause(600);
    zephyrLog("Pressed 7 + 6 = via UIA controls.", "Pass");

    // Read the result. Windows 11's display control is named "Display" (its
    // value reads like "Display is 13"); older builds use AutomationId
    // "CalculatorResults". Try Name first, then the legacy AutomationId.
    log("Reading the result display...");
    let raw;
    try {
      raw = await driver.getControlText(WIN, { name: "Display" });
    } catch (e) {
      log("'Display' by name not found, trying legacy AutomationId...");
      raw = await driver.getControlText(WIN, { controlId: "CalculatorResults" });
    }
    log("Display reads: " + raw);

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
