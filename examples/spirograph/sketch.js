// Spirograph: curves traced by a wheel rolling inside a ring.
// Three curves share one centre; the seed picks their gear ratios.
// Refresh for another drawing; click to plot, click again to stop.
let plot;
let seed = Date.now();

function setup() {
  createCanvas(600, 600);
  // Change paper to "A3" or "A2"; the drawing fits the chosen sheet.
  // Add width: 120 for a fixed drawing width in mm (it must fit the margins).
  // Add paperX: 0, paperY: 0 to place the sheet at the machine origin.
  // For an A3 H with DrawCore, add these explicit machine settings:
  // drawcore: {
  //   travel: { width: 420, height: 297 },
  //   axes: { swapXY: true, xDirection: -1, yDirection: -1 },
  //   penUp: 0.5, penDown: 5, penFeed: 1000,
  //   drawFeed: 600, travelFeed: 900
  // }
  plot = createPlot({ paper: "A4", margin: 12, log: say });
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
    const d = r * random(0.35, 1.2);
    const turns = r / gcd(R, r); // turns until the curve closes
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

  plot.showBed();
  plot.go();   // ready: click the drawing to plot, click again to stop
}

// Thank you mister Euclid!
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function say(text) {
  console.log(text);
}
