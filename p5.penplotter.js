// The contract with the outside world, stated once. package.json, the manifest
// and the README block are tested against these values.
export const REQUIRES = Object.freeze({ core: "0.2.0", p5: "2.2.2" });

function versionAtLeast(version, minimum) {
  const have = String(version).split(".").map(Number);
  const need = minimum.split(".").map(Number);
  for (let index = 0; index < need.length; index += 1) {
    if ((have[index] || 0) !== need[index]) return (have[index] || 0) > need[index];
  }
  return true;
}

// Direct plotting only works with a core that ships the EBB driver. A core
// without a version number predates it.
function assertDriver(EngineClass, driver) {
  if (!EngineClass.version || !versionAtLeast(EngineClass.version, REQUIRES.core)) {
    throw new Error(
      `p5.penplotter needs vanilla.penplotter ${REQUIRES.core} or newer for direct plotting; ` +
      `this one is ${EngineClass.version || "older than 0.2.0"}. Update vanilla.penplotter first.`
    );
  }
  for (const name of ["EbbDriver", "createWebSerialTransport", "EBB_PROFILES"]) {
    if (!driver[name]) {
      throw new Error(`The driver handed to installP5Penplotter has no ${name}; pass vanilla.penplotter's src/driver/ebb.js module.`);
    }
  }
}

function assertP5(p5Constructor) {
  if (!p5Constructor || !p5Constructor.prototype) {
    throw new TypeError("installP5Penplotter expects the p5 constructor.");
  }
}

function assertEngine(EngineClass) {
  if (typeof EngineClass !== "function") {
    throw new TypeError("installP5Penplotter expects the PlotterEngine class from vanilla.penplotter.");
  }
}

function assertPlan(plan) {
  if (!plan || plan.schema !== "vanilla.penplotter/plan@1" || !Array.isArray(plan.routes)) {
    throw new TypeError("drawPlotPlan expects a vanilla.penplotter plan.");
  }
}

export function drawPlanWithP5(p, plan, options = {}) {
  assertPlan(plan);
  const toolMap = new Map(plan.tools.map((tool) => [tool.id, tool]));
  p.push();
  p.noFill();
  for (const route of plan.routes) {
    const tool = toolMap.get(route.toolId) || {};
    p.stroke(tool.color || options.stroke || "#111111");
    p.strokeWeight(options.strokeWeight ?? 1);
    p.beginShape();
    for (const value of route.path.points) {
      p.vertex(value.x, value.y);
    }
    p.endShape();
  }
  p.pop();
}

function toPoint(value) {
  return Array.isArray(value) ? { x: value[0], y: value[1] } : { x: value.x, y: value.y };
}

// p5 sketches may run in angleMode(DEGREES); the engine always takes radians.
function toRadians(p, angle) {
  return typeof p.angleMode === "function" && p.angleMode() === "degrees" ? (angle * Math.PI) / 180 : angle;
}

// An ellipse or arc as points, the way the engine itself flattens a circle.
function ellipsePoints(x, y, w, h, start, stop) {
  const span = stop - start;
  const segments = Math.max(2, Math.ceil(Math.abs(span) / (Math.PI / 48)));
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = start + (span * index) / segments;
    points.push({ x: x + (Math.cos(angle) * w) / 2, y: y + (Math.sin(angle) * h) / 2 });
  }
  return points;
}

// A pen cannot dot: a point is a dash of a quarter millimetre, like stipple.
const POINT_RADIUS_MM = 0.12;

// One object for screen and paper: every shape method draws on the p5 canvas
// with the current p5 style AND records the same shape, in millimetres, in a
// vanilla.penplotter engine. The adapter holds no planner or hardware code; the
// driver kit (vanilla.penplotter's src/driver/ebb.js) is handed in on install.
export class P5Plot {
  constructor(p, EngineClass, options = {}) {
    this.p = p;
    this.EngineClass = EngineClass;
    this.options = options;
    this.kit = options.driver || null;
    this.profileId = options.profile || "idraw-hse-a2";
    this.offset = { x: options.x ?? 0, y: options.y ?? 0 };
    // width: how many millimetres wide the canvas lands on the bed.
    this.scale = options.width ? options.width / p.width : options.mmPerPixel ?? 1;
    this.transport = null;
    this.driver = null;
    this.busy = false;
    this.pending = null; // a go() waiting for the click that starts it
    this.status = "idle";
    this.clear();
  }

  clear() {
    const travel = this.kit?.EBB_PROFILES?.[this.profileId]?.travel;
    this.engine = new this.EngineClass({
      units: "mm",
      page: travel
        ? { ...travel }
        : { width: this.offset.x + this.p.width * this.scale, height: this.offset.y + this.p.height * this.scale }
    });
    return this;
  }

  toMm(x, y) {
    return { x: this.offset.x + x * this.scale, y: this.offset.y + y * this.scale };
  }

  toPx(point) {
    return { x: (point.x - this.offset.x) / this.scale, y: (point.y - this.offset.y) / this.scale };
  }

  point(x, y) {
    this.p.point(x, y);
    const c = this.toMm(x, y);
    this.engine.line(c.x - POINT_RADIUS_MM, c.y, c.x + POINT_RADIUS_MM, c.y);
    return this;
  }

  line(x1, y1, x2, y2) {
    this.p.line(x1, y1, x2, y2);
    const a = this.toMm(x1, y1);
    const b = this.toMm(x2, y2);
    this.engine.line(a.x, a.y, b.x, b.y);
    return this;
  }

  // Like p5: the third argument is the diameter.
  circle(x, y, diameter) {
    this.p.circle(x, y, diameter);
    const c = this.toMm(x, y);
    this.engine.circle(c.x, c.y, (diameter / 2) * this.scale);
    return this;
  }

  // Like p5: width and height, not radii. A circle-shaped ellipse stays a circle.
  ellipse(x, y, w, h = w) {
    this.p.ellipse(x, y, w, h);
    const c = this.toMm(x, y);
    if (w === h) this.engine.circle(c.x, c.y, (w / 2) * this.scale);
    else this.engine.polygon(ellipsePoints(c.x, c.y, w * this.scale, h * this.scale, 0, Math.PI * 2).slice(0, -1));
    return this;
  }

  // Like p5: angles follow angleMode(); mode is OPEN (default), CHORD or PIE.
  arc(x, y, w, h, start, stop, mode) {
    this.p.arc(x, y, w, h, start, stop, mode);
    const c = this.toMm(x, y);
    const a = toRadians(this.p, start);
    const b = toRadians(this.p, stop);
    const points = ellipsePoints(c.x, c.y, w * this.scale, h * this.scale, a, b);
    if (mode === "pie") this.engine.polygon([...points, c]);
    else if (mode === "chord") this.engine.polygon(points);
    else this.engine.polyline(points);
    return this;
  }

  // Like p5 in its default rectMode(CORNER).
  rect(x, y, width, height) {
    this.p.rect(x, y, width, height);
    const c = this.toMm(x, y);
    this.engine.rect(c.x, c.y, width * this.scale, height * this.scale);
    return this;
  }

  square(x, y, size) {
    return this.rect(x, y, size, size);
  }

  triangle(x1, y1, x2, y2, x3, y3) {
    this.p.triangle(x1, y1, x2, y2, x3, y3);
    this.engine.polygon([this.toMm(x1, y1), this.toMm(x2, y2), this.toMm(x3, y3)]);
    return this;
  }

  quad(x1, y1, x2, y2, x3, y3, x4, y4) {
    this.p.quad(x1, y1, x2, y2, x3, y3, x4, y4);
    this.engine.polygon([this.toMm(x1, y1), this.toMm(x2, y2), this.toMm(x3, y3), this.toMm(x4, y4)]);
    return this;
  }

  polyline(points) {
    return this.path(points, false);
  }

  polygon(points) {
    return this.path(points, true);
  }

  path(points, closed) {
    const list = points.map(toPoint);
    this.p.push();
    this.p.noFill();
    this.p.beginShape();
    for (const point of list) this.p.vertex(point.x, point.y);
    if (closed) this.p.endShape("close");
    else this.p.endShape();
    this.p.pop();
    const mm = list.map((point) => this.toMm(point.x, point.y));
    if (closed) this.engine.polygon(mm);
    else this.engine.polyline(mm);
    return this;
  }

  // Fills, as the engine plans them: spacing in millimetres on the bed, angle
  // in the sketch's angleMode(). The engine's own lines are drawn back on the
  // canvas so screen and paper show the same hatching.
  hatch(points, spacing = 2, angle = Math.PI / 4) {
    return this.pattern("hatch", points, { spacing, angle: toRadians(this.p, angle) });
  }

  crossHatch(points, spacing = 2, angle = Math.PI / 4) {
    return this.pattern("crossHatch", points, { spacing, angle: toRadians(this.p, angle) });
  }

  stipple(points, count = 200, seed = 1) {
    return this.pattern("stipple", points, { count, seed });
  }

  pattern(kind, points, options) {
    const mm = points.map(toPoint).map((point) => this.toMm(point.x, point.y));
    const paths = this.engine[kind](mm, options);
    for (const path of paths) {
      const a = this.toPx(path.points[0]);
      const b = this.toPx(path.points[path.points.length - 1]);
      if (kind === "stipple") this.p.point((a.x + b.x) / 2, (a.y + b.y) / 2);
      else this.p.line(a.x, a.y, b.x, b.y);
    }
    return this;
  }

  plan(options) {
    return this.engine.plan(options);
  }

  say(message) {
    this.status = message;
    if (this.options.log) this.options.log(message);
    else console.log(`[plot] ${message}`);
  }

  requireKit() {
    if (!this.kit?.EbbDriver || !this.kit?.createWebSerialTransport) {
      throw new Error("plot.go() needs the driver: installP5Penplotter(p5, PlotterEngine, { driver: Ebb }).");
    }
  }

  // Call from a key or mouse handler: the browser only shows its port list
  // after a user gesture. Use Chrome or Edge.
  async connect() {
    this.requireKit();
    if (this.transport) return this;
    const granted = globalThis.navigator?.serial ? await navigator.serial.getPorts() : [];
    const transport = this.kit.createWebSerialTransport(granted[0] ?? null, { filters: [] });
    try {
      await transport.open();
    } catch (error) {
      if (!/No port selected/i.test(error.message)) throw error;
      throw new Error("No plotter was chosen. If no list appeared at all, open this page in Chrome or Edge itself.");
    }
    this.transport = transport;
    this.driver = new this.kit.EbbDriver({ transport, profile: this.profileId });
    this.say("connected");
    return this;
  }

  // go() is written at the end of the drawing, like any other line of the
  // sketch. A browser shows its port list only after a click or a key, so
  // when go() runs from setup() or draw() it waits for one click on the
  // drawing; that click is also the "yes" to the safety checklist in the
  // status line. Called from a key or mouse handler, go() goes straight on
  // and asks once with a dialog. While plotting, a click on the drawing stops.
  hasGesture() {
    if (this.options.gesture) return this.options.gesture();
    const activation = globalThis.navigator?.userActivation;
    return activation ? activation.isActive : true;
  }

  clickTarget() {
    return this.p._renderer?.canvas || this.p.canvas || globalThis.document || null;
  }

  nextClick() {
    if (this.options.click) return this.options.click();
    const target = this.clickTarget();
    return new Promise((resolve) => target.addEventListener("click", resolve, { once: true }));
  }

  async go(options = {}) {
    this.requireKit();
    if (this.busy) return { status: "busy" };
    if (this.pending) return this.pending;
    if (this.hasGesture()) return this.start(options, false);
    this.say("Ready to plot. Carriage in the home corner, paper in place, hands clear? Click the drawing to start.");
    this.pending = this.nextClick().then(async () => {
      this.pending = null;
      try {
        return await this.start(options, true);
      } catch (error) {
        this.say(error.message);
        return { status: "failed", error };
      }
    });
    return this.pending;
  }

  async start(options, clicked) {
    const confirm = this.options.confirm || ((text) => globalThis.confirm(text));
    const plan = this.plan(options.plan);
    await this.connect();
    if (!clicked) {
      const ok = confirm([
        "Plot now?",
        "",
        "• The carriage is parked in the home corner.",
        "• Paper is in place, no magnet on the drawing or on the way to it.",
        "• Hands are clear of the arm."
      ].join("\n"));
      if (!ok) {
        this.say("cancelled");
        return { status: "cancelled" };
      }
    }
    this.busy = true;
    this.say("plotting… click the drawing to stop.");
    const target = this.clickTarget();
    const stopOnClick = () => this.stop();
    if (target) target.addEventListener("click", stopOnClick);
    try {
      const result = await this.driver.run(plan, { ...options, confirmed: true });
      this.say(`plot ${result.status}`);
      return result;
    } catch (error) {
      this.say(`stopped safely: ${error.message}`);
      throw error;
    } finally {
      if (target) target.removeEventListener("click", stopOnClick);
      this.busy = false;
    }
  }

  stop() {
    if (this.driver) this.driver.abort();
    this.say("stop requested");
    return this;
  }
}

export function installP5Penplotter(p5Constructor, EngineClass, installOptions = {}) {
  assertP5(p5Constructor);
  assertEngine(EngineClass);
  if (installOptions.driver) assertDriver(EngineClass, installOptions.driver);

  p5Constructor.prototype.createPlotterEngine = function createPlotterEngine(options = {}) {
    return new EngineClass({
      ...options,
      units: options.units || "px",
      page: {
        width: options.page?.width ?? options.width ?? this.width,
        height: options.page?.height ?? options.height ?? this.height,
        margin: options.page?.margin ?? options.margin ?? 0,
        ...(options.page || {})
      }
    });
  };

  p5Constructor.prototype.createPlot = function createPlot(options = {}) {
    return new P5Plot(this, EngineClass, { driver: installOptions.driver, ...options });
  };

  p5Constructor.prototype.drawPlotPlan = function drawPlotPlan(plan, options = {}) {
    return drawPlanWithP5(this, plan, options);
  };
  // The route is what you see: the plan, drawn the way the pen will run it.
  p5Constructor.prototype.drawRoute = p5Constructor.prototype.drawPlotPlan;

  return p5Constructor;
}

export const P5Penplotter = Object.freeze({
  version: "0.2.1",
  requires: REQUIRES,
  install: installP5Penplotter,
  draw: drawPlanWithP5
});

export default P5Penplotter;
