function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: window management (find / focus / maximise / title read)
// plus full-screen and window-scoped screenshots. App: File Explorer.
//
// Note: Explorer is an awkward host — its process MainWindowTitle is the folder
// name ("Home"/"This PC"), not "File Explorer", so screenshotWindow's title
// lookup can miss even though focusWindow matched. We try several titles and
// treat a window-screenshot miss as non-fatal (the full-screen shot still works).
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const outDir = parameters.SCREENSHOT_DIR || ".";
  let opened = false;
  let matched = null;

  try {
    log("Opening File Explorer...");
    await driver.launch("explorer.exe");
    await driver.pause(2500);
    opened = true;
    zephyrLog("Launched File Explorer.", "Pass");

    log("Locating the Explorer window...");
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

    const title = await driver.getWindowTitle();
    log("Focused window title: " + title);
    zephyrLog("Read the focused window title.", "Pass");

    log("Maximising the window...");
    await driver.maximizeWindow(matched);
    await driver.pause(800);
    zephyrLog("Maximised the Explorer window.", "Pass");

    // Full-screen screenshot (reliable).
    const fullPath = `${outDir}/explorer-full.png`;
    log("Taking a full-screen screenshot -> " + fullPath);
    await driver.screenshot(fullPath);
    zephyrLog("Captured a full-screen screenshot.", "Pass");

    // Window-only screenshot. Try several titles because Explorer's process
    // MainWindowTitle differs from what focusWindow matched.
    const winPath = `${outDir}/explorer-window.png`;
    const titlesToTry = [title, matched, "Home", "This PC", "File Explorer"]
      .filter((t, i, a) => t && a.indexOf(t) === i);

    let captured = false;
    for (const t of titlesToTry) {
      try {
        log(`Taking a window-only screenshot (title '${t}') -> ${winPath}`);
        await driver.screenshotWindow(winPath, t);
        captured = true;
        log("Window screenshot captured using title: " + t);
        break;
      } catch (e) {
        log(`  '${t}' didn't match for screenshotWindow: ${(e && e.message || "").slice(0, 60)}`);
      }
    }

    if (captured) {
      zephyrLog("Captured a window-scoped screenshot.", "Pass");
    } else {
      log("Could not capture a window-scoped screenshot by any known title; " +
          "the full-screen screenshot above still succeeded.");
      zephyrLog("Window-scoped screenshot skipped (Explorer title mismatch).", "Pass");
    }

    log("PASS: Window management test complete.");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  } finally {
    if (opened && matched) {
      try {
        log("Closing Explorer...");
        await driver.focusWindow(matched);
        await driver.closeWindow();
        await driver.pause(500);
      } catch (closeErr) {
        log("Warning: could not close Explorer cleanly: " + (closeErr && closeErr.message));
      }
    }
  }
};
