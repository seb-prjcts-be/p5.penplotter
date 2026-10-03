// Wave field — streamlines through a direction field that p5.waves shapes.
// Two waves, one per axis, give every point an angle; sixty lines follow it.
// One seed per sheet: R for another; click the drawing to plot, click again to stop.
let plot;
let bedPreview;
let bedDrawing;
let seed = 1;
let shape;

async function setup() {
  // Load the wave sampler used by this sketch.
  await import("https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.waves@v3.4.0/p5.waves.min.js");
  createCanvas(600, 600);
  // 300 x 300 mm, centred on A2 paper
  plot = createPlot({ paper: "A2", margin: 12, width: 300, log: say });
  noLoop();
}

function angleAt(x, y, shape) {
  const a = Waves.wave(x * 0.012, { wave: shape, t: 0, amplitude: 1, frequency: 1 });
  const b = Waves.wave(y * 0.012 + 3, { wave: shape, t: 0, amplitude: 1, frequency: 1 });
  return (a + b) * PI;
}

function draw() {
  background("#ffffff");
  stroke("#111111");
  noFill();
  randomSeed(seed);
  shape = floor(random(35));
  plot.clear();

  // ── 1 · seeds on a jittered grid ──
  const starts = [];
  for (let row = 0; row < 10; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      starts.push([60 + column * 96 + random(-20, 20), 60 + row * 54 + random(-14, 14)]);
    }
  }

  // ── 2 · each seed follows the field for 140 steps, or until the edge ──
  for (const [sx, sy] of starts) {
    const points = [];
    let x = sx;
    let y = sy;
    for (let step = 0; step < 140; step += 1) {
      points.push([x, y]);
      const angle = angleAt(x, y, shape);
      x += cos(angle) * 2.4;
      y += sin(angle) * 2.4;
      if (x < 20 || x > width - 20 || y < 20 || y > height - 20) break;
    }
    if (points.length > 6) plot.polyline(points);
  }

  // ── 3 · frame ──
  plot.rect(20, 20, width - 40, height - 40);

  showBed();
  plot.go();   // ready: click the drawing to plot, click again to stop
}

function keyPressed() {
  if (key === "r" || key === "R") {
    seed += 1;
    redraw();
  }
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
