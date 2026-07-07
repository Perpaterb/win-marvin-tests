function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: OCR — readText and waitForText. App: Calculator.
// Unlike test 02 (which reads controls), this test *sees* the screen: it drives
// the calculator by keyboard, then reads the result back with OCR, proving the
// vision path works even for apps that don't expose clean UIA controls.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Calculator";

  try {
    log("Launching Calculator...");
    await driver.launch("calc.exe");
    await driver.pause(2500);
    await driver.focusWindow(WIN);
    await driver.maximizeWindow(WIN);
    await driver.pause(800);
    zephyrLog("Launched and maximised Calculator.", "Pass");

    // Drive it by keyboard so this test has no dependency on control IDs.
    log("Typing 8 * 9 = via the keyboard...");
    await driver.type("8");
    await driver.pause(200);
    await driver.type("*");
    await driver.pause(200);
    await driver.type("9");
    await driver.pause(200);
    await driver.keyPress("Enter"); // '=' in Calculator
    await driver.pause(800);
    zephyrLog("Entered 8 * 9 = via keyboard.", "Pass");

    // OCR the whole Calculator window and look for the answer, 72.
    log("Running OCR over the Calculator window...");
    const ocr = await driver.readText(null, { /* whole screen */ });
    log("OCR confidence: " + ocr.confidence);
    log("OCR text:\n" + ocr.text);

    // waitForText polls OCR until the string shows up (or times out).
    log("Waiting for '72' to appear on screen via OCR...");
    await driver.waitForText("72", null, { timeout: 8000, interval: 1000 });
    zephyrLog("OCR confirmed the result 72 on screen.", "Pass");

    log("Closing Calculator...");
    await driver.focusWindow(WIN);
    await driver.closeWindow();
    await driver.pause(500);
    zephyrLog("Closed Calculator.", "Pass");

    log("PASS: OCR test complete.");
    log("NOTE: OCR reads whatever is on screen. If '72' isn't found, make sure");
    log("no other window is covering the calculator and the display is visible.");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  }
};
