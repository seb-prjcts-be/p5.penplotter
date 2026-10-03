// Layout and a screen demonstration, separate from the copyable sketch.
const sketchSetup = setup;
const sketchNextDots = nextDots;
let completedDots = 0;
let demo = false;

setup = function () {
  sketchSetup();
  plot.showBed(document.querySelector("#bed"));
  document.querySelector("#sheet").textContent = plot.paper.format + " · " + plot.paper.width + " × " + plot.paper.height + " mm";
  document.querySelector("#sheet-position").textContent = "X " + plot.paper.x + " / Y " + plot.paper.y + " mm";
  document.querySelector("#p5-preview").appendChild(document.querySelector("canvas.p5Canvas"));
  document.querySelector("#dots").textContent = "0 / " + DOTS;
  document.querySelector("#time").textContent = "0 dots";
};

nextDots = function () {
  if (dots > 0) completedDots = dots;
  const more = sketchNextDots();
  document.querySelector("#dots").textContent = dots + " / " + DOTS;
  document.querySelector("#time").textContent = completedDots + " dots";
  return more;
};

say = function (text) {
  document.querySelector("#status").textContent = (demo ? "Screen demo · " : "") + text;
};

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#demo").addEventListener("click", () => {
    if (plot.busy || !plot.pending) return;
    demo = true;
    // No serial port is opened. Waiting models a slower pen for this demo.
    plot.transport = {};
    plot.driver = {
      async run() {
        await new Promise(resolve => setTimeout(resolve, 120));
        return { status: plot.sequenceStopped ? "aborted" : "complete" };
      },
      abort() {}
    };
    document.querySelector("#demo").disabled = true;
    document.querySelector("canvas.p5Canvas").click();
  });

  if (location.search.includes("embed")) {
    const demoTimer = setInterval(() => {
      if (!plot?.pending) return;
      clearInterval(demoTimer);
      document.querySelector("#demo").click();
    }, 100);
  }
});
