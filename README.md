# p5.penplotter

**[Open site](https://seb-prjcts-be.github.io/p5.penplotter/)** · **[Setup](https://seb-prjcts-be.github.io/p5.penplotter/docs/setup.html)** · **[Examples](https://seb-prjcts-be.github.io/p5.penplotter/docs/examples.html)** · **[Engine](https://github.com/seb-prjcts-be/vanilla.penplotter)**

The p5.js adapter for [`vanilla.penplotter`](https://github.com/seb-prjcts-be/vanilla.penplotter). Every `plot.…` call draws on the canvas and is remembered for the plotter; `plot.go()` sends the last frame straight to the pen.

**Three methods, no engine of its own.** The adapter adds `createPlotterEngine()`, `drawPlotPlan()` and `createPlot()` to p5.js and deliberately contains no optimizer, planner, renderer or hardware code.

**Optimized for p5.js 2.x** (tested with 2.2.2), global and instance mode.

```text
p5.js / p5.waves
        ↓
    p5.penplotter
        ↓
 vanilla.penplotter
        ↓
 PlotPlan → export / driver
```

## Install

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2.2.2/lib/p5.js"></script>
<script type="module">
  import { PlotterEngine } from "https://cdn.jsdelivr.net/gh/seb-prjcts-be/vanilla.penplotter@v0.2.0/vanilla.penplotter.js";
  import * as Ebb from "https://cdn.jsdelivr.net/gh/seb-prjcts-be/vanilla.penplotter@v0.2.0/src/driver/ebb.js";
  import { installP5Penplotter } from "https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.penplotter@v0.2.0/p5.penplotter.js";
  installP5Penplotter(p5, PlotterEngine, { driver: Ebb });
</script>
<script src="sketch.js"></script>
```

Pinned tags, so a sketch that works today works next year. The GitHub Pages URLs (`https://seb-prjcts-be.github.io/…`) always serve the latest `main`; the adapter checks the engine's version at install and refuses a mismatch in plain words. Leave out `{ driver: Ebb }` if you only preview and export. All four ways of wiring a sketch, with the load-order timeline behind them, are on the [Setup](https://seb-prjcts-be.github.io/p5.penplotter/docs/setup.html) page.

## Quick start

A plain global-mode sketch, with the `<script>` tags above in `index.html`:

```js
let plot;

function setup() {
  createCanvas(400, 250);
  // where the canvas lands on the bed, in mm from the home corner, and how wide
  plot = createPlot({ x: 80, y: 150, width: 80 });
  noLoop();
}

function draw() {
  background(255);          // screen only: no `plot.` prefix, so it is not recorded
  plot.clear();             // new frame, new job
  plot.rect(10, 10, 380, 230);
  plot.line(30, 125, 370, 125);
}

function keyPressed() {
  if (key === "p") plot.go();   // connect, confirm, plot
  if (key === "s") plot.stop(); // pen up, motors off
}
```

Use Chrome or Edge (Web Serial) and call `plot.go()` from a key or mouse handler: the browser shows its port list only after a user gesture. First put the carriage in the home corner by hand; the machine has no automatic home position. `draw()` runs 60 times per second, a plotter draws once: plotting is always the snapshot of the last frame.

Tested on one machine: iDraw HSE / A2 (EBB firmware 3.0.2) on 2026-09-21.

## Requirements

This table is literally identical in the README of `vanilla.penplotter`; a test guards that.

<!-- vereisten:start -->
| component | requires | note |
|---|---|---|
| `vanilla.penplotter` | nothing | no dependencies; works without p5.js. Node ≥ 18 only to run the tests |
| `p5.penplotter` | vanilla.penplotter ≥ 0.2.0 | the adapter contains no plotting or machine code; with a driver attached it refuses an older core with a clear message |
| `p5.penplotter` | p5.js ≥ 2.2.2 | tested with 2.2.2, in global and instance mode |
| direct plotting | Chrome or Edge, on `localhost` or https | Web Serial; the browser shows its port list only after a click or keypress |
| direct plotting | iDraw HSE / A2 with EBB firmware 3.0.2 | the only physically tested profile (`idraw-hse-a2`) |
| examples | p5.waves 3.4.0, vanilla.waves (pinned commit) | examples only; neither library depends on them |

Tested together: `vanilla.penplotter` 0.2.0 with `p5.penplotter` 0.2.0.

Publishing: always `vanilla.penplotter` first, then `p5.penplotter`. The examples of
`p5.penplotter` load the core as a sibling folder (`../vanilla.penplotter/`), locally under
`htdocs` and online on GitHub Pages. They therefore always get the latest core, not a
pinned one; the version check in the adapter catches a core that does not match.
<!-- vereisten:end -->

## Instance mode

```js
import { PlotterEngine } from "https://cdn.jsdelivr.net/gh/seb-prjcts-be/vanilla.penplotter@v0.2.0/vanilla.penplotter.js";
import { installP5Penplotter } from "https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.penplotter@v0.2.0/p5.penplotter.js";

installP5Penplotter(p5, PlotterEngine);

new p5(function sketch(p) {
  p.setup = function setup() {
    p.createCanvas(800, 800);
    const plot = p.createPlotterEngine();
    plot.circle(400, 400, 180);
    p.drawPlotPlan(plot.plan());
  };
});
```

## Shapes and fills

`plot.…` knows the same 2D shapes as p5, with the same arguments: `point`,
`line`, `circle`, `ellipse`, `arc`, `rect`, `square`, `triangle`, `quad`.
Points for `polyline` and `polygon` may be `[x, y]` or `{ x, y }`.
Angles follow `angleMode()`.

```js
plot.point(20, 20);
plot.square(30, 10, 40);
plot.triangle(80, 50, 120, 10, 160, 50);
plot.ellipse(260, 30, 60, 30);
plot.arc(330, 30, 40, 40, 0, HALF_PI, PIE);
plot.polygon([[0, 0], [40, 0], [40, 40]]);
```

A pen cannot make a dot: `point()` becomes a dash of a quarter of a
millimetre, as `stipple` already did. An oval becomes a 96-gon, exactly the
way the engine itself flattens a circle.

Fills come from `vanilla.penplotter` and are drawn back onto the canvas, so
that screen and paper show the same hatching. The spacing is in millimetres on
the bed, not in pixels:

```js
let square = [[20, 80], [120, 80], [120, 180], [20, 180]];
plot.hatch(square, 3, PI / 4);   // spacing in mm, angle
plot.crossHatch(square, 4);      // second direction perpendicular to the first
plot.stipple(square, 150, 3);    // count, seed: same seed, same dots
```

## p5.waves

`Waves.wave()` returns a single number. Build ordinary points with it and pass
them to the engine:

```js
const points = [];
for (let x = 40; x <= 760; x += 4) {
  points.push({
    x,
    y: 400 + Waves.wave(x, {
      wave: "triangle sine",
      t: 0,
      amplitude: 80,
      frequency: 0.04
    })
  });
}
plot.polyline(points);
```

## Examples

Each one is a standalone page under `examples/`; the [examples page](https://seb-prjcts-be.github.io/p5.penplotter/docs/examples.html) shows them live.

- `first_plot` - create the engine from a p5 canvas and draw its optimized plan
- `wave_plot` - 24 rows sampled from one of p5.waves' 34 formulas; inspect the planned route
- `direct_plot` - draw with `plot.…`, press P, and the sketch goes straight to the plotter
- `molnar_grid` - nested squares that drift and turn a little more with every row; a plain global-mode sketch
- `calibration_sheet` - ruler, tone scales, circles and line spacing: what your pen does on your paper
- `wave_field` - streamlines through a direction field that p5.waves shapes; 34 fields in one sketch
- `spirograph` - three hypotrochoids, each one unbroken polyline: the drawing a plotter was made for

## Related work

[p5.plotSvg](https://github.com/golanlevin/p5.plotSvg) by Golan Levin exports
a plotter-friendly SVG from a p5 sketch, with `beginRecordSvg()` and
`endRecordSvg()`, and covers many more p5 primitives than this adapter. It
drives no machine. `p5.penplotter` takes the other path: no file, but
`plot.go()`. A p5.plotSvg file can be plotted by the engine's `svg_to_pen` example.

[p5.plotterControl](https://github.com/craigfahner/p5.plotterControl) (craigfahner)
drives GRBL pen plotters live from p5.js. `p5.penplotter` targets
EBB machines such as the iDraw HSE and plans the whole drawing before the pen moves.

## Public API

- `installP5Penplotter(p5, PlotterEngine, { driver })` — installs the adapter explicitly; `driver` is optional and only needed for `plot.go()`.
- `createPlotterEngine(options)` — creates a core engine with, by default, the current canvas size and `px` as unit.
- `createPlot(options)` — creates a `P5Plot`: `point`, `line`, `circle`, `ellipse`, `arc`, `rect`, `square`, `triangle`, `quad`, `polyline` and `polygon` draw on the canvas and record in mm, with the same arguments as in p5; `hatch`, `crossHatch` and `stipple` fill a polygon; `clear()`, `plan()`, `connect()`, `go()` and `stop()` control the job; `engine` is the underlying `PlotterEngine`. Options: `x`, `y`, `width` (mm on the bed) or `mmPerPixel`, `profile`, `confirm`, `log`.
- `drawPlotPlan(plan, options)` — draws the actual planned result via p5.js.
- `drawPlanWithP5(p, plan, options)` — the same renderer without the prototype helper.

Version 0.2.0 targets p5.js 2.2.2. The core and hardware status are determined
solely by `vanilla.penplotter`.

## Test

```powershell
npm test
npm run docs
npm run manifest
```

`npm test` checks the adapter against a fake p5 and against the real engine in the sibling folder `../vanilla.penplotter` (or `VANILLA_PLOTTER_ROOT`), every local link on the site, that every example is in the gallery and the manifest, and that the generated architecture page is current.

## How this was made

Designed and directed by Sebastien Vanblaere, written with AI assistance, and held to one rule: nothing is claimed that a test or a plot on paper has not shown. See [About](https://seb-prjcts-be.github.io/p5.penplotter/docs/about.html).

MIT License.
