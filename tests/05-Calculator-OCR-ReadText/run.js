function log(msg) {
  process.stdout.write(`${msg}\n`);
}

// Capability area: OCR — read a value off a hard-to-see UI (the classic
// CalcFrame Calculator display). App: Calculator.
//
// Full-window OCR reads the display fine (it returns "72" with a bounding box);
// the earlier "garbage" was just button noise printed before the number. We do
// NOT crop: the server's cropped-readText path is broken (Jimp.read is not a
// function), and we don't need it — full-window OCR already locates and reads
// the result via word bounding boxes.
module.exports = async function (driver, parameters = {}, zephyrLog) {
  if (typeof zephyrLog !== "function") zephyrLog = function () {};

  const WIN = "Calculator";
  let launched = false;

  try {
    log("Launching Calculator...");
    await driver.launch("calc.exe");
    await driver.pause(2500);
    await driver.focusWindow(WIN);
    await driver.pause(400);
    launched = true;
    zephyrLog("Launched Calculator.", "Pass");

    // Clear, then compute 8 * 9 = 72 via keyboard.
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

    // OCR the whole calculator window (no crop — cropped path is broken server-side).
    log("Running OCR over the Calculator window...");
    const ocr = await driver.readText(null, { window: WIN });
    log("OCR confidence: " + ocr.confidence);
    log("OCR text:\n" + ocr.text);

    // 1) Direct text check: does the OCR output contain 72?
    const allDigits = (ocr.text || "").replace(/[^\d]/g, "");
    const textHas72 = /72/.test(ocr.text || "");

    // 2) Word-level check: find an all-digit word equal to "72" and report its
    //    bounding box — this demonstrates OCR locating the value on screen.
    const digitWords = (ocr.words || []).filter(
      w => w.bbox && /^\d[\d.,]*$/.test((w.text || "").trim())
    );
    const match = digitWords.find(w => (w.text || "").replace(/[^\d]/g, "") === "72");

    if (match) {
      log(`OCR located the result '72' at bbox [${match.bbox.x0},${match.bbox.y0},${match.bbox.x1},${match.bbox.y1}].`);
      zephyrLog("OCR located the result 72 with its bounding box.", "Pass");
    } else if (textHas72) {
      log("OCR text contains '72' (no clean word bbox, but the value was read).");
      zephyrLog("OCR read the result 72 from the display.", "Pass");
    } else {
      throw new Error(`OCR did not read '72'. Full text was: ${JSON.stringify(ocr.text)}`);
    }

    log("PASS: Calculator OCR test complete.");
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
