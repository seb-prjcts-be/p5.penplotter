// Fit the canvas on the chosen sheet, with a 12 mm paper margin.
const PLACE = { paper: "A4", margin: 12 };

let waveSeed = Math.floor(Math.random() * 35);

let plot;

async function setup() {
  // Load the wave sampler used by this sketch.
  await import("https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.waves@v3.4.0/p5.waves.min.js");
  createCanvas(400, 250);

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
