function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: keyboard input, hotkey combos, and the Windows clipboard.
// App: Notepad (built into every Windows install).
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  try {
    log("Launching Notepad...");
    await driver.launch("notepad.exe");
    await driver.pause(2000);
    await driver.focusWindow("Notepad");
    zephyrLog("Launched Notepad.", "Pass");

    // --- Typing ---
    const line1 = "Marvin keyboard and clipboard demo.";
    log("Typing first line...");
    await driver.type(line1);
    await driver.keyPress("Enter");
    await driver.pause(500);
    zephyrLog("Typed a line of text and pressed Enter.", "Pass");

    // --- Clipboard: push text in, paste it out ---
    const pasted = "This line arrived via the clipboard.";
    log("Setting clipboard and pasting with Ctrl+V...");
    await driver.setClipboard(pasted);
    await driver.hotkey("Ctrl", "v");
    await driver.pause(500);
    zephyrLog("Set clipboard and pasted its contents.", "Pass");

    // --- Select all + copy, then read the clipboard back to verify ---
    log("Select all (Ctrl+A) and copy (Ctrl+C)...");
    await driver.hotkey("Ctrl", "a");
    await driver.pause(300);
    await driver.hotkey("Ctrl", "c");
    await driver.pause(300);

    const clip = await driver.getClipboard();
    log("Clipboard now contains:\n" + clip);

    if (!clip.includes(line1) || !clip.includes(pasted)) {
      throw new Error("Clipboard did not contain both expected lines.");
    }
    zephyrLog("Verified both typed and pasted lines via clipboard read-back.", "Pass");

    // --- Close without saving ---
    log("Closing Notepad without saving...");
    await driver.closeWindow();
    await driver.pause(1000);
    // Modern Notepad prompts "Save?" — press Alt+N / N for "Don't Save".
    await driver.keyPress("Alt", "n");
    await driver.pause(500);
    zephyrLog("Closed Notepad without saving.", "Pass");

    log("PASS: Keyboard and clipboard test complete.");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  }
};
