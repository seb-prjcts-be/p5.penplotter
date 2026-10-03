// Layout and statistics for the example page.
const sketchSetup = setup;
const sketchDraw = draw;

setup = async function () {
  await sketchSetup();
  document.querySelector("#sheet").textContent = `${plot.paper.format} · ${plot.paper.width} × ${plot.paper.height} mm`;
  document.querySelector("#sheet-position").textContent = `X ${plot.paper.x} / Y ${plot.paper.y} mm`;
  document.querySelector("#p5-preview").appendChild(document.querySelector("canvas.p5Canvas"));

};

draw = function () {
  sketchDraw();
  document.querySelector("#seed").textContent = String(seed);
  document.querySelector("#wave").textContent = String(shape);
  document.querySelector("#paths").textContent = String(plot.plan().stats.paths);
  plot.drawBed(document.querySelector("#bed"));   // where the canvas lands on the paper
};

say = function (text) {
  document.querySelector("#status").textContent = text;
};
