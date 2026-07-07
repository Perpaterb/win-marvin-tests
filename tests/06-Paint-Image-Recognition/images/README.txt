REFERENCE IMAGES FOR TEST 06 (Paint - Image Recognition)
=========================================================

Put THREE PNG files in this folder (tests/06-Paint-Image-Recognition/images/).
The run.js references them by exactly these filenames:

1. paint-window.png
   WHAT: A small, tightly cropped screenshot of a distinctive part of the Paint
         toolbar/ribbon that is always visible when Paint is open — e.g. the
         "Home" ribbon tab label, or the Paint logo in the title bar.
   WHY:  Used by waitForImage() to confirm Paint has finished launching.
   SIZE: ~60x30 to 150x60 px is plenty.

2. brush-tool.png
   WHAT: A tight crop of the Brushes / Pencil tool icon in the Paint toolbar.
   WHY:  clickImage() finds this icon and clicks its centre to select the tool.
   SIZE: ~30x30 to 60x60 px — just the icon, no surrounding whitespace.

3. error-dialog.png
   WHAT: A crop of any error-dialog icon (e.g. the red X / warning icon from a
         standard Windows error dialog). This is used only for a NEGATIVE check
         — the test asserts it is NOT on screen. You can grab one from any
         Windows error popup, or use a red warning triangle icon.
   WHY:  Demonstrates findImage() returning found:false without throwing.
   SIZE: ~30x30 to 80x80 px.

HOW TO CAPTURE (quickest way):
- Open Paint yourself, press PrtScn or use Snipping Tool (Win+Shift+S).
- Crop tightly around just the element. Save as PNG (lossless).
- Match the same screen resolution / display scaling you'll run the test on.
- If matching is flaky, the test already loosens threshold to 0.8; you can drop
  it further (e.g. 0.75) in run.js.

Once these three PNGs are in this folder, the test is ready to run in Desktop mode.
