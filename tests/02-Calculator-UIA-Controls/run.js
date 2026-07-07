function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// PROBE: can OCR locate the calculator's BUTTONS (not just the display)?
// OCRs the calculator window and lists every word it finds with its bbox,
// so we can see whether digits/operators are individually locatable for
// coordinate-based mouse clicking.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Calculator";
  const OUT = parameters.OUT_DIR || ".";
  let launched = false;

  try {
    log("Launching Calculator...");
    await driver.launch("calc.exe");
    await driver.pause(2500);
    await driver.focusWindow(WIN);
    await driver.pause(400);
    launched = true;

    // Save a screenshot of the calculator for reference.
    try {
      await driver.screenshotWindow(`${OUT}/02probe-calc.png`, WIN);
      log(`Saved ${OUT}/02probe-calc.png`);
    } catch (e) {
      log("Could not save window screenshot: " + (e && e.message || "").slice(0, 50));
    }

    log("OCR over the whole calculator window...");
    const ocr = await driver.readText(null, { window: WIN });
    log("Overall confidence: " + ocr.confidence);
    log("Raw text:\n" + ocr.text);

    const words = (ocr.words || []);
    log(`\nOCR found ${words.length} words with bounding boxes:`);
    for (const w of words) {
      if (w.bbox) {
        const cx = Math.round((w.bbox.x0 + w.bbox.x1) / 2);
        const cy = Math.round((w.bbox.y0 + w.bbox.y1) / 2);
        log(`  '${w.text}'  centre(${cx},${cy})  bbox[${w.bbox.x0},${w.bbox.y0},${w.bbox.x1},${w.bbox.y1}]  conf ${Math.round(w.confidence)}`);
      }
    }

    // Specifically report whether we can find the buttons we need.
    const norm = (s) => (s || "").trim();
    const targets = ["7", "9", "8", "×", "x", "*", "=", "+"];
    log("\nButtons we need for a click-based 7 x 9 =:");
    for (const t of targets) {
      const hits = words.filter(w => norm(w.text) === t && w.bbox);
      if (hits.length) {
        for (const h of hits) {
          const cx = Math.round((h.bbox.x0 + h.bbox.x1) / 2);
          const cy = Math.round((h.bbox.y0 + h.bbox.y1) / 2);
          log(`  '${t}' FOUND at (${cx},${cy})`);
        }
      } else {
        log(`  '${t}' not found as a discrete word`);
      }
    }

    log("\nProbe done. Paste this output so we can build the click-based test.");
    zephyrLog("Button OCR probe complete.", "Pass");
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
