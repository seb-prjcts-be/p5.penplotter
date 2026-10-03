// Layout and statistics for the example page.
const sketchSetup = setup;
const sketchDraw = draw;

setup = async function () {
  await sketchSetup();
  document.querySelector("#p5-preview").appendChild(document.querySelector("canvas.p5Canvas"));
  document.querySelector("#size").textContent = "300 × 300 mm";
};

draw = function () {
  sketchDraw();
  document.querySelector("#seed").textContent = String(seed);
  document.querySelector("#paths").textContent = String(plot.plan().stats.paths);
  plot.drawBed(document.querySelector("#bed"));   // where the canvas lands on the paper
};

melding = function (text) {
  document.querySelector("#status").textContent = text;
};
