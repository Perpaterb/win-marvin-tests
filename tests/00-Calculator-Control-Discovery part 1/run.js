function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// DISCOVERY v2 — locate WHERE Calculator's controls live.
// v1 found zero controls under a window matching "Calculator", which means the
// buttons aren't reachable as descendants of that top-level window (common on
// Win11: calc.exe launches CalculatorApp.exe; the UIA tree can sit elsewhere).
//
// This version tests several hypotheses so we learn the real structure:
//   A) Are the buttons reachable from the DESKTOP ROOT (windowTitle = null)?
//   B) Does a different window title ("Calculator" exact vs substring) help?
//   C) Can we at least find ANY named container (e.g. the app frame)?
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  async function probe(windowTitle, locator, label) {
    try {
      const c = await driver.findControl(windowTitle, locator);
      log(`HIT   ${label} -> name='${c.name}' class='${c.className}' autoId='${c.automationId}'`);
      return c;
    } catch (e) {
      log(`miss  ${label}  (${(e && e.message || "").slice(0, 60)})`);
      return null;
    }
  }

  try {
    log("Launching Calculator...");
    await driver.launch("calc.exe");
    await driver.pause(3000);
    await driver.focusWindow("Calculator");
    const title = await driver.getWindowTitle();
    log("Focused window title reported as: '" + title + "'\n");

    // --- Hypothesis A: search from the DESKTOP ROOT (windowTitle = null) ---
    log("=== A) From desktop root (windowTitle = null) ===");
    await probe(null, { name: "Seven" }, "root name='Seven'");
    await probe(null, { name: "Five" }, "root name='Five'");
    await probe(null, { controlId: "num7Button" }, "root autoId='num7Button'");
    // The Calculator app frame / results are often findable from root:
    await probe(null, { name: "Calculator" }, "root name='Calculator'");
    await probe(null, { className: "ApplicationFrameWindow" }, "root class='ApplicationFrameWindow'");
    await probe(null, { className: "Windows.UI.Core.CoreWindow" }, "root class='CoreWindow'");

    // --- Hypothesis B: exact reported title instead of substring "Calculator" ---
    log("\n=== B) Using the exact reported window title ===");
    if (title && title.trim()) {
      await probe(title, { name: "Seven" }, `title='${title}' name='Seven'`);
      await probe(title, { name: "Five" }, `title='${title}' name='Five'`);
      await probe(title, { className: "Button" }, `title='${title}' class='Button'`);
    } else {
      log("(no usable window title reported; skipping)");
    }

    // --- Hypothesis C: can we find ANY generic control under the window? ---
    log("\n=== C) Generic containers under 'Calculator' ===");
    await probe("Calculator", { className: "Button" }, "class='Button'");
    await probe("Calculator", { className: "Text" }, "class='Text'");
    await probe("Calculator", { className: "NamedContainerAutomationPeer" }, "class='NamedContainer...'");
    await probe("Calculator", { name: "Number pad" }, "name='Number pad'");
    await probe("Calculator", { name: "Standard" }, "name='Standard'");

    log("\nDiscovery v2 done. Look for any HIT lines above — they tell us which");
    log("windowTitle + locator combination actually reaches Calculator's controls.");
    log("If EVERYTHING missed, UIA can't see this Calculator and we should drive");
    log("it by keyboard + OCR instead (see the alternative test).");

    zephyrLog("Discovery v2 complete.", "Pass");

    log("\nClosing Calculator...");
    await driver.focusWindow("Calculator");
    await driver.closeWindow();
    await driver.pause(500);
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  }
};
