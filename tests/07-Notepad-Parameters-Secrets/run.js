function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: user parameters + injected secrets. App: Notepad.
//
// This test reads a user-supplied parameter (GREETING) and a secret
// (DEMO_SECRET, added via the Secrets Manager), types them into Notepad, then
// reads them back via the clipboard to prove both values arrived in the
// parameters object. Secrets are injected by name into `parameters`.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Notepad";
  const greeting = parameters.GREETING || "Hello from Marvin";
  const secret = parameters.DEMO_SECRET; // set this in the Secrets Manager

  try {
    if (!secret) {
      log("WARNING: DEMO_SECRET is not set. Add it in the Secrets Manager to");
      log("fully exercise this test. Continuing with the parameter only.");
    }

    log("Launching Notepad...");
    await driver.launch("notepad.exe");
    await driver.pause(2000);
    await driver.focusWindow(WIN);
    zephyrLog("Launched Notepad.", "Pass");

    // Type the parameter value.
    log("Typing the GREETING parameter...");
    await driver.type(greeting);
    await driver.keyPress("Enter");
    await driver.pause(400);
    zephyrLog("Typed the user-supplied GREETING parameter.", "Pass");

    // Type the secret value if present. We do NOT log the secret itself.
    if (secret) {
      log("Typing the injected secret (value hidden in logs)...");
      await driver.type("Secret length: " + secret.length + " chars");
      await driver.keyPress("Enter");
      await driver.pause(400);
      zephyrLog("Injected secret was available in parameters.", "Pass");
    }

    // Read the document back via clipboard and check the greeting made it in.
    log("Selecting all and copying to verify...");
    await driver.hotkey("Ctrl", "a");
    await driver.pause(200);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);
    const clip = await driver.getClipboard();

    if (!clip.includes(greeting)) {
      throw new Error("GREETING parameter did not appear in the document.");
    }
    zephyrLog("Verified the GREETING parameter round-tripped correctly.", "Pass");

    log("Closing Notepad without saving...");
    await driver.closeWindow();
    await driver.pause(800);
    await driver.keyPress("Alt", "n");
    await driver.pause(500);
    zephyrLog("Closed Notepad without saving.", "Pass");

    log("PASS: Parameters and secrets test complete.");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  }
};
