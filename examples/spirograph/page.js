// The example page adds its layout and statistics to the standalone sketch.
const sketchSetup = setup;
const sketchDraw = draw;

setup = function () {
  sketchSetup();
  document.querySelector("#sheet").textContent = `${plot.paper.format} · ${plot.paper.width} × ${plot.paper.height} mm`;
  document.querySelector("#sheet-position").textContent = `X ${plot.paper.x} / Y ${plot.paper.y} mm`;
  document.querySelector("#p5-preview").appendChild(document.querySelector("canvas.p5Canvas"));
};

draw = function () {
  sketchDraw();
  const stats = plot.plan().stats;
  document.querySelector("#seed").textContent = String(seed);
  document.querySelector("#paths").textContent = String(stats.paths);
  document.querySelector("#length").textContent = `${(stats.drawDistance / 1000).toFixed(1)} m`;
};

say = function (text) {
  document.querySelector("#status").textContent = text;
};
