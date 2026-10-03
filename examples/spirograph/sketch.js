// Spirograph — hypotrochoids, the oldest plotter drawing there is.
// Three curves share one centre; the seed picks their gear ratios.
// Change seed and run again for another drawing; click to plot, click again to stop.
let plot;
let bedPreview;
let bedDrawing;
let seed = 3;

function setup() {
  createCanvas(600, 600);
  // 300 x 300 mm, centred on A2 paper
  plot = createPlot({ paper: "A2", margin: 12, width: 300, log: say });
  noLoop();
}

function draw() {
  background("#ffffff");
  stroke("#111111");
  noFill();
  randomSeed(seed);
  plot.clear();

  const cx = width / 2;
  const cy = height / 2;
  const R = 250;

  // ── three hypotrochoids: fixed ring R, rolling wheel r, pen at distance d ──
  // Wheels that share a factor with the ring close within 2 to 11 turns.
  const wheels = [75, 100, 110, 150, 175, 200, 225];
  for (let curve = 0; curve < 3; curve += 1) {
    const r = wheels[floor(random(wheels.length))];
    const d = r * random(0.35, 1.25);
    const turns = r / gcd(R, r); // wheel turns until the curve closes
    const points = [];
    const steps = turns * 240;
    for (let i = 0; i <= steps; i += 1) {
      const t = (i / steps) * TWO_PI * turns;
      points.push([
        cx + (R - r) * cos(t) + d * cos(((R - r) / r) * t),
        cy + (R - r) * sin(t) - d * sin(((R - r) / r) * t)
      ]);
    }
    plot.polyline(points);
  }

  showBed();
  plot.go();   // ready: click the drawing to plot, click again to stop
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
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
