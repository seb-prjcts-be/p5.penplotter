// Spirograph — hypotrochoids, the oldest plotter drawing there is.
// Three curves share one centre; the seed picks their gear ratios.
// R for another seed; click the drawing to plot, click again to stop.
let plot;
let seed = 3;

function setup() {
  createCanvas(600, 600).parent("p5-preview");
  // 300 x 300 mm, centred on the A2 bed
  plot = createPlot({ x: 147, y: 66, width: 300, log: say });
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
  let paths = 0;

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
    paths += 1;
  }

  document.querySelector("#seed").textContent = String(seed);
  document.querySelector("#paths").textContent = String(paths);
  const stats = plot.plan().stats;
  document.querySelector("#length").textContent = `${(stats.drawDistance / 1000).toFixed(1)} m`;

  plot.drawBed(document.querySelector("#bed"));   // where the canvas lands on the paper
  plot.go();   // ready: click the drawing to plot, click again to stop
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function keyPressed() {
  if (key === "r" || key === "R") {
    seed += 1;
    redraw();
  }
}

function say(text) {
  document.querySelector("#status").textContent = text;
}
