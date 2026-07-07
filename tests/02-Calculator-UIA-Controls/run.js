function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Reports the calculator window's ACTUAL size and takes a window screenshot,
// so we can scale the measured button coordinates correctly. Also clicks the
// centre of where '7' should be at a few candidate scales and checks the
// display, to auto-find the right scale.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Calculator";
  const OUT = parameters.OUT_DIR || ".";
  let launched = false;

  // '7' centre in the 422x636 reference screenshot.
  const REF_W = 422, REF_H = 636;
  const REF7 = { x: 52, y: 396 };

  try {
    log("Launching Calculator...");
    await driver.launch("calc.exe");
    await driver.pause(2500);
    await driver.focusWindow(WIN);
    await driver.pause(400);
    launched = true;

    // Save a window screenshot and report its pixel size via OCR/readText meta
    // is not reliable; instead, screenshot the window and we can read its size
    // from the saved PNG. Save it for inspection.
    try {
      await driver.screenshotWindow(`${OUT}/02size-calc.png`, WIN);
      log(`Saved ${OUT}/02size-calc.png — its dimensions ARE the live window size.`);
    } catch (e) {
      log("screenshotWindow failed: " + (e && e.message || "").slice(0, 60));
    }

    // Try clicking '7' at several scale factors and check if the display shows 7.
    const scales = [1.0, 1.25, 1.5, 1.75, 2.0, 0.8];
    for (const s of scales) {
      await driver.keyPress("Escape");
      await driver.pause(200);
      const x = Math.round(REF7.x * s);
      const y = Math.round(REF7.y * s);
      log(`Trying scale ${s}: click '7' at window-relative (${x}, ${y})...`);
      await driver.mouseClick(x, y, "left", { relativeTo: WIN });
      await driver.pause(400);
      let disp = "?";
      try {
        disp = await driver.getControlText(WIN, { controlId: "150" });
      } catch (e) {}
      log(`   display -> '${disp}'`);
      if ((disp.match(/\d+/g) || []).join("") === "7") {
        log(`\nMATCH: scale ${s} puts '7' correctly. Use this scale for all buttons.`);
        zephyrLog(`Found working scale ${s}.`, "Pass");
        break;
      }
    }

    log("\nProbe done. Note the SIZE of 02size-calc.png and any MATCH scale above.");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  } finally {
    if (launched) {
      try {
        await driver.focusWindow(WIN);
        await driver.closeWindow();
        await driver.pause(500);
      } catch (e) {}
    }
  }
};
