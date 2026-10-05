import { PlotterEngine } from "../../vanilla.penplotter/vanilla.penplotter.js";
import * as Ebb from "../../vanilla.penplotter/src/driver/ebb.js";
import * as Driver from "../../vanilla.penplotter/src/driver/index.js";
import { installP5Penplotter, P5Penplotter, P5Plot, drawPlanWithP5 } from "../p5.penplotter.js";

export { PlotterEngine, Ebb, Driver, P5Plot, drawPlanWithP5 };
export const metadata = Object.freeze({
  version: P5Penplotter.version,
  development: __PENPLOTTER_DEVELOPMENT__,
  coreVersion: PlotterEngine.version,
  coreCommit: __PENPLOTTER_CORE_COMMIT__
});

const installation = Symbol.for("p5.penplotter.installation");

export function install(p5Constructor) {
  if (typeof p5Constructor !== "function" || !p5Constructor.prototype) {
    throw new TypeError("Load p5.js before installing p5.penplotter.");
  }
  const version = String(p5Constructor.VERSION || "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!version || version.slice(1).map(Number).some((value, index, values) => {
    const required = [2, 2, 2];
    return values.slice(0, index).every((prior, i) => prior === required[i]) && value < required[index];
  })) {
    throw new Error("p5.penplotter needs p5.js 2.2.2 or newer.");
  }
  const previous = p5Constructor[installation];
  if (previous) {
    if (previous.version !== metadata.version || previous.coreCommit !== metadata.coreCommit) {
      throw new Error("A different p5.penplotter bundle is already installed. Load one version per sketch.");
    }
    return p5Constructor;
  }
  if (p5Constructor.prototype.createPlot) {
    throw new Error("p5.penplotter is already installed outside this bundle. Load one installation per sketch.");
  }
  installP5Penplotter(p5Constructor, PlotterEngine, { driver: Driver });
  Object.defineProperty(p5Constructor, installation, { value: metadata });
  return p5Constructor;
}

export default Object.freeze({ install, metadata });
