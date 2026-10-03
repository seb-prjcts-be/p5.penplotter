// Calibration sheet — what your pen does on your paper, in millimetres.
// A ruler, tone scales and circles: only physical variables, nothing a screen
// could fake. Plot it once per pen and keep the sheet.
let plot;
let bedPreview;
let bedDrawing;

function setup() {
  createCanvas(400, 560);
  // 200 x 280 mm, centred on A2 paper
  plot = createPlot({ paper: "A2", margin: 12, width: 200, log: say });
  noLoop();
}

function draw() {
  background("#ffffff");
  stroke("#111111");
  noFill();
  plot.clear();

  // ── 1 · ruler: 100 mm, a tick every millimetre, longer every 5 and 10 ──
  const mm = width / 200;
  plot.line(20 * mm, 30 * mm, 120 * mm, 30 * mm);
  for (let i = 0; i <= 100; i += 1) {
    const h = i % 10 === 0 ? 6 : i % 5 === 0 ? 4 : 2;
    plot.line((20 + i) * mm, 30 * mm, (20 + i) * mm, (30 - h) * mm);
  }

  // ── 2 · hatch tone scale: spacing 6 → 0.8 mm ──
  const spacings = [6, 4, 3, 2, 1.5, 1.2, 1, 0.8];
  spacings.forEach((spacing, i) => {
    const cell = cellAt(20 + i * 22, 45, 18);
    plot.hatch(cell, spacing, QUARTER_PI);
    plot.polygon(cell);
  });

  // ── 3 · cross-hatch tone scale ──
  [6, 3, 1.5, 1].forEach((spacing, i) => {
    const cell = cellAt(20 + i * 22, 72, 18);
    plot.crossHatch(cell, spacing, QUARTER_PI);
    plot.polygon(cell);
  });

  // ── 4 · stipple density: 40 → 800 dots per 18 mm cell ──
  [40, 120, 300, 800].forEach((count, i) => {
    const cell = cellAt(108 + i * 22, 72, 18);
    plot.stipple(cell, count, 3);
    plot.polygon(cell);
  });

  // ── 5 · circles: 2 → 40 mm, where a pen shows its corners ──
  [2, 4, 8, 16, 24, 40].forEach((d, i) => {
    plot.circle((30 + i * 28) * mm, 130 * mm, d * mm);
  });

  // ── 6 · line spacing: pairs 0.3 → 2 mm apart, do they merge? ──
  [0.3, 0.5, 0.8, 1, 1.5, 2].forEach((gap, i) => {
    const y = (170 + i * 8) * mm;
    plot.line(20 * mm, y, 120 * mm, y);
    plot.line(20 * mm, y + gap * mm, 120 * mm, y + gap * mm);
  });

  // ── 7 · frame, so the sheet can be measured ──
  plot.rect(10 * mm, 10 * mm, 180 * mm, 260 * mm);

  showBed();
  plot.go();   // the sheet is ready: click the drawing to plot, click again to stop
}

function cellAt(x, y, size) {
  const mm = width / 200;
  return [[x * mm, y * mm], [(x + size) * mm, y * mm], [(x + size) * mm, (y + size) * mm], [x * mm, (y + size) * mm]];
}

function say(text) {
  console.log(text);
}

// A separate bed preview; the red cross marks the machine origin, not the drawing corner.
function showBed() {
  if (!bedPreview) {
    bedPreview = select("#bed");
    if (!bedPreview) {
      createP("Bed coordinates: red x = machine (0,0). Match the axes to your physical setup.");
      bedPreview = createElement("canvas");
      bedPreview.style("display", "block");
      bedPreview.style("width", "420px");
      bedPreview.style("max-width", "100%");
      bedPreview.style("height", "auto");
    }
    bedPreview.elt.width = 614;
    bedPreview.elt.height = 452;
    bedDrawing = document.createElement("canvas");
    bedDrawing.width = 594;
    bedDrawing.height = 432;
  }
  plot.drawBed(bedDrawing);
  const context = bedPreview.elt.getContext("2d");
  context.clearRect(0, 0, 614, 452);
  context.drawImage(bedDrawing, 10, 10);
  context.strokeStyle = "#d32f2f";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(6, 6);
  context.lineTo(14, 14);
  context.moveTo(6, 14);
  context.lineTo(14, 6);
  context.stroke();
}
