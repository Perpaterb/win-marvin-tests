function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: window management (find / focus / maximise / title read)
// plus window-scoped screenshots. App: File Explorer.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  // Where to drop screenshots. Overridable via a parameter.
  const outDir = parameters.SCREENSHOT_DIR || ".";

  try {
    log("Opening File Explorer...");
    // explorer.exe with no args opens the default (This PC / Home) window.
    await driver.launch("explorer.exe");
    await driver.pause(2500);
    zephyrLog("Launched File Explorer.", "Pass");

    // Find and focus the Explorer window. Title varies by Windows version
    // ("File Explorer", "Home", "This PC"), so match loosely.
    log("Locating the Explorer window...");
    let matched = null;
    for (const candidate of ["File Explorer", "Home", "This PC", "Explorer"]) {
      try {
        await driver.focusWindow(candidate);
        matched = candidate;
        break;
      } catch (e) {
        // try the next candidate
      }
    }
    if (!matched) {
      throw new Error("Could not find an Explorer window by any known title.");
    }
    log("Focused Explorer window matching: " + matched);
    zephyrLog("Found and focused the Explorer window.", "Pass");

    // Read the actual focused window title.
    const title = await driver.getWindowTitle();
    log("Focused window title: " + title);
    zephyrLog("Read the focused window title.", "Pass");

    // Maximise it.
    log("Maximising the window...");
    await driver.maximizeWindow(matched);
    await driver.pause(800);
    zephyrLog("Maximised the Explorer window.", "Pass");

    // Full-screen screenshot.
    const fullPath = `${outDir}/explorer-full.png`;
    log("Taking a full-screen screenshot -> " + fullPath);
    await driver.screenshot(fullPath);
    zephyrLog("Captured a full-screen screenshot.", "Pass");

    // Window-only screenshot (bounds of the Explorer window).
    const winPath = `${outDir}/explorer-window.png`;
    log("Taking a window-only screenshot -> " + winPath);
    await driver.screenshotWindow(winPath, matched);
    zephyrLog("Captured a window-scoped screenshot.", "Pass");

    log("Closing Explorer...");
    await driver.focusWindow(matched);
    await driver.closeWindow();
    await driver.pause(500);
    zephyrLog("Closed the Explorer window.", "Pass");

    log("PASS: Window management test complete.");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  }
};
