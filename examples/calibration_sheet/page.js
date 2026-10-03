// Layout and statistics for the example page.
const sketchSetup = setup;
const sketchDraw = draw;

setup = async function () {
  await sketchSetup();
  plot.showBed(document.querySelector("#bed"));
  document.querySelector("#sheet").textContent = `${plot.paper.format} · ${plot.paper.width} × ${plot.paper.height} mm`;
  document.querySelector("#sheet-position").textContent = `X ${plot.paper.x} / Y ${plot.paper.y} mm`;
  document.querySelector("#p5-preview").appendChild(document.querySelector("canvas.p5Canvas"));

};

draw = function () {
  sketchDraw();
  document.querySelector("#paths").textContent = String(plot.plan().stats.paths);
};

say = function (text) {
  document.querySelector("#status").textContent = text;
};
