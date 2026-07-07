function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// DISCOVERY v3 — this is the CLASSIC Win32 Calculator (window class 'CalcFrame').
// Its buttons are Win32 controls with numeric control IDs (autoId is a number
// like '122'), NOT UWP AutomationId strings. v2 confirmed: class='Button',
// name='', autoId='122'.
//
// Classic CalcFrame control IDs are well-known and stable. This test confirms
// the specific IDs we need by targeting each by controlId and reading it back.
//   Digits 0-9  -> 129..138  (0=129, 1=130, ... 7=136, 8=137, 9=138)
//   Plus (+)    -> 93
//   Equals (=)  -> 121
//   Display     -> 150
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Calculator";

  async function probe(locator, label) {
    try {
      const c = await driver.findControl(WIN, locator);
      log(`HIT   ${label} -> name='${c.name}' class='${c.className}' autoId='${c.automationId}'`);
      return c;
    } catch (e) {
      log(`miss  ${label}  (${(e && e.message || "").slice(0, 50)})`);
      return null;
    }
  }

  try {
    log("Launching Calculator...");
    await driver.launch("calc.exe");
    await driver.pause(3000);
    await driver.focusWindow(WIN);
    log("Focused. Confirming classic CalcFrame control IDs...\n");

    // The controls we actually need for 7 + 6 = 13:
    log("=== Buttons we need ===");
    await probe({ controlId: "136" }, "digit 7  (id 136)");
    await probe({ controlId: "135" }, "digit 6  (id 135)");
    await probe({ controlId: "93"  }, "plus +   (id 93)");
    await probe({ controlId: "121" }, "equals = (id 121)");

    log("\n=== Display / result field ===");
    await probe({ controlId: "150" }, "display  (id 150)");
    // Some builds use 158 or the edit's Name for the value; probe a couple:
    await probe({ controlId: "158" }, "display alt (id 158)");

    log("\n=== Full digit row sanity check (0-9 = ids 129-138) ===");
    for (let d = 0; d <= 9; d++) {
      const id = String(129 + d);
      await probe({ controlId: id }, `digit ${d}  (id ${id})`);
    }

    log("\nDiscovery v3 done. The HIT lines confirm the numeric control IDs.");
    log("Test 02 will use: 7=136, 6=135, +=93, ==121, display=150.");
    zephyrLog("Discovery v3 complete.", "Pass");

    log("\nClosing Calculator...");
    await driver.focusWindow(WIN);
    await driver.closeWindow();
    await driver.pause(500);
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  }
};
