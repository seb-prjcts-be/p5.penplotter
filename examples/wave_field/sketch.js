// Wave field — streamlines through a direction field that p5.waves shapes.
// Two waves, one per axis, give every point an angle; sixty lines follow it.
// Refresh for another drawing; click the drawing to plot, click again to stop.
let plot;
let seed = Date.now();
let shape;

async function setup() {
  // Load the wave sampler used by this sketch.
  await import("https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.waves@v3.4.0/p5.waves.min.js");
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

  plot.showBed();
  plot.go();   // ready: click the drawing to plot, click again to stop
}


function say(text) {
  console.log(text);
}
