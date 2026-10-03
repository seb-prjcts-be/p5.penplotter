// Fit the canvas on A2, with a 12 mm paper margin.
const PLACE = { paper: "A2", margin: 12 };

let waveSeed = Math.floor(Math.random() * 34);

let plot;
let bedPreview;
let bedDrawing;

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
  background("#ffffff"); // screen only: no plot. in front of it
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
  showBed();
  plot.go();   // ready: click the drawing to plot, click again to stop
}

function say(text) {
  console.log(text);
}

function keyPressed() {
  if (key === "r" || key === "R") {
    waveSeed = Math.floor(Math.random() * 34);
    redraw();
  }
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
