// The example page adds its layout and statistics to the standalone sketch.
const sketchSetup = setup;
const sketchDraw = draw;

setup = function () {
  sketchSetup();
  document.querySelector("#p5-preview").appendChild(document.querySelector("canvas.p5Canvas"));
};

draw = function () {
  sketchDraw();
  const stats = plot.plan().stats;
  document.querySelector("#seed").textContent = String(seed);
  document.querySelector("#paths").textContent = String(stats.paths);
  document.querySelector("#length").textContent = `${(stats.drawDistance / 1000).toFixed(1)} m`;
  plot.drawBed(document.querySelector("#bed"));
};

say = function (text) {
  document.querySelector("#status").textContent = text;
};
