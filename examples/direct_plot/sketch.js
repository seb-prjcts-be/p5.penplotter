// Fit the canvas on A2, with a 12 mm paper margin.
const PLACE = { paper: "A2", margin: 12 };

let waveSeed = Math.floor(Math.random() * 35);

let plot;

async function setup() {
  // Load the wave sampler used by this sketch.
  await import("https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.waves@v3.4.0/p5.waves.min.js");
  createCanvas(400, 250);

  plot = createPlot({
    ...PLACE,
    log: say
  });
  noLoop();
}

function draw() {
  background("#ffffff"); // Background colour stays on screen.
  stroke("#111111");
  noFill();

  plot.clear();
  plot.rect(10, 10, 380, 230);
  for (let row = 0; row < 5; row += 1) {
    const points = [];
    for (let x = 30; x <= 370; x += 4) {
      const waveY = Waves.wave(x + row * 9, {
        wave: waveSeed,
        t: 0,
        amplitude: 14,
        frequency: 0.5
      });
      points.push({ x, y: 50 + row * 38 + waveY });
    }
    plot.polyline(points);
  }
  plot.showBed();
  plot.go();   // ready: click the drawing to plot, click again to stop
}

function say(text) {
  console.log(text);
}
