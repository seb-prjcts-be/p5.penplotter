# Architecture of p5.penplotter

`p5.penplotter` is an adapter, not a second engine.

## Responsibilities

- explicitly bind the `PlotterEngine` class to p5.js;
- use canvas dimensions as convenient defaults;
- draw a `PlotPlan` with p5.js;
- with `createPlot()`, both draw on the canvas and record in mm in a single call, and pass that job on to the supplied driver;
- support global and instance mode;
- show p5.waves examples.

## Not here

Geometry, SVG import, hatch, stippling, optimization, route planning, exports,
machine profiles and drivers remain exclusively in `vanilla.penplotter`. A bugfix
in that pipeline must never be copied into this repository.

## Installation contract

Automatic detection of global scripts looks simple but makes load order
and versions implicit. That is why installation is explicit:

```js
installP5Penplotter(p5, PlotterEngine);
```

This works with browser ESM, import maps and future package managers. The
adapter validates every plan against schema `vanilla.penplotter/plan@1` before it is
drawn.

## Driver contract

`plot.go()` contains no protocol, step or machine knowledge. The adapter is handed the
driver module of `vanilla.penplotter`:

```js
installP5Penplotter(p5, PlotterEngine, { driver: Ebb });
```

and uses only `EBB_PROFILES` (work area for the page size),
`createWebSerialTransport()` and `EbbDriver` from it. Converting pixels to
millimetres is adapter work, though: that is the translation from canvas to bed.
Bounds checking, speeds, safe stopping and the confirmation requirement remain in the
core; on top of that, the adapter itself asks the user for a confirmation.

## Version contract

The dependency runs in one direction: `p5.penplotter` uses `vanilla.penplotter`,
never the other way round. What the adapter needs is stated once in the code, as
`REQUIRES` in `p5.penplotter.js`. `package.json`, the manifest and the
*Requirements* table in the README are tested against it, and that table is literally
identical in the README of `vanilla.penplotter`.

When a driver is supplied, the adapter reads `PlotterEngine.version` and
refuses a core older than `REQUIRES.core` with a plain sentence instead of
an incomprehensible error later on. Without a driver, `createPlotterEngine()` and
`drawRoute()` keep working with any core.

The examples on this site deliberately load the core as a sibling folder, so that site and core
move together; they therefore get the latest version, not a pinned one. The
version check is the guardrail there, and when publishing the rule is: first
`vanilla.penplotter`, then `p5.penplotter`. Anyone who wants a fixed
version in their own project loads both libraries via jsDelivr on a tag, for example
`https://cdn.jsdelivr.net/gh/seb-prjcts-be/vanilla.penplotter@v0.3.1/vanilla.penplotter.js`.

## Rendering contract

`drawRoute()` draws `plan.routes`, not the original artwork. Preview,
SVG and hardware thereby show the same planned geometry and path reversal.
Pen-up travel remains a core preview feature and is not implemented twice.
