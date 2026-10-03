# How p5.penplotter works

## Recording geometry

Each supported shape call has two outputs: a p5 drawing on the canvas and geometry in the core engine. The adapter converts canvas pixels to millimetres using an offset and scale. It converts a circle's diameter to a radius; a point becomes a 0.24 mm dash. Core fills are converted back to pixels for display.

The recording contains the shapes added since the last `plot.clear()`. Clear replaces the geometry engine, while keeping the driver and open connection. Planning takes a snapshot of that recording; later changes to the canvas do not add strokes to an active job.

## Paper and coordinates

Paper dimensions come from `PlotterEngine.paperSize()`. The adapter resolves the sheet's orientation and position, then calculates the drawing's scale and offset. `plan()` checks the recorded strokes against the selected paper margins before connecting. The driver checks machine travel separately.

A bed preview displays the resolved sheet and plan. It does not change either. Paper placement does not establish a machine origin or reverse motor directions. See [Setup](setup.html#machine-origin) for the physical origin and [Guide](guide.html#paper) for placement examples.

## Jobs and the driver

The adapter supplies a complete PlotPlan to the core's driver. The driver compiles its movements into motor and pen commands and sends them through Web Serial. For the iDraw profile, EBB means EiBotBoard, the controller connected over USB.

`plot.sequence()` prepares and runs one complete job at a time. It waits for completion before asking for the next group. In the current p5 adapter, each group returns home and releases the motors. The [Guide](guide.html#werkwijzen) shows how to use it.

An experimental [core driver session](https://github.com/seb-prjcts-be/vanilla.penplotter/pull/1) retains position and motor steps between jobs. On 2026-10-03, three successive lines were plotted on the iDraw HSE / A2 with EBB 3.0.2, followed by one return home. Stop and fault cases were tested with simulated connections only. This session is not yet connected to the p5 sequence or included in the site's pinned imports. Adding geometry while the machine draws remains unimplemented.

![The JavaScript driver connects the plan to the EBB controller; the connectors show data flow.](images/animations/ebb.gif)

## Recording limits

The adapter records shape arguments, without reading p5's drawing state. `translate()`, `rotate()` and `scale()` do not transform recorded geometry. Rectangles use corner coordinates; ellipses use centre coordinates, regardless of screen modes. Colours, stroke weight and ordinary p5 fills stay on screen.

Text, general Bézier curves and arbitrary p5 sketches are not captured. For transformed shapes, calculate the coordinates before passing them to the plot. The [Guide](guide.html#reference) lists the available calls.

## Library boundaries

`p5.penplotter` installs helpers on the p5 prototype and owns the canvas-to-millimetre mapping. `vanilla.penplotter` owns geometry, SVG import, cleanup, route planning, file exports, machine profiles and drivers. See the [core architecture](https://seb-prjcts-be.github.io/vanilla.penplotter/docs/architecture.html) for those parts.

Installation checks the minimum dependencies; it does not verify every version combination. [Setup](setup.html) supplies the pinned imports and explains their load order.
