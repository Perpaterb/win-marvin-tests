function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: OCR on a hard-to-read target — screenshot the Calculator,
// then OCR a TIGHT CROP of just the display region (buttons removed).
// App: classic CalcFrame Calculator.
//
// Two phases in one run:
//   1) Full-window OCR to locate where the result digits are (via word bboxes).
//   2) Crop to that region, SAVE the crop for inspection, and OCR just the crop.
// The saved crop (05-crop.png) lets us SEE exactly what Tesseract was handed,
// so if it still can't read the display we have evidence rather than guesswork.
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
    zephyrLog("Launched Calculator.", "Pass");

    // Clear, then compute 8 * 9 = 72 via keyboard (reliable on this app).
    log("Clearing and entering 8 * 9 = via keyboard...");
    await driver.keyPress("Escape");
    await driver.pause(200);
    await driver.type("8");
    await driver.pause(150);
    await driver.type("*");
    await driver.pause(150);
    await driver.type("9");
    await driver.pause(150);
    await driver.keyPress("Enter"); // '='
    await driver.pause(600);
    zephyrLog("Entered 8 * 9 = via keyboard.", "Pass");

    // Save a full screenshot of the calculator window for reference.
    const fullShot = `${OUT}/05-calc-full.png`;
    try {
      await driver.screenshotWindow(fullShot, WIN);
      log("Saved full calculator screenshot -> " + fullShot);
    } catch (e) {
      log("Could not screenshot just the window (" + (e && e.message || "").slice(0, 50) + "); continuing.");
    }

    // --- Phase 1: full-window OCR to locate the result region ---
    log("Phase 1: OCR the whole calculator window to locate the display...");
    const full = await driver.readText(null, { window: WIN });
    log("Full-window OCR confidence: " + full.confidence);
    log("Full-window OCR text:\n" + full.text);

    // Look for a word that is all digits (the result). Take the one highest on
    // screen (smallest y0) — the display sits above the buttons.
    const digitWords = (full.words || []).filter(w => w.bbox && /^\d[\d.,]*$/.test((w.text || "").trim()));
    digitWords.sort((a, b) => a.bbox.y0 - b.bbox.y0);

    let region;
    if (digitWords.length > 0) {
      const w = digitWords[0];
      // Pad the bbox generously so we don't clip glyphs.
      const padX = 40, padY = 20;
      region = {
        x: Math.max(0, w.bbox.x0 - padX),
        y: Math.max(0, w.bbox.y0 - padY),
        width: (w.bbox.x1 - w.bbox.x0) + padX * 2,
        height: (w.bbox.y1 - w.bbox.y0) + padY * 2,
      };
      log(`Found candidate result '${w.text}' at bbox [${w.bbox.x0},${w.bbox.y0},${w.bbox.x1},${w.bbox.y1}].`);
      log(`Cropping to region {x:${region.x}, y:${region.y}, w:${region.width}, h:${region.height}}.`);
    } else {
      // Fallback: crop the top strip of the screen where the display usually is.
      log("No all-digit word found in full OCR. Falling back to a top-strip crop.");
      region = { x: 0, y: 40, width: 520, height: 120 };
    }

    // --- Phase 2: save the crop, then OCR just the crop ---
    const cropShot = `${OUT}/05-crop.png`;
    try {
      await driver.screenshotRegion(cropShot, region);
      log("Saved cropped display image -> " + cropShot + " (inspect this to see what OCR was given).");
    } catch (e) {
      log("Could not save crop image: " + (e && e.message || "").slice(0, 60));
    }

    log("Phase 2: OCR the cropped display region...");
    const crop = await driver.readText(region, {});
    log("Cropped OCR confidence: " + crop.confidence);
    log("Cropped OCR text: " + JSON.stringify(crop.text));

    // Verify: does the crop OCR contain 72?
    const cropDigits = (crop.text || "").replace(/[^\d]/g, "");
    if (cropDigits.includes("72")) {
      log("SUCCESS: cropped OCR read the result 72.");
      zephyrLog("Cropped-region OCR read the calculator result (72).", "Pass");
    } else {
      // Don't hard-fail silently — report clearly and point at the saved crop.
      log("Cropped OCR did not contain '72'. Open " + cropShot + " to see what");
      log("Tesseract was handed. If the digits are faint/thin, this calculator's");
      log("display is simply hard to OCR and Notepad is a better OCR target.");
      throw new Error("Cropped OCR did not read '72' (see " + cropShot + ").");
    }

    log("PASS: Cropped-region OCR test complete.");
  } catch (err) {
    zephyrLog("FAIL: " + (err && err.message), "Fail");
    throw err;
  } finally {
    if (launched) {
      try {
        log("Closing Calculator...");
        await driver.focusWindow(WIN);
        await driver.closeWindow();
        await driver.pause(500);
      } catch (closeErr) {
        log("Warning: could not close Calculator cleanly: " + (closeErr && closeErr.message));
      }
    }
  }
};
