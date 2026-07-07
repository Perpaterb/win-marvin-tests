function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// DISCOVERY TEST — not a real assertion test.
// Purpose: launch Calculator and probe a large list of candidate control
// identifiers (both Names and legacy AutomationIds) so you can see EXACTLY which
// ones exist on your Windows build. Use the results to pin down the identifiers
// used in test 02.
//
// findControl throws when a control isn't found, so each probe is wrapped in a
// try/catch. A "HIT" line means that identifier is valid on your machine.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Calculator";

  // Probe by Name.
  const nameCandidates = [
    "Seven", "7",
    "Six", "6",
    "Plus", "Add", "+",
    "Equals", "Equal", "=",
    "Display", "Result", "Clear", "Clear entry",
    "Minus", "Subtract", "Multiply", "Divide"
  ];

  // Probe by AutomationId (legacy / build-specific).
  const idCandidates = [
    "num7Button", "num6Button",
    "plusButton", "equalButton", "minusButton",
    "multiplyButton", "divideButton", "clearButton",
    "CalculatorResults", "CalculatorExpression"
  ];

  async function probe(locator, label) {
    try {
      const c = await driver.findControl(WIN, locator);
      log(`HIT   ${label} -> name='${c.name}' class='${c.className}' autoId='${c.automationId}'`);
      return true;
    } catch (e) {
      log(`miss  ${label}`);
      return false;
    }
  }

  try {
    log("Launching Calculator...");
    await driver.launch("calc.exe");
    await driver.pause(2500);
    await driver.focusWindow(WIN);
    log("Focused Calculator window.\n");

    log("=== Probing by Name ===");
    let nameHits = 0;
    for (const name of nameCandidates) {
      if (await probe({ name }, `name="${name}"`)) nameHits++;
    }

    log("\n=== Probing by AutomationId ===");
    let idHits = 0;
    for (const controlId of idCandidates) {
      if (await probe({ controlId }, `controlId="${controlId}"`)) idHits++;
    }

    log(`\nSUMMARY: ${nameHits} name hit(s), ${idHits} automationId hit(s).`);
    log("Copy the HIT identifiers into test 02 to make it match your build.");

    // This discovery test always 'passes' as long as it ran — it's for info.
    zephyrLog(`Discovery complete: ${nameHits} name hits, ${idHits} id hits.`, "Pass");

    log("\nClosing Calculator...");
    await driver.focusWindow(WIN);
    await driver.closeWindow();
    await driver.pause(500);
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  }
};
