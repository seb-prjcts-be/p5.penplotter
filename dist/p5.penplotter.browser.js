/*! p5.penplotter + vanilla.penplotter — MIT License — Sebastien Vanblaere */
var P5PenplotterBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // browser/classic.js
  var classic_exports = {};
  __export(classic_exports, {
    Driver: () => driver_exports,
    Ebb: () => ebb_exports,
    P5Plot: () => P5Plot,
    PlotterEngine: () => PlotterEngine,
    drawPlanWithP5: () => drawPlanWithP5,
    install: () => install,
    metadata: () => metadata
  });

  // ../vanilla.penplotter/src/core/model.js
  var VALID_UNITS = /* @__PURE__ */ new Set(["mm", "cm", "in", "px"]);
  function millimetersPerUnit(units = "mm") {
    const scales = { mm: 1, cm: 10, in: 25.4, px: 25.4 / 96 };
    if (!VALID_UNITS.has(units)) throw new RangeError(`Unsupported unit: ${units}`);
    return scales[units];
  }
  var PAPER_SIZES = { A0: [841, 1189], A1: [594, 841], A2: [420, 594], A3: [297, 420], A4: [210, 297], A5: [148, 210], A6: [105, 148] };
  function paperSize(format, orientation = "portrait", units = "mm") {
    const size = PAPER_SIZES[String(format).toUpperCase()];
    if (!size) throw new RangeError(`Unknown paper format: ${format}`);
    if (!["portrait", "landscape"].includes(orientation)) throw new RangeError("Use portrait or landscape.");
    const scale = millimetersPerUnit(units);
    const [short, long] = size;
    return orientation === "portrait" ? { width: short / scale, height: long / scale } : { width: long / scale, height: short / scale };
  }
  var nextId = 1;
  function finite(value, label) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${label} must be a finite number.`);
    }
    return value;
  }
  function point(x, y) {
    return { x: finite(Number(x), "x"), y: finite(Number(y), "y") };
  }
  function clonePoint(value) {
    return point(value.x, value.y);
  }
  function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }
  function pathLength(points) {
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
      total += distance(points[index - 1], points[index]);
    }
    return total;
  }
  function createPath(points, options = {}) {
    if (!Array.isArray(points) || points.length === 0) {
      throw new TypeError("A path needs at least one point.");
    }
    const clean = points.map((value) => clonePoint(value));
    const closed = Boolean(options.closed);
    if (closed && clean.length > 1 && distance(clean[0], clean[clean.length - 1]) > 1e-9) {
      clean.push(clonePoint(clean[0]));
    }
    return {
      id: options.id || `path_${nextId++}`,
      points: clean,
      closed,
      reversible: options.reversible !== false,
      metadata: { ...options.metadata || {} }
    };
  }
  function createLayer(options = {}) {
    return {
      id: options.id || `layer_${nextId++}`,
      name: options.name || options.id || "Layer",
      toolId: options.toolId || "pen-1",
      visible: options.visible !== false,
      paths: Array.isArray(options.paths) ? options.paths.map((value) => createPath(value.points, value)) : [],
      metadata: { ...options.metadata || {} }
    };
  }
  function createTool(options = {}) {
    return {
      id: options.id || `pen-${nextId++}`,
      name: options.name || options.id || "Pen",
      color: options.color || "#111111",
      width: finite(Number(options.width ?? 0.35), "tool width"),
      kind: options.kind || "pen",
      metadata: { ...options.metadata || {} }
    };
  }
  function createDocument(options = {}) {
    const units = options.units || "mm";
    if (!VALID_UNITS.has(units)) {
      throw new RangeError(`Unsupported unit: ${units}`);
    }
    const page = options.page || {};
    const tools = Array.isArray(options.tools) && options.tools.length > 0 ? options.tools.map(createTool) : [createTool({ id: "pen-1", name: "Black pen", color: "#111111" })];
    return {
      schema: "vanilla.penplotter/document@1",
      units,
      page: {
        width: finite(Number(page.width ?? 210), "page width"),
        height: finite(Number(page.height ?? 297), "page height"),
        margin: finite(Number(page.margin ?? 10), "page margin"),
        origin: page.origin || "top-left"
      },
      tools,
      layers: Array.isArray(options.layers) ? options.layers.map(createLayer) : [],
      metadata: { ...options.metadata || {} }
    };
  }
  function cloneDocument(document) {
    const clone = createDocument({
      units: document.units,
      page: document.page,
      tools: document.tools,
      metadata: document.metadata
    });
    clone.layers = document.layers.map((layer) => createLayer(layer));
    return clone;
  }
  function addLayer(document, options = {}) {
    const layer = createLayer(options);
    document.layers.push(layer);
    return layer;
  }
  function addPath(layer, points, options = {}) {
    const path = createPath(points, options);
    layer.paths.push(path);
    return path;
  }
  function getLayer(document, id) {
    return document.layers.find((layer) => layer.id === id) || null;
  }
  function validateDocument(document) {
    if (!document || document.schema !== "vanilla.penplotter/document@1") {
      throw new TypeError("Expected a vanilla.penplotter document.");
    }
    const ids = /* @__PURE__ */ new Set();
    for (const layer of document.layers) {
      if (ids.has(layer.id)) throw new Error(`Duplicate id: ${layer.id}`);
      ids.add(layer.id);
      for (const path of layer.paths) {
        if (ids.has(path.id)) throw new Error(`Duplicate id: ${path.id}`);
        ids.add(path.id);
        for (const value of path.points) {
          finite(value.x, `${path.id}.x`);
          finite(value.y, `${path.id}.y`);
        }
      }
    }
    return true;
  }

  // ../vanilla.penplotter/src/geometry/primitives.js
  function positive(value, label) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${label} must be greater than zero.`);
    }
    return value;
  }
  function line(layer, x1, y1, x2, y2, options = {}) {
    return addPath(layer, [point(x1, y1), point(x2, y2)], options);
  }
  function polyline(layer, points, options = {}) {
    return addPath(layer, points, options);
  }
  function polygon(layer, points, options = {}) {
    return addPath(layer, points, { ...options, closed: true });
  }
  function rectangle(layer, x, y, width, height, options = {}) {
    positive(width, "width");
    positive(height, "height");
    return polygon(layer, [
      point(x, y),
      point(x + width, y),
      point(x + width, y + height),
      point(x, y + height)
    ], options);
  }
  function circle(layer, centerX, centerY, radius, options = {}) {
    positive(radius, "radius");
    const segments = Math.max(12, Math.floor(options.segments ?? 96));
    const points = [];
    for (let index = 0; index < segments; index += 1) {
      const angle = index / segments * Math.PI * 2;
      points.push(point(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      ));
    }
    return polygon(layer, points, options);
  }
  function arc(layer, centerX, centerY, radius, startAngle, endAngle, options = {}) {
    positive(radius, "radius");
    const span = endAngle - startAngle;
    const segments = Math.max(2, Math.ceil(Math.abs(span) / (Math.PI / 24)));
    const points = [];
    for (let index = 0; index <= segments; index += 1) {
      const angle = startAngle + span * index / segments;
      points.push(point(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      ));
    }
    return addPath(layer, points, options);
  }

  // ../vanilla.penplotter/src/geometry/patterns.js
  function rotate(value, angle) {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return point(
      value.x * cosine - value.y * sine,
      value.x * sine + value.y * cosine
    );
  }
  function openPolygon(points) {
    const clean = points.map(clonePoint);
    if (clean.length > 1 && distance(clean[0], clean[clean.length - 1]) < 1e-9) clean.pop();
    if (clean.length < 3) throw new TypeError("A fill polygon needs at least three points.");
    return clean;
  }
  function hatchPolygon(layer, polygonPoints, options = {}) {
    const spacing = Number(options.spacing ?? 2);
    if (!Number.isFinite(spacing) || spacing <= 0) {
      throw new RangeError("Hatch spacing must be greater than zero.");
    }
    const angle = Number(options.angle ?? Math.PI / 4);
    const source = openPolygon(polygonPoints);
    const rotated = source.map((value) => rotate(value, -angle));
    let minY = Infinity;
    let maxY = -Infinity;
    for (const value of rotated) {
      minY = Math.min(minY, value.y);
      maxY = Math.max(maxY, value.y);
    }
    const created = [];
    const startY = Math.floor(minY / spacing) * spacing;
    for (let y = startY; y <= maxY + 1e-9; y += spacing) {
      const intersections = [];
      for (let index = 0; index < rotated.length; index += 1) {
        const a = rotated[index];
        const b = rotated[(index + 1) % rotated.length];
        if (a.y <= y && b.y > y || b.y <= y && a.y > y) {
          const ratio = (y - a.y) / (b.y - a.y);
          intersections.push(a.x + ratio * (b.x - a.x));
        }
      }
      intersections.sort((a, b) => a - b);
      for (let index = 0; index + 1 < intersections.length; index += 2) {
        const start = rotate(point(intersections[index], y), angle);
        const end = rotate(point(intersections[index + 1], y), angle);
        created.push(addPath(layer, [start, end], {
          ...options,
          metadata: { ...options.metadata || {}, effect: "hatch" }
        }));
      }
    }
    return created;
  }
  function crossHatchPolygon(layer, polygonPoints, options = {}) {
    const angle = Number(options.angle ?? Math.PI / 4);
    const angleB = Number(options.angleB ?? angle + Math.PI / 2);
    return [
      ...hatchPolygon(layer, polygonPoints, { ...options, angle }),
      ...hatchPolygon(layer, polygonPoints, { ...options, angle: angleB })
    ];
  }
  function insidePolygon(value, polygon2) {
    let inside = false;
    for (let index = 0, previous = polygon2.length - 1; index < polygon2.length; previous = index, index += 1) {
      const a = polygon2[index];
      const b = polygon2[previous];
      const crosses = a.y > value.y !== b.y > value.y && value.x < (b.x - a.x) * (value.y - a.y) / (b.y - a.y) + a.x;
      if (crosses) inside = !inside;
    }
    return inside;
  }
  function randomFactory(seed) {
    let state = (Number(seed) || 1) >>> 0;
    return function random() {
      state += 1831565813;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }
  function stipplePolygon(layer, polygonPoints, options = {}) {
    const polygon2 = openPolygon(polygonPoints);
    const count = Math.max(0, Math.floor(options.count ?? 200));
    const minDistance = Math.max(0, Number(options.minDistance ?? 1.2));
    const radius = Math.max(0, Number(options.radius ?? 0.12));
    const attempts = Math.max(count * 20, Math.floor(options.attempts ?? count * 40));
    const random = randomFactory(options.seed ?? 1);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const value of polygon2) {
      minX = Math.min(minX, value.x);
      minY = Math.min(minY, value.y);
      maxX = Math.max(maxX, value.x);
      maxY = Math.max(maxY, value.y);
    }
    const accepted = [];
    for (let attempt = 0; attempt < attempts && accepted.length < count; attempt += 1) {
      const candidate = point(
        minX + random() * (maxX - minX),
        minY + random() * (maxY - minY)
      );
      if (!insidePolygon(candidate, polygon2)) continue;
      if (accepted.some((value) => distance(value, candidate) < minDistance)) continue;
      accepted.push(candidate);
    }
    const created = [];
    for (const center of accepted) {
      created.push(addPath(layer, [
        point(center.x - radius, center.y),
        point(center.x + radius, center.y)
      ], {
        ...options,
        metadata: { ...options.metadata || {}, effect: "stipple" }
      }));
    }
    return created;
  }

  // ../vanilla.penplotter/src/geometry/transform.js
  var Matrix = {
    identity() {
      return [1, 0, 0, 1, 0, 0];
    },
    translate(x, y) {
      return [1, 0, 0, 1, x, y];
    },
    scale(x, y = x) {
      return [x, 0, 0, y, 0, 0];
    },
    rotate(angle) {
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      return [cosine, sine, -sine, cosine, 0, 0];
    },
    multiply(a, b) {
      return [
        a[0] * b[0] + a[2] * b[1],
        a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3],
        a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4],
        a[1] * b[4] + a[3] * b[5] + a[5]
      ];
    }
  };
  function transformPoint(value, matrix) {
    return point(
      matrix[0] * value.x + matrix[2] * value.y + matrix[4],
      matrix[1] * value.x + matrix[3] * value.y + matrix[5]
    );
  }

  // ../vanilla.penplotter/src/geometry/svg.js
  var ARG_COUNTS = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  function tokenizePath(data) {
    return String(data).match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [];
  }
  function curvePoint(a, b, c, d, t) {
    const inverse = 1 - t;
    return point(
      inverse ** 3 * a.x + 3 * inverse ** 2 * t * b.x + 3 * inverse * t ** 2 * c.x + t ** 3 * d.x,
      inverse ** 3 * a.y + 3 * inverse ** 2 * t * b.y + 3 * inverse * t ** 2 * c.y + t ** 3 * d.y
    );
  }
  function quadraticPoint(a, b, c, t) {
    const inverse = 1 - t;
    return point(
      inverse ** 2 * a.x + 2 * inverse * t * b.x + t ** 2 * c.x,
      inverse ** 2 * a.y + 2 * inverse * t * b.y + t ** 2 * c.y
    );
  }
  function vectorAngle(ux, uy, vx, vy) {
    const dot = ux * vx + uy * vy;
    const length = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot / (length || 1))));
    return ux * vy - uy * vx < 0 ? -angle : angle;
  }
  function flattenArc(start, values, stepsPerTurn) {
    let [radiusX, radiusY, rotation, largeArc, sweep, endX, endY] = values;
    radiusX = Math.abs(radiusX);
    radiusY = Math.abs(radiusY);
    if (radiusX === 0 || radiusY === 0) return [point(endX, endY)];
    const phi = rotation * Math.PI / 180;
    const cosine = Math.cos(phi);
    const sine = Math.sin(phi);
    const xPrime = cosine * (start.x - endX) / 2 + sine * (start.y - endY) / 2;
    const yPrime = -sine * (start.x - endX) / 2 + cosine * (start.y - endY) / 2;
    const scale = Math.sqrt(xPrime ** 2 / radiusX ** 2 + yPrime ** 2 / radiusY ** 2);
    if (scale > 1) {
      radiusX *= scale;
      radiusY *= scale;
    }
    const numerator = Math.max(
      0,
      radiusX ** 2 * radiusY ** 2 - radiusX ** 2 * yPrime ** 2 - radiusY ** 2 * xPrime ** 2
    );
    const denominator = radiusX ** 2 * yPrime ** 2 + radiusY ** 2 * xPrime ** 2 || 1;
    const sign = largeArc === sweep ? -1 : 1;
    const factor = sign * Math.sqrt(numerator / denominator);
    const centerPrimeX = factor * radiusX * yPrime / radiusY;
    const centerPrimeY = factor * -radiusY * xPrime / radiusX;
    const centerX = cosine * centerPrimeX - sine * centerPrimeY + (start.x + endX) / 2;
    const centerY = sine * centerPrimeX + cosine * centerPrimeY + (start.y + endY) / 2;
    const startAngle = vectorAngle(1, 0, (xPrime - centerPrimeX) / radiusX, (yPrime - centerPrimeY) / radiusY);
    let delta = vectorAngle(
      (xPrime - centerPrimeX) / radiusX,
      (yPrime - centerPrimeY) / radiusY,
      (-xPrime - centerPrimeX) / radiusX,
      (-yPrime - centerPrimeY) / radiusY
    );
    if (!sweep && delta > 0) delta -= Math.PI * 2;
    if (sweep && delta < 0) delta += Math.PI * 2;
    const steps = Math.max(2, Math.ceil(Math.abs(delta) / (Math.PI * 2) * stepsPerTurn));
    const result = [];
    for (let index = 1; index <= steps; index += 1) {
      const angle = startAngle + delta * index / steps;
      const localX = radiusX * Math.cos(angle);
      const localY = radiusY * Math.sin(angle);
      result.push(point(
        centerX + cosine * localX - sine * localY,
        centerY + sine * localX + cosine * localY
      ));
    }
    return result;
  }
  function parseSVGPath(data, options = {}) {
    const tokens = tokenizePath(data);
    const curveSteps = Math.max(4, Math.floor(options.curveSteps ?? 16));
    const arcSteps = Math.max(12, Math.floor(options.arcSteps ?? 64));
    const paths = [];
    let currentPath = [];
    let current = point(0, 0);
    let subpathStart = point(0, 0);
    let command = "";
    let index = 0;
    let previousControl = null;
    function finish(closed = false) {
      if (currentPath.length > 0) paths.push({ points: currentPath, closed });
      currentPath = [];
    }
    while (index < tokens.length) {
      if (/^[a-zA-Z]$/.test(tokens[index])) command = tokens[index++];
      if (!command) throw new Error("SVG path data starts without a command.");
      const upper = command.toUpperCase();
      const relative = command !== upper;
      if (!(upper in ARG_COUNTS)) throw new Error(`Unsupported SVG path command: ${command}`);
      if (upper === "Z") {
        if (currentPath.length > 0) {
          currentPath.push(point(subpathStart.x, subpathStart.y));
          current = point(subpathStart.x, subpathStart.y);
          finish(true);
        }
        previousControl = null;
        command = "";
        continue;
      }
      const count = ARG_COUNTS[upper];
      if (index + count > tokens.length) throw new Error(`Incomplete SVG path command: ${command}`);
      const values = tokens.slice(index, index + count).map(Number);
      if (values.some((value) => !Number.isFinite(value))) throw new Error("Invalid SVG path number.");
      index += count;
      const absolutePoint = (x, y) => point(relative ? current.x + x : x, relative ? current.y + y : y);
      if (upper === "M") {
        if (currentPath.length > 0) finish(false);
        current = absolutePoint(values[0], values[1]);
        subpathStart = point(current.x, current.y);
        currentPath.push(point(current.x, current.y));
        command = relative ? "l" : "L";
      } else if (upper === "L") {
        current = absolutePoint(values[0], values[1]);
        currentPath.push(point(current.x, current.y));
      } else if (upper === "H") {
        current = point(relative ? current.x + values[0] : values[0], current.y);
        currentPath.push(point(current.x, current.y));
      } else if (upper === "V") {
        current = point(current.x, relative ? current.y + values[0] : values[0]);
        currentPath.push(point(current.x, current.y));
      } else if (upper === "C") {
        const controlA = absolutePoint(values[0], values[1]);
        const controlB = absolutePoint(values[2], values[3]);
        const end = absolutePoint(values[4], values[5]);
        for (let step = 1; step <= curveSteps; step += 1) {
          currentPath.push(curvePoint(current, controlA, controlB, end, step / curveSteps));
        }
        current = end;
        previousControl = controlB;
      } else if (upper === "S") {
        const controlA = previousControl ? point(current.x * 2 - previousControl.x, current.y * 2 - previousControl.y) : point(current.x, current.y);
        const controlB = absolutePoint(values[0], values[1]);
        const end = absolutePoint(values[2], values[3]);
        for (let step = 1; step <= curveSteps; step += 1) {
          currentPath.push(curvePoint(current, controlA, controlB, end, step / curveSteps));
        }
        current = end;
        previousControl = controlB;
      } else if (upper === "Q" || upper === "T") {
        const control = upper === "Q" ? absolutePoint(values[0], values[1]) : previousControl ? point(current.x * 2 - previousControl.x, current.y * 2 - previousControl.y) : point(current.x, current.y);
        const end = upper === "Q" ? absolutePoint(values[2], values[3]) : absolutePoint(values[0], values[1]);
        for (let step = 1; step <= curveSteps; step += 1) {
          currentPath.push(quadraticPoint(current, control, end, step / curveSteps));
        }
        current = end;
        previousControl = control;
      } else if (upper === "A") {
        const end = absolutePoint(values[5], values[6]);
        const arcValues = values.slice();
        arcValues[5] = end.x;
        arcValues[6] = end.y;
        currentPath.push(...flattenArc(current, arcValues, arcSteps));
        current = end;
        previousControl = null;
      }
      if (!["C", "S", "Q", "T"].includes(upper)) previousControl = null;
    }
    if (currentPath.length > 0) finish(false);
    return paths;
  }
  function parsePoints(value) {
    const numbers = String(value).match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g)?.map(Number) || [];
    const points = [];
    for (let index = 0; index + 1 < numbers.length; index += 2) points.push(point(numbers[index], numbers[index + 1]));
    return points;
  }
  function parseTransform(value) {
    let matrix = Matrix.identity();
    const pattern = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
    for (const match of String(value || "").matchAll(pattern)) {
      const values = match[2].match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g)?.map(Number) || [];
      let next = Matrix.identity();
      if (match[1] === "matrix" && values.length >= 6) next = values.slice(0, 6);
      else if (match[1] === "translate") next = Matrix.translate(values[0] || 0, values[1] || 0);
      else if (match[1] === "scale") next = Matrix.scale(values[0] ?? 1, values[1] ?? values[0] ?? 1);
      else if (match[1] === "rotate") {
        const rotation = Matrix.rotate((values[0] || 0) * Math.PI / 180);
        next = values.length >= 3 ? Matrix.multiply(Matrix.translate(values[1], values[2]), Matrix.multiply(rotation, Matrix.translate(-values[1], -values[2]))) : rotation;
      } else if (match[1] === "skewX") next = [1, 0, Math.tan((values[0] || 0) * Math.PI / 180), 1, 0, 0];
      else if (match[1] === "skewY") next = [1, Math.tan((values[0] || 0) * Math.PI / 180), 0, 1, 0, 0];
      matrix = Matrix.multiply(matrix, next);
    }
    return matrix;
  }
  function numberAttribute(node, name, fallback = 0) {
    const value = Number.parseFloat(node.getAttribute(name));
    return Number.isFinite(value) ? value : fallback;
  }
  function importSVG(svgText, options = {}) {
    const Parser = options.DOMParser || globalThis.DOMParser;
    if (!Parser) throw new Error("SVG import needs DOMParser. In Node, pass { DOMParser } from an XML package.");
    const xml = new Parser().parseFromString(String(svgText), "image/svg+xml");
    if (xml.querySelector("parsererror")) throw new Error("Invalid SVG input.");
    const root = xml.documentElement;
    const viewBox = parsePoints(root.getAttribute("viewBox"));
    const document = createDocument({
      units: options.units || "mm",
      page: {
        width: numberAttribute(root, "width", options.width || (viewBox[1]?.x ?? 210)),
        height: numberAttribute(root, "height", options.height || (viewBox[1]?.y ?? 297)),
        margin: 0
      },
      metadata: { importedFrom: "svg" }
    });
    const layer = addLayer(document, { id: options.layerId || "svg", name: options.layerName || "SVG import" });
    function visit(node, parentMatrix) {
      if (node.nodeType !== 1) return;
      const matrix = Matrix.multiply(parentMatrix, parseTransform(node.getAttribute("transform")));
      const tag = node.tagName.toLowerCase();
      const paths = [];
      if (tag === "path") paths.push(...parseSVGPath(node.getAttribute("d") || "", options));
      else if (tag === "line") paths.push({ points: [point(numberAttribute(node, "x1"), numberAttribute(node, "y1")), point(numberAttribute(node, "x2"), numberAttribute(node, "y2"))], closed: false });
      else if (tag === "polyline" || tag === "polygon") paths.push({ points: parsePoints(node.getAttribute("points")), closed: tag === "polygon" });
      else if (tag === "rect") {
        const x = numberAttribute(node, "x");
        const y = numberAttribute(node, "y");
        const width = numberAttribute(node, "width");
        const height = numberAttribute(node, "height");
        paths.push({ points: [point(x, y), point(x + width, y), point(x + width, y + height), point(x, y + height)], closed: true });
      } else if (tag === "circle" || tag === "ellipse") {
        const centerX = numberAttribute(node, "cx");
        const centerY = numberAttribute(node, "cy");
        const radiusX = tag === "circle" ? numberAttribute(node, "r") : numberAttribute(node, "rx");
        const radiusY = tag === "circle" ? radiusX : numberAttribute(node, "ry");
        const points = [];
        const segments = Math.max(12, Math.floor(options.circleSegments ?? 96));
        for (let index = 0; index < segments; index += 1) {
          const angle = index / segments * Math.PI * 2;
          points.push(point(centerX + Math.cos(angle) * radiusX, centerY + Math.sin(angle) * radiusY));
        }
        paths.push({ points, closed: true });
      }
      for (const path of paths) {
        if (path.points.length === 0) continue;
        addPath(layer, path.points.map((value) => transformPoint(value, matrix)), {
          closed: path.closed,
          metadata: { source: "svg", sourceTag: tag, sourceId: node.id || null }
        });
      }
      for (const child of node.children || []) visit(child, matrix);
    }
    visit(root, Matrix.identity());
    return document;
  }

  // ../vanilla.penplotter/src/optimizer/index.js
  function perpendicularDistance(value, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) return distance(value, start);
    const ratio = Math.max(0, Math.min(
      1,
      ((value.x - start.x) * dx + (value.y - start.y) * dy) / (dx * dx + dy * dy)
    ));
    const projected = { x: start.x + ratio * dx, y: start.y + ratio * dy };
    return distance(value, projected);
  }
  function simplifyPath(points, tolerance = 0.05) {
    if (points.length <= 2 || tolerance <= 0) return points.map(clonePoint);
    let maxDistance = 0;
    let splitIndex = 0;
    for (let index = 1; index < points.length - 1; index += 1) {
      const current = perpendicularDistance(points[index], points[0], points[points.length - 1]);
      if (current > maxDistance) {
        maxDistance = current;
        splitIndex = index;
      }
    }
    if (maxDistance <= tolerance) return [clonePoint(points[0]), clonePoint(points[points.length - 1])];
    const left = simplifyPath(points.slice(0, splitIndex + 1), tolerance);
    const right = simplifyPath(points.slice(splitIndex), tolerance);
    return left.slice(0, -1).concat(right);
  }
  function resamplePath(points, maxSegmentLength = 1) {
    if (points.length <= 1 || maxSegmentLength <= 0) return points.map(clonePoint);
    const result = [clonePoint(points[0])];
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      const length = distance(start, end);
      const segments = Math.max(1, Math.ceil(length / maxSegmentLength));
      for (let step = 1; step <= segments; step += 1) {
        const ratio = step / segments;
        result.push({
          x: start.x + (end.x - start.x) * ratio,
          y: start.y + (end.y - start.y) * ratio
        });
      }
    }
    return result;
  }
  function quantize(value, tolerance) {
    return Math.round(value / tolerance);
  }
  function pathKey(path, tolerance) {
    const forward = path.points.map((value) => `${quantize(value.x, tolerance)},${quantize(value.y, tolerance)}`).join(";");
    if (!path.reversible) return forward;
    const reverse = path.points.slice().reverse().map((value) => `${quantize(value.x, tolerance)},${quantize(value.y, tolerance)}`).join(";");
    return forward < reverse ? forward : reverse;
  }
  function deduplicatePaths(paths, tolerance = 0.01) {
    const seen = /* @__PURE__ */ new Set();
    const result = [];
    for (const path of paths) {
      const key = pathKey(path, Math.max(tolerance, 1e-9));
      if (!seen.has(key)) {
        seen.add(key);
        result.push(createPath(path.points, path));
      }
    }
    return result;
  }
  function reversePoints(points) {
    return points.slice().reverse().map(clonePoint);
  }
  function tryMerge(a, b, tolerance) {
    if (a.closed || b.closed || !a.reversible || !b.reversible) return null;
    const aStart = a.points[0];
    const aEnd = a.points[a.points.length - 1];
    const bStart = b.points[0];
    const bEnd = b.points[b.points.length - 1];
    if (distance(aEnd, bStart) <= tolerance) return a.points.concat(b.points.slice(1));
    if (distance(aEnd, bEnd) <= tolerance) return a.points.concat(reversePoints(b.points).slice(1));
    if (distance(aStart, bEnd) <= tolerance) return b.points.concat(a.points.slice(1));
    if (distance(aStart, bStart) <= tolerance) return reversePoints(b.points).concat(a.points.slice(1));
    return null;
  }
  function mergePaths(paths, tolerance = 0.05) {
    const remaining = paths.map((path) => createPath(path.points, path));
    let changed = true;
    while (changed) {
      changed = false;
      outer: for (let aIndex = 0; aIndex < remaining.length; aIndex += 1) {
        for (let bIndex = aIndex + 1; bIndex < remaining.length; bIndex += 1) {
          const merged = tryMerge(remaining[aIndex], remaining[bIndex], tolerance);
          if (!merged) continue;
          remaining[aIndex] = createPath(merged, {
            ...remaining[aIndex],
            id: remaining[aIndex].id,
            metadata: {
              ...remaining[aIndex].metadata,
              mergedFrom: [remaining[aIndex].id, remaining[bIndex].id]
            }
          });
          remaining.splice(bIndex, 1);
          changed = true;
          break outer;
        }
      }
    }
    return remaining;
  }
  function removeDegeneratePaths(paths, minLength = 0.01) {
    return paths.filter((path) => path.metadata.effect === "stipple" || pathLength(path.points) >= minLength).map((path) => createPath(path.points, path));
  }
  function optimizeDocument(document, options = {}, pluginHost = null) {
    const result = cloneDocument(document);
    const passes = options.passes || ["deduplicate", "merge", "simplify", "resample", "clean"];
    for (const layer of result.layers) {
      let paths = layer.paths;
      for (const pass of passes) {
        if (pass === "deduplicate") paths = deduplicatePaths(paths, options.duplicateTolerance ?? 0.01);
        else if (pass === "merge") paths = mergePaths(paths, options.mergeTolerance ?? 0.05);
        else if (pass === "simplify") {
          paths = paths.map((path) => createPath(
            simplifyPath(path.points, options.simplifyTolerance ?? 0.03),
            path
          ));
        } else if (pass === "resample" && options.maxSegmentLength) {
          paths = paths.map((path) => createPath(
            resamplePath(path.points, options.maxSegmentLength),
            path
          ));
        } else if (pass === "clean") {
          paths = removeDegeneratePaths(paths, options.minPathLength ?? 0.01);
        } else if (pluginHost && pluginHost.has("optimizer", pass)) {
          paths = pluginHost.get("optimizer", pass)(paths, options, layer);
        } else if (!["resample"].includes(pass)) {
          throw new Error(`Unknown optimizer pass: ${pass}`);
        }
      }
      layer.paths = paths;
    }
    return result;
  }

  // ../vanilla.penplotter/src/planner/index.js
  function reversePath(path) {
    return createPath(path.points.slice().reverse(), path);
  }
  function nearestClosedSeam(path, current) {
    const points = path.points.slice(0, -1);
    if (!current || points.length === 0) return createPath(path.points, path);
    let nearest = 0;
    let best = Infinity;
    for (let index = 0; index < points.length; index += 1) {
      const candidate = distance(current, points[index]);
      if (candidate < best) {
        best = candidate;
        nearest = index;
      }
    }
    const rotated = points.slice(nearest).concat(points.slice(0, nearest));
    rotated.push(clonePoint(rotated[0]));
    return createPath(rotated, path);
  }
  function orderPathsNearest(paths, start = { x: 0, y: 0 }, options = {}) {
    const remaining = paths.map((path) => createPath(path.points, path));
    const result = [];
    let current = clonePoint(start);
    while (remaining.length > 0) {
      let bestIndex = 0;
      let bestDistance = Infinity;
      let shouldReverse = false;
      for (let index = 0; index < remaining.length; index += 1) {
        const path = remaining[index];
        if (path.closed) {
          const seamPath = nearestClosedSeam(path, current);
          const candidate2 = distance(current, seamPath.points[0]);
          if (candidate2 < bestDistance) {
            bestDistance = candidate2;
            bestIndex = index;
            shouldReverse = false;
          }
          continue;
        }
        const startDistance = distance(current, path.points[0]);
        const endDistance = path.reversible ? distance(current, path.points[path.points.length - 1]) : Infinity;
        const candidate = Math.min(startDistance, endDistance);
        if (candidate < bestDistance) {
          bestDistance = candidate;
          bestIndex = index;
          shouldReverse = endDistance < startDistance;
        }
      }
      let selected = remaining.splice(bestIndex, 1)[0];
      if (selected.closed && options.reloop !== false) selected = nearestClosedSeam(selected, current);
      else if (shouldReverse) selected = reversePath(selected);
      result.push(selected);
      current = clonePoint(selected.points[selected.points.length - 1]);
    }
    return result;
  }
  var PLAN_DEFAULTS = Object.freeze({
    drawSpeed: 40,
    // mm/s
    travelSpeed: 40,
    // mm/s
    acceleration: 800,
    // mm/s², drawing
    travelAcceleration: 300,
    // mm/s², pen up
    liftDelay: 0.6,
    // s per stroke: pen down and up again
    toolChangeDelay: 15
    // s
  });
  function planTiming(options = {}) {
    const positive4 = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
    const atLeastZero = (value, fallback) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : fallback;
    return {
      drawSpeed: positive4(options.drawSpeed, PLAN_DEFAULTS.drawSpeed),
      travelSpeed: positive4(options.travelSpeed, PLAN_DEFAULTS.travelSpeed),
      acceleration: atLeastZero(options.acceleration, PLAN_DEFAULTS.acceleration),
      travelAcceleration: atLeastZero(options.travelAcceleration, PLAN_DEFAULTS.travelAcceleration),
      liftDelay: atLeastZero(options.liftDelay, PLAN_DEFAULTS.liftDelay),
      toolChangeDelay: atLeastZero(options.toolChangeDelay, PLAN_DEFAULTS.toolChangeDelay)
    };
  }
  function moveSeconds(length, speed, acceleration) {
    if (!(length > 0)) return 0;
    if (!(acceleration > 0)) return length / speed;
    const ramps = speed * speed / acceleration;
    if (length >= ramps) return length / speed + speed / acceleration;
    return 2 * Math.sqrt(length / acceleration);
  }
  function estimatePlan(stats, options = {}, moves = null) {
    const timing = planTiming(options);
    const scale = millimetersPerUnit(options.units);
    const motion = moves ? moves.reduce((sum, move) => sum + (move.type === "draw" ? moveSeconds(move.length * scale, timing.drawSpeed, timing.acceleration) : move.type === "travel" ? moveSeconds(move.length * scale, timing.travelSpeed, timing.travelAcceleration) : 0), 0) : moveSeconds(stats.drawDistance * scale, timing.drawSpeed, timing.acceleration) + moveSeconds(stats.travelDistance * scale, timing.travelSpeed, timing.travelAcceleration);
    const swaps = Math.max(0, stats.toolChanges - 1);
    return motion + stats.penLifts * timing.liftDelay + swaps * timing.toolChangeDelay;
  }
  function planDocument(document, options = {}) {
    validateDocument(document);
    const origin = options.origin || { x: 0, y: 0 };
    let current = clonePoint(origin);
    let currentTool = null;
    const moves = [];
    const routes = [];
    const stats = {
      paths: 0,
      points: 0,
      drawDistance: 0,
      travelDistance: 0,
      penLifts: 0,
      penDowns: 0,
      toolChanges: 0,
      penChanges: 0,
      // the same count under the word people use
      estimatedSeconds: 0
    };
    for (const layer of document.layers) {
      if (!layer.visible || layer.paths.length === 0) continue;
      if (currentTool !== layer.toolId) {
        currentTool = layer.toolId;
        stats.toolChanges += 1;
        stats.penChanges = stats.toolChanges;
        moves.push({ type: "tool-change", toolId: currentTool, layerId: layer.id });
      }
      const ordered = options.strategy === "input" || options.strategy === "drawn" ? layer.paths.map((path) => createPath(path.points, path)) : orderPathsNearest(layer.paths, current, options);
      for (const path of ordered) {
        const start = path.points[0];
        const travelLength = distance(current, start);
        if (travelLength > 1e-9) {
          moves.push({
            type: "travel",
            from: clonePoint(current),
            to: clonePoint(start),
            length: travelLength,
            layerId: layer.id,
            toolId: currentTool
          });
          stats.travelDistance += travelLength;
        }
        const drawLength = pathLength(path.points);
        moves.push({
          type: "draw",
          points: path.points.map(clonePoint),
          length: drawLength,
          pathId: path.id,
          layerId: layer.id,
          toolId: currentTool,
          metadata: { ...path.metadata }
        });
        routes.push({ layerId: layer.id, toolId: currentTool, path });
        stats.paths += 1;
        stats.points += path.points.length;
        stats.drawDistance += drawLength;
        stats.penDowns += 1;
        stats.penLifts += 1;
        current = clonePoint(path.points[path.points.length - 1]);
      }
    }
    stats.estimatedSeconds = estimatePlan(stats, { ...options, units: document.units }, moves);
    return {
      schema: "vanilla.penplotter/plan@1",
      units: document.units,
      page: { ...document.page },
      tools: document.tools.map((tool) => ({ ...tool, metadata: { ...tool.metadata } })),
      routes,
      moves,
      stats,
      // The timing the estimate used, so a driver can take the same speeds.
      options: { ...planTiming(options), ...options }
    };
  }

  // ../vanilla.penplotter/src/renderer/index.js
  function number(value, precision = 3) {
    return Number(value.toFixed(precision)).toString();
  }
  function escapeXml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  }
  function pathData(points, precision) {
    return points.map((value, index) => `${index === 0 ? "M" : "L"}${number(value.x, precision)} ${number(value.y, precision)}`).join(" ");
  }
  function renderSVG(plan, options = {}) {
    const precision = Math.max(0, Math.floor(options.precision ?? 3));
    const toolMap = new Map(plan.tools.map((tool) => [tool.id, tool]));
    const routesByLayer = /* @__PURE__ */ new Map();
    for (const route of plan.routes) {
      if (!routesByLayer.has(route.layerId)) routesByLayer.set(route.layerId, []);
      routesByLayer.get(route.layerId).push(route);
    }
    const body = [];
    for (const [layerId, routes] of routesByLayer) {
      const tool = toolMap.get(routes[0].toolId) || {};
      body.push(`<g id="${escapeXml(layerId)}" data-tool="${escapeXml(routes[0].toolId)}">`);
      for (let index = 0; index < routes.length; index += 1) {
        const route = routes[index];
        body.push(`<path d="${pathData(route.path.points, precision)}" data-order="${index + 1}" data-path="${escapeXml(route.path.id)}"/>`);
      }
      body.push(`</g>`);
      body.push(`<metadata data-layer="${escapeXml(layerId)}" data-pen-color="${escapeXml(tool.color || "#111111")}"/>`);
    }
    const travel = options.showTravel ? plan.moves.filter((move) => move.type === "travel").map((move) => `<path class="pen-up" d="M${number(move.from.x, precision)} ${number(move.from.y, precision)} L${number(move.to.x, precision)} ${number(move.to.y, precision)}"/>`).join("") : "";
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${plan.page.width}${plan.units}" height="${plan.page.height}${plan.units}" viewBox="0 0 ${plan.page.width} ${plan.page.height}">
<style>path{fill:none;stroke:#111;stroke-width:.35;stroke-linecap:round;stroke-linejoin:round}.pen-up{stroke:#e05a47;stroke-width:.18;stroke-dasharray:1 1;opacity:.65}</style>
${body.join("\n")}
${travel}
</svg>`;
  }
  function renderHPGL(plan, options = {}) {
    const unitsPerMm = Number(options.unitsPerMm ?? 40) * millimetersPerUnit(plan.units);
    const penMap = options.penMap || {};
    const commands = ["IN"];
    let pen = 1;
    for (const move of plan.moves) {
      if (move.type === "tool-change") {
        pen = Number(penMap[move.toolId] ?? pen + (commands.length > 1 ? 1 : 0));
        commands.push(`SP${pen}`);
      } else if (move.type === "travel") {
        commands.push(`PU${Math.round(move.to.x * unitsPerMm)},${Math.round(move.to.y * unitsPerMm)}`);
      } else if (move.type === "draw") {
        const start = move.points[0];
        commands.push(`PU${Math.round(start.x * unitsPerMm)},${Math.round(start.y * unitsPerMm)}`);
        const coordinates = move.points.map((value) => `${Math.round(value.x * unitsPerMm)},${Math.round(value.y * unitsPerMm)}`).join(",");
        commands.push(`PD${coordinates}`);
        commands.push("PU");
      }
    }
    commands.push("SP0");
    return `${commands.join(";")};`;
  }
  function renderGCode(plan, options = {}) {
    const scale = millimetersPerUnit(plan.units);
    const coordinate = (value) => number(value * scale);
    const drawFeed = Number(options.drawFeed ?? 1800);
    const travelFeed = Number(options.travelFeed ?? 4200);
    const penUp = options.penUp || "M5";
    const penDown = options.penDown || "M3 S1000";
    const lines = ["G21", "G90", penUp];
    for (const move of plan.moves) {
      if (move.type === "tool-change") {
        lines.push(`; tool ${move.toolId}`);
      } else if (move.type === "travel") {
        lines.push(penUp);
        lines.push(`G0 X${coordinate(move.to.x)} Y${coordinate(move.to.y)} F${travelFeed}`);
      } else if (move.type === "draw") {
        const start = move.points[0];
        lines.push(penUp);
        lines.push(`G0 X${coordinate(start.x)} Y${coordinate(start.y)} F${travelFeed}`);
        lines.push(penDown);
        for (let index = 1; index < move.points.length; index += 1) {
          const value = move.points[index];
          lines.push(`G1 X${coordinate(value.x)} Y${coordinate(value.y)} F${drawFeed}`);
        }
        lines.push(penUp);
      }
    }
    lines.push("M2");
    return `${lines.join("\n")}
`;
  }
  function renderJSON(plan, options = {}) {
    return JSON.stringify(plan, null, options.compact ? 0 : 2);
  }
  function drawPreview(context, plan, options = {}) {
    const width = context.canvas.width;
    const height = context.canvas.height;
    const padding = Number(options.padding ?? 24);
    const scale = Math.min(
      (width - padding * 2) / plan.page.width,
      (height - padding * 2) / plan.page.height
    );
    const offsetX = (width - plan.page.width * scale) / 2;
    const offsetY = (height - plan.page.height * scale) / 2;
    context.clearRect(0, 0, width, height);
    context.fillStyle = options.paper || "#f7f4ec";
    context.fillRect(offsetX, offsetY, plan.page.width * scale, plan.page.height * scale);
    if (options.showTravel) {
      context.save();
      context.setLineDash([4, 4]);
      context.strokeStyle = options.travelColor || "rgba(222, 78, 55, .45)";
      context.lineWidth = 1;
      for (const move of plan.moves) {
        if (move.type !== "travel") continue;
        context.beginPath();
        context.moveTo(offsetX + move.from.x * scale, offsetY + move.from.y * scale);
        context.lineTo(offsetX + move.to.x * scale, offsetY + move.to.y * scale);
        context.stroke();
      }
      context.restore();
    }
    const toolMap = new Map(plan.tools.map((tool) => [tool.id, tool]));
    const progress = Math.max(0, Math.min(1, Number(options.progress ?? 1)));
    const drawMoves = plan.moves.filter((move) => move.type === "draw");
    const visibleCount = Math.ceil(drawMoves.length * progress);
    context.lineCap = "round";
    context.lineJoin = "round";
    for (let moveIndex = 0; moveIndex < visibleCount; moveIndex += 1) {
      const move = drawMoves[moveIndex];
      const tool = toolMap.get(move.toolId) || {};
      context.strokeStyle = tool.color || options.ink || "#151515";
      context.lineWidth = Math.max(0.75, Number(tool.width ?? 0.35) * scale);
      context.beginPath();
      for (let index = 0; index < move.points.length; index += 1) {
        const value = move.points[index];
        const x = offsetX + value.x * scale;
        const y = offsetY + value.y * scale;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
  }
  function drawBed(context, plan, options = {}) {
    const bed = options.bed || { width: 594, height: 432 };
    const sheet = options.sheet || null;
    const { width: canvasWidth, height: canvasHeight } = context.canvas;
    const scale = Math.min(canvasWidth / bed.width, canvasHeight / bed.height);
    const perUnit = millimetersPerUnit(plan.units);
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = options.paper || "#fff";
    context.fillRect(0, 0, bed.width * scale, bed.height * scale);
    context.strokeStyle = "#000";
    context.lineWidth = 1;
    context.strokeRect(0.5, 0.5, bed.width * scale - 1, bed.height * scale - 1);
    if (sheet) {
      context.fillStyle = "rgba(0,0,0,.05)";
      context.fillRect(sheet.x * scale, sheet.y * scale, sheet.width * scale, sheet.height * scale);
      context.strokeStyle = "rgba(0,0,0,.4)";
      context.strokeRect(sheet.x * scale + 0.5, sheet.y * scale + 0.5, sheet.width * scale, sheet.height * scale);
    }
    context.strokeStyle = options.ink || "#000";
    context.lineWidth = 0.8;
    context.beginPath();
    for (const move of plan.moves) {
      if (move.type !== "draw") continue;
      move.points.forEach((p, index) => {
        const x = p.x * perUnit * scale;
        const y = p.y * perUnit * scale;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
    }
    context.stroke();
    context.fillStyle = "#000";
    context.beginPath();
    context.arc(0, 0, 5, 0, Math.PI * 2);
    context.fill();
    if (options.labels !== false) {
      context.font = "12px Inter, Arial, sans-serif";
      context.fillText("home · X along the long rail →", 10, 16);
      context.save();
      context.translate(14, 30);
      context.rotate(Math.PI / 2);
      context.fillText("Y along the arm →", 0, 0);
      context.restore();
    }
  }

  // ../vanilla.penplotter/src/plugins/index.js
  var TYPES = /* @__PURE__ */ new Set(["optimizer", "effect", "renderer", "driver"]);
  var PluginHost = class {
    constructor() {
      this.registry = /* @__PURE__ */ new Map();
      for (const type of TYPES) this.registry.set(type, /* @__PURE__ */ new Map());
    }
    register(type, name, implementation) {
      if (!TYPES.has(type)) throw new Error(`Unknown plugin type: ${type}`);
      if (!name || typeof implementation !== "function") {
        throw new TypeError("A plugin registration needs a name and function.");
      }
      const collection = this.registry.get(type);
      if (collection.has(name)) throw new Error(`Plugin already registered: ${type}:${name}`);
      collection.set(name, implementation);
      return this;
    }
    use(plugin) {
      if (!plugin || typeof plugin.install !== "function") {
        throw new TypeError("A plugin needs an install(host) method.");
      }
      plugin.install(this);
      return this;
    }
    has(type, name) {
      return this.registry.get(type)?.has(name) || false;
    }
    get(type, name) {
      const implementation = this.registry.get(type)?.get(name);
      if (!implementation) throw new Error(`Unknown plugin: ${type}:${name}`);
      return implementation;
    }
  };

  // ../vanilla.penplotter/src/driver/index.js
  var driver_exports = {};
  __export(driver_exports, {
    DrawCoreDriver: () => DrawCoreDriver,
    EBB_COMPATIBILITY: () => EBB_COMPATIBILITY,
    EBB_PROFILES: () => EBB_PROFILES,
    EbbDriver: () => EbbDriver,
    MACHINE_PROFILES: () => MACHINE_PROFILES,
    SimulationDriver: () => SimulationDriver,
    WebSerialTextDriver: () => WebSerialTextDriver,
    compileDrawCorePlan: () => compileDrawCorePlan,
    compileEbbPlan: () => compileEbbPlan,
    createAutoSerialTransport: () => createAutoSerialTransport,
    createLogTransport: () => createLogTransport,
    createWebSerialTransport: () => createWebSerialTransport,
    detectDriver: () => detectDriver,
    identifyController: () => identifyController,
    mixCoreXY: () => mixCoreXY,
    parseGrblStatus: () => parseGrblStatus,
    planStroke: () => planStroke
  });

  // ../vanilla.penplotter/src/driver/ebb.js
  var ebb_exports = {};
  __export(ebb_exports, {
    EBB_COMPATIBILITY: () => EBB_COMPATIBILITY,
    EBB_PROFILES: () => EBB_PROFILES,
    EbbDriver: () => EbbDriver,
    compileEbbPlan: () => compileEbbPlan,
    createLogTransport: () => createLogTransport,
    createWebSerialTransport: () => createWebSerialTransport,
    mixCoreXY: () => mixCoreXY,
    planStroke: () => planStroke
  });
  var UNIT_TO_MM = Object.freeze({ mm: 1, cm: 10, in: 25.4 });
  var INTERVAL_S = 4e-5;
  var RATE_SCALE = 2 ** 31;
  var RATE_MAX = 2 ** 31 - 1;
  var SLICE_S = 0.025;
  var MIN_PHASE_S = 4e-3;
  var SESSION = /* @__PURE__ */ Symbol("EBB session state");
  var EBB_PROFILES = Object.freeze({
    "idraw-hse-a2": Object.freeze({
      id: "idraw-hse-a2",
      name: "iDraw HSE / A2 (EBB)",
      stepsPerMm: 80,
      travel: Object.freeze({ width: 594, height: 432 }),
      maxStepRate: 24.995,
      // steps per millisecond, per motor
      minStepRate: 1.31,
      // steps per second, per motor (SM only)
      // Operating settings: deliberately separate from the vendor defaults.
      drawSpeed: 40,
      // mm/s, pen down
      travelSpeed: 40,
      // mm/s, pen up
      acceleration: 800,
      // mm/s², pen down
      travelAcceleration: 300,
      // mm/s², pen up
      junctionDeviation: 0.05,
      // mm: how far a corner may be rounded by not stopping
      minSpeed: 2,
      // mm/s: a stroke starts, turns around and ends at this, never at zero
      simplifyTolerance: 0.02,
      // mm: chords within this of a straight line are merged before planning
      penDownDelay: 300,
      // ms
      penUpDelay: 300,
      // ms
      fifoDepth: 32,
      // motion commands queued on the board (firmware 3.0+)
      aheadMs: 250,
      // how much motion the host sends ahead of the acknowledgements
      usb: Object.freeze({ usbVendorId: 1240, usbProductId: 64914 }),
      manufacturerDefaults: Object.freeze({
        source: "https://idrawpenplotter.com/pages/downloads",
        package: "extensions-260620.zip; idraw_HSE.inx, axidraw_conf.py, axidraw.py, motion.py",
        model: 6,
        microstepping: 16,
        stepsPerMm: 80,
        drawSpeed: 25 * 8.6979 / 110 * 25.4,
        travelSpeed: 75 * 8.6979 / 110 * 25.4,
        acceleration: 40 * 0.75 * 25.4,
        travelAcceleration: 60 * 0.75 * 25.4
      }),
      penServo: Object.freeze({
        type: "standard",
        min: 9855,
        max: 27831,
        sweepMs: 200,
        periodMs: 24,
        up: 60,
        down: 30,
        raiseRate: 75,
        lowerRate: 50
      })
    })
  });
  var EBB_COMPATIBILITY = Object.freeze([
    { name: "iDraw HSE / A2", status: "tested", profile: "idraw-hse-a2", source: "https://idrawpenplotter.com/pages/downloads" },
    { name: "iDraw HSE / A3", status: "likely", profile: null, source: "https://idrawpenplotter.com/pages/downloads" },
    { name: "AxiDraw V2, V3, V3/A3, SE/A3, SE/A2 and MiniKit (standard pen lift)", status: "likely", profile: null, source: "https://github.com/evil-mad/axidraw/blob/master/inkscape%20driver/axidraw_conf.py" },
    { name: "Bantam Tools NextDraw", status: "needs-profile", profile: null, source: "https://bantam.tools/nd_migrate/" },
    { name: "EggBot and WaterColorBot", status: "different-kinematics", profile: null, source: "https://evil-mad.github.io/EggBot/ebb.html" }
  ].map(Object.freeze));
  function mixCoreXY(x, y, stepsPerMm) {
    return {
      a1: Math.round((x + y) * stepsPerMm),
      a2: Math.round((x - y) * stepsPerMm)
    };
  }
  function resolveProfile(profile) {
    if (profile && typeof profile === "object") return profile;
    const found = EBB_PROFILES[profile || "idraw-hse-a2"];
    if (!found) throw new RangeError(`Unknown EBB profile: ${profile}`);
    return found;
  }
  function positive2(value, fallback) {
    const number2 = Number(value ?? fallback);
    if (!Number.isFinite(number2) || number2 <= 0) throw new RangeError(`Expected a positive number, got ${value}`);
    return number2;
  }
  function planStroke(points, settings) {
    const { speed, acceleration, junctionDeviation, stepsPerMm, maxStepRate } = settings;
    const floor = Math.min(settings.minSpeed ?? 0, speed);
    const segments = [];
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1];
      const to = points[index];
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      if (length < 1e-9) continue;
      const ux = (to.x - from.x) / length;
      const uy = (to.y - from.y) / length;
      const stepLimit = maxStepRate * 1e3 / (stepsPerMm * (Math.abs(ux) + Math.abs(uy)));
      segments.push({ from, to, length, ux, uy, vmax: Math.min(speed, stepLimit) });
    }
    if (segments.length === 0) return [];
    const vertex = new Array(segments.length + 1).fill(floor);
    for (let index = 1; index < segments.length; index += 1) {
      const a = segments[index - 1];
      const b = segments[index];
      const cosTheta = -(a.ux * b.ux + a.uy * b.uy);
      const sinHalf = Math.sqrt(Math.max(0, 0.5 * (1 - cosTheta)));
      const corner = sinHalf >= 1 - 1e-9 ? Infinity : Math.sqrt(acceleration * junctionDeviation * sinHalf / (1 - sinHalf));
      vertex[index] = Math.max(floor, Math.min(corner, a.vmax, b.vmax));
    }
    for (let index = 1; index <= segments.length; index += 1) {
      const reach = Math.sqrt(vertex[index - 1] ** 2 + 2 * acceleration * segments[index - 1].length);
      vertex[index] = Math.min(vertex[index], reach);
    }
    for (let index = segments.length - 1; index >= 0; index -= 1) {
      const reach = Math.sqrt(vertex[index + 1] ** 2 + 2 * acceleration * segments[index].length);
      vertex[index] = Math.min(vertex[index], reach);
    }
    const phases = [];
    segments.forEach((segment, index) => {
      const v0 = vertex[index];
      const v1 = vertex[index + 1];
      const { length, vmax } = segment;
      let accelDistance = (vmax ** 2 - v0 ** 2) / (2 * acceleration);
      let brakeDistance = (vmax ** 2 - v1 ** 2) / (2 * acceleration);
      let peak = vmax;
      if (accelDistance + brakeDistance > length) {
        peak = Math.sqrt((2 * acceleration * length + v0 ** 2 + v1 ** 2) / 2);
        accelDistance = Math.max(0, (peak ** 2 - v0 ** 2) / (2 * acceleration));
        brakeDistance = Math.max(0, length - accelDistance);
      }
      const at = (distance2) => ({
        x: segment.from.x + segment.ux * distance2,
        y: segment.from.y + segment.uy * distance2
      });
      let parts = [
        { start: 0, end: accelDistance, vs: v0, ve: peak },
        { start: accelDistance, end: length - brakeDistance, vs: peak, ve: peak },
        { start: length - brakeDistance, end: length, vs: peak, ve: v1 }
      ].filter((part) => part.end - part.start > 1e-9);
      const seconds = (part) => 2 * (part.end - part.start) / (part.vs + part.ve);
      for (let index2 = 0; parts.length > 1 && index2 < parts.length; ) {
        if (seconds(parts[index2]) >= MIN_PHASE_S) {
          index2 += 1;
          continue;
        }
        const into = parts[index2 + 1 < parts.length ? index2 + 1 : index2 - 1];
        into.start = Math.min(into.start, parts[index2].start);
        into.end = Math.max(into.end, parts[index2].end);
        parts.splice(index2, 1);
      }
      for (const { start, end, vs, ve } of parts) {
        phases.push({ from: at(start), to: end >= length - 1e-12 ? segment.to : at(end), length: end - start, vs, ve });
      }
    });
    return phases;
  }
  function parseVersion(text) {
    const match = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(text || "");
    return match ? [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)] : null;
  }
  function atLeast(version, [major, minor, patch]) {
    if (!version) return false;
    if (version[0] !== major) return version[0] > major;
    if (version[1] !== minor) return version[1] > minor;
    return version[2] >= patch;
  }
  function compileEbbPlan(plan, options = {}) {
    const profile = resolveProfile(options.profile);
    const toMm = UNIT_TO_MM[plan.units];
    if (!toMm) {
      throw new RangeError(`Direct plotting needs physical units (mm, cm or in); this plan uses "${plan.units}".`);
    }
    const planned = plan.options || {};
    const drawSpeed = positive2(options.drawSpeed ?? planned.drawSpeed, profile.drawSpeed);
    const travelSpeed = positive2(options.travelSpeed ?? planned.travelSpeed, profile.travelSpeed);
    const acceleration = positive2(options.acceleration, profile.acceleration);
    const travelAcceleration = positive2(options.travelAcceleration, profile.travelAcceleration ?? profile.acceleration);
    const junctionDeviation = positive2(options.junctionDeviation, profile.junctionDeviation);
    const minSpeed = positive2(options.minSpeed, profile.minSpeed ?? 2);
    const simplifyTolerance = Math.max(0, Number(options.simplifyTolerance ?? profile.simplifyTolerance ?? 0));
    const commandSet = options.commandSet || "LM";
    if (commandSet !== "LM" && commandSet !== "SM") throw new RangeError(`Unknown command set: ${commandSet}`);
    const returnHome = options.returnHome !== false;
    const skipDraws = Math.max(0, Math.floor(Number(options.skipDraws ?? 0)));
    const { width, height } = profile.travel;
    const point2 = (p) => ({ x: p.x * toMm, y: p.y * toMm });
    for (const move of plan.moves) {
      const points = move.type === "draw" ? move.points : move.type === "travel" ? [move.from, move.to] : [];
      for (const raw of points) {
        const p = point2(raw);
        if (!(p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height)) {
          throw new RangeError(
            `Point (${p.x.toFixed(2)}, ${p.y.toFixed(2)}) mm is outside the machine travel of ${width} x ${height} mm.`
          );
        }
      }
    }
    const commands = [];
    if (options.penLift !== void 0) {
      if (!options.penLift || typeof options.penLift !== "object" || Array.isArray(options.penLift)) {
        throw new TypeError("penLift must be an object with up, down, raiseRate and lowerRate percentages.");
      }
      const servo = profile.penServo;
      if (!servo || servo.type !== "standard") throw new Error("This profile has no standard pen-lift calibration.");
      const percent = (key) => {
        const value = Object.hasOwn(options.penLift, key) ? options.penLift[key] : servo[key];
        const minimum = key.endsWith("Rate") ? 1 : 0;
        if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > 100) {
          throw new RangeError(`penLift.${key} must be between ${minimum} and 100.`);
        }
        return value;
      };
      const range = servo.max - servo.min;
      const rateScale = range * (servo.periodMs / 100) / servo.sweepMs;
      const values = [
        [4, Math.round(servo.min + range * percent("up") / 100)],
        [5, Math.round(servo.min + range * percent("down") / 100)],
        [11, Math.round(rateScale * percent("raiseRate"))],
        [12, Math.round(rateScale * percent("lowerRate"))]
      ];
      for (const [parameter, value] of values) commands.push({ cmd: `SC,${parameter},${value}`, kind: "pen-setup", durationMs: 0 });
    }
    const stats = { drawMm: 0, travelMm: 0, penDowns: 0, durationMs: 0 };
    const session = options[SESSION];
    const position = { ...session?.position ?? { x: 0, y: 0 } };
    const steps = { ...session?.steps ?? { a1: 0, a2: 0 } };
    let penDown = null;
    let drawing = null;
    const pen = (down) => {
      if (penDown === down) return;
      const delay3 = down ? profile.penDownDelay : profile.penUpDelay;
      const entry = { cmd: `SP,${down ? 0 : 1},${delay3}`, kind: down ? "pen-down" : "pen-up", durationMs: delay3 };
      if (!down && drawing !== null) {
        entry.completes = drawing;
        drawing = null;
      }
      commands.push(entry);
      stats.durationMs += delay3;
      if (down) stats.penDowns += 1;
      penDown = down;
    };
    const stepsTo = (target) => {
      const goal = mixCoreXY(target.x, target.y, profile.stepsPerMm);
      const d1 = goal.a1 - steps.a1;
      const d2 = goal.a2 - steps.a2;
      steps.a1 = goal.a1;
      steps.a2 = goal.a2;
      return [d1, d2];
    };
    const push = (cmd, durationMs) => {
      commands.push({ cmd, kind: penDown ? "draw" : "travel", durationMs });
      stats.durationMs += durationMs;
    };
    const rateLimit = Math.min(RATE_MAX, profile.maxStepRate * 1e3 * RATE_SCALE * INTERVAL_S);
    const emitLowLevel = (phase) => {
      const [d1, d2] = stepsTo(phase.to);
      if (d1 === 0 && d2 === 0) return;
      const seconds = 2 * phase.length / (phase.vs + phase.ve);
      let intervals = Math.max(1, Math.round(seconds / INTERVAL_S));
      const axis = (d) => {
        if (d === 0) return { rate: 0, accel: 0, start: 0, end: 0 };
        const average = RATE_SCALE * (Math.abs(d) + 0.25) / intervals;
        const start = average * 2 * phase.vs / (phase.vs + phase.ve);
        const end = average * 2 * phase.ve / (phase.vs + phase.ve);
        let rate = Math.round(start);
        let accel = Math.round((end - start) / intervals);
        if (rate === 0 && accel === 0) accel = 1;
        return { rate, accel, start, end };
      };
      let a1 = axis(d1);
      let a2 = axis(d2);
      const top = Math.max(a1.start, a1.end, a2.start, a2.end);
      if (top > rateLimit) {
        intervals = Math.ceil(intervals * top / rateLimit);
        a1 = axis(d1);
        a2 = axis(d2);
      }
      push(`LM,${a1.rate},${d1},${a1.accel},${a2.rate},${d2},${a2.accel},3`, intervals * INTERVAL_S * 1e3);
    };
    const emitSlices = (phase) => {
      const seconds = 2 * phase.length / (phase.vs + phase.ve);
      const count = Math.max(1, Math.ceil(seconds / SLICE_S));
      const rate = (phase.ve - phase.vs) / seconds;
      for (let index = 1; index <= count; index += 1) {
        const t = seconds * index / count;
        const distance2 = index === count ? phase.length : phase.vs * t + 0.5 * rate * t * t;
        const fraction = distance2 / phase.length;
        const target = index === count ? phase.to : { x: phase.from.x + (phase.to.x - phase.from.x) * fraction, y: phase.from.y + (phase.to.y - phase.from.y) * fraction };
        const [d1, d2] = stepsTo(target);
        if (d1 === 0 && d2 === 0) continue;
        let ms = Math.max(1, Math.round(seconds / count * 1e3));
        ms = Math.max(ms, Math.ceil(Math.max(Math.abs(d1), Math.abs(d2)) / profile.maxStepRate));
        push(`SM,${ms},${d1},${d2}`, ms);
      }
    };
    const stroke = (rawPoints, speed, accel) => {
      const points = simplifyTolerance > 0 && rawPoints.length > 2 ? simplifyPath(rawPoints, simplifyTolerance) : rawPoints;
      const phases = planStroke(points, {
        speed,
        acceleration: accel,
        junctionDeviation,
        minSpeed,
        stepsPerMm: profile.stepsPerMm,
        maxStepRate: profile.maxStepRate
      });
      let length = 0;
      for (const phase of phases) {
        length += phase.length;
        if (commandSet === "LM" && penDown) emitLowLevel(phase);
        else emitSlices(phase);
      }
      const last = points[points.length - 1];
      position.x = last.x;
      position.y = last.y;
      if (penDown) stats.drawMm += length;
      else stats.travelMm += length;
    };
    const travelTo = (target) => stroke([{ ...position }, target], travelSpeed, travelAcceleration);
    if (!session?.enabled) commands.push({ cmd: "EM,1,1", kind: "motors-on", durationMs: 0 });
    pen(false);
    let toolSeen = false;
    let draws = 0;
    for (const move of plan.moves) {
      if (move.type === "tool-change") {
        if (toolSeen) {
          pen(false);
          commands.push({ cmd: "", kind: "wait-idle", durationMs: 0 });
          commands.push({ cmd: "", kind: "tool-change", toolId: move.toolId, durationMs: 0 });
        }
        toolSeen = true;
      } else if (move.type === "travel") {
        if (draws >= skipDraws) {
          pen(false);
          travelTo(point2(move.to));
        }
      } else if (move.type === "draw") {
        const index = draws;
        draws += 1;
        if (index < skipDraws) continue;
        pen(false);
        travelTo(point2(move.points[0]));
        drawing = index;
        pen(true);
        stroke(move.points.map(point2), drawSpeed, acceleration);
      }
    }
    pen(false);
    if (returnHome) travelTo({ x: 0, y: 0 });
    commands.push({ cmd: "", kind: "wait-idle", durationMs: 0 });
    if (!session || returnHome) commands.push({ cmd: "EM,0,0", kind: "motors-off", durationMs: 0 });
    return {
      schema: "vanilla.penplotter/ebb@1",
      profile: profile.id,
      commandSet,
      settings: { drawSpeed, travelSpeed, acceleration, travelAcceleration, junctionDeviation, minSpeed, simplifyTolerance },
      draws,
      skipDraws,
      commands,
      stats,
      end: { ...position },
      endSteps: { ...steps }
    };
  }
  var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  var EbbDriver = class {
    constructor(options = {}) {
      if (!options.transport) throw new TypeError("EbbDriver needs a transport, e.g. createWebSerialTransport().");
      this.transport = options.transport;
      this.profile = resolveProfile(options.profile);
      this.aborted = false;
    }
    abort() {
      this.aborted = true;
    }
    async ask(cmd, timeoutMs) {
      const reply = await this.transport.send(cmd, { timeoutMs });
      if (reply.startsWith("!")) throw new Error(`EBB refused "${cmd}": ${reply}`);
      return reply;
    }
    async safeStop() {
      if (this.transport.faulted && this.transport.stop) {
        try {
          await this.transport.stop();
        } catch {
        }
        return;
      }
      for (const cmd of ["ES", "SP,1", "EM,0,0"]) {
        try {
          await this.transport.send(cmd, { timeoutMs: 2e3 });
        } catch {
        }
      }
    }
    // For a page that is going away: no replies, one write, pen up first.
    async emergencyStop() {
      this.aborted = true;
      if (this.transport.stop) await this.transport.stop();
      else await this.safeStop();
    }
    async waitIdle() {
      for (; ; ) {
        const reply = await this.ask("QM");
        if (/^QM,0,0,0,0/.test(reply) || this.aborted) return;
        await delay(100);
      }
    }
    // Firmware 3.0+ can queue more than one motion command. Ask how many, use
    // them all: the host then stays well ahead and the machine never waits.
    async openFifo(firmware) {
      const wanted = this.profile.fifoDepth ?? 1;
      if (!atLeast(firmware, [3, 0, 0]) || wanted <= 1) return 1;
      const reply = await this.ask("QU,2", 2e3);
      const maximum = Number(reply.split(",").pop());
      const depth = Math.min(wanted, Number.isFinite(maximum) && maximum > 0 ? maximum : 1);
      if (depth > 1) await this.ask(`CU,4,${depth}`, 2e3);
      return depth;
    }
    async run(planOrCompiled, options = {}) {
      if (this.busy) throw new Error("The EBB driver is already running.");
      this.busy = true;
      try {
        return await this.#runJob(planOrCompiled, options);
      } finally {
        this.busy = false;
      }
    }
    // Experimental: one three-line hardware run; see tests/hardware/session-2026-10-03.json.
    async session(prepare, options = {}) {
      if (typeof prepare !== "function") throw new TypeError("session() needs a function.");
      if (options.confirmed !== true) throw new Error("A session requires { confirmed: true }: carriage at home, pen and paper checked.");
      if (this.busy) throw new Error("The EBB driver is already running.");
      this.busy = true;
      this.aborted = false;
      const state = { position: { x: 0, y: 0 }, steps: { a1: 0, a2: 0 }, enabled: false };
      let active = true;
      let pending = null;
      let failed = null;
      let jobs = 0;
      const session = {
        get position() {
          return { ...state.position };
        },
        run: (plan, jobOptions = {}) => {
          if (!active || failed || this.aborted) return Promise.reject(new Error("This EBB session has ended."));
          if (pending) return Promise.reject(new Error("Wait for the current session job to finish."));
          if (plan?.schema === "vanilla.penplotter/ebb@1") return Promise.reject(new Error("Sessions need a PlotPlan, not compiled commands."));
          pending = this.#runJob(plan, { ...options, ...jobOptions, confirmed: true, returnHome: false, [SESSION]: state }).then((result) => {
            if (result.status !== "complete") failed = new Error("The EBB session was stopped.");
            else jobs += 1;
            return result;
          }).catch((error) => {
            failed = error;
            throw error;
          }).finally(() => {
            pending = null;
          });
          pending.catch(() => {
          });
          return pending;
        }
      };
      try {
        await prepare(session);
        active = false;
        if (pending) await pending;
        if (failed) throw failed;
        if (this.aborted) throw new Error("The EBB session was stopped.");
        if (state.enabled) {
          const result = await this.#runJob({ units: "mm", moves: [], options: {} }, {
            ...options,
            confirmed: true,
            returnHome: true,
            [SESSION]: state
          });
          if (result.status !== "complete") throw new Error("The EBB session was stopped while returning home.");
        }
        return { status: "complete", jobs };
      } catch (error) {
        active = false;
        this.aborted = true;
        if (pending) await pending.catch(() => {
        });
        await this.safeStop();
        throw error;
      } finally {
        active = false;
        this.busy = false;
      }
    }
    async #runJob(planOrCompiled, options = {}) {
      if (options.confirmed !== true) {
        throw new Error("Direct plotting requires { confirmed: true }: carriage at the home corner, pen and paper checked.");
      }
      if (!options[SESSION]) this.aborted = false;
      if (this.aborted) return { status: "aborted", commands: 0 };
      const session = options[SESSION];
      if (session) {
        const tools = new Set(planOrCompiled.moves.filter((move) => move.type === "draw").map((move) => move.toolId));
        if (session.toolKnown) tools.add(session.toolId);
        if (tools.size > 1) throw new Error("An EBB session currently supports one pen.");
        if (tools.size) {
          session.toolId = tools.values().next().value;
          session.toolKnown = true;
        }
      }
      const version = await this.transport.send("V", { timeoutMs: 2e3 });
      if (!/EBB/i.test(version)) throw new Error(`The connected device is not an EBB board: "${version}".`);
      const firmware = parseVersion(version);
      const lowLevel = atLeast(firmware, [2, 7, 0]);
      let compiled;
      if (planOrCompiled.schema === "vanilla.penplotter/ebb@1") {
        compiled = planOrCompiled;
        if (compiled.commandSet !== "SM" && !lowLevel) {
          throw new Error(`This EBB runs firmware ${version.trim()}; LM moves need 2.7.0 or newer. Compile with { commandSet: "SM" } or pass the plan.`);
        }
      } else {
        compiled = compileEbbPlan(planOrCompiled, { ...options, profile: this.profile, commandSet: lowLevel ? "LM" : "SM" });
      }
      const total = compiled.commands.length;
      const aheadMs = this.profile.aheadMs ?? 250;
      const inflight = [];
      let motionDeadline = performance.now();
      const queuedMs = () => inflight.reduce((sum, item) => sum + item.durationMs, 0);
      const settle = async (keep) => {
        while (inflight.length > keep) await inflight.shift().promise;
      };
      try {
        const depth = await this.openFifo(firmware);
        for (let index = 0; index < total; index += 1) {
          if (this.aborted) {
            await this.safeStop();
            return { status: "aborted", index, commands: index };
          }
          const entry = compiled.commands[index];
          if (entry.kind === "tool-change") {
            await settle(0);
            if (options.onToolChange) await options.onToolChange(entry.toolId);
          } else if (entry.kind === "wait-idle") {
            await settle(0);
            await this.waitIdle();
            motionDeadline = performance.now();
          } else {
            while (inflight.length >= 2 && (inflight.length > depth || queuedMs() >= aheadMs)) await settle(inflight.length - 1);
            const now = performance.now();
            motionDeadline = Math.max(now, motionDeadline) + entry.durationMs;
            const timeoutMs = 5e3 + motionDeadline - now;
            const promise = this.ask(entry.cmd, timeoutMs).then(() => options.onProgress ? options.onProgress(index, total, entry) : void 0);
            promise.catch(() => {
            });
            inflight.push({ promise, durationMs: entry.durationMs });
            continue;
          }
          if (options.onProgress) await options.onProgress(index, total, entry);
        }
        await settle(0);
      } catch (error) {
        await this.safeStop();
        throw error;
      }
      if (this.aborted) {
        await this.safeStop();
        return { status: "aborted", commands: total };
      }
      if (options[SESSION]) {
        options[SESSION].position = { ...compiled.end };
        options[SESSION].steps = { ...compiled.endSteps };
        options[SESSION].enabled = options.returnHome === false;
      }
      return { status: "complete", commands: total, durationMs: compiled.stats.durationMs };
    }
  };
  function createLogTransport(options = {}) {
    const version = options.version ?? "EBBv13_and_above EB Firmware Version 3.0.2";
    const fifoMax = options.fifoMax ?? 32;
    const log = [];
    return {
      log,
      async open() {
      },
      async close() {
      },
      async send(cmd) {
        log.push(cmd);
        const failure = options.failOn ? options.failOn(cmd) : null;
        if (failure) return failure;
        if (cmd === "V") return version;
        if (cmd === "QM") return "QM,0,0,0,0";
        if (cmd === "QU,2") return `QU,2,${fifoMax}`;
        if (cmd === "QU,3") return "QU,3,1";
        return "";
      },
      async stop() {
        log.push("ES", "SP,1", "EM,0,0");
      }
    };
  }
  var NO_OK = /* @__PURE__ */ new Set(["V", "QM"]);
  function createWebSerialTransport(port = null, options = {}) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let reader = null;
    let writer = null;
    let buffer = "";
    let active = false;
    let writes = Promise.resolve();
    const pending = [];
    function finish(item, reply, error) {
      const at = pending.indexOf(item);
      if (at >= 0) pending.splice(at, 1);
      clearTimeout(item.timer);
      if (error) item.reject(error);
      else item.resolve(reply.trim());
    }
    function failAll(error) {
      while (pending.length) finish(pending[0], null, error);
    }
    function deliver() {
      for (; ; ) {
        const newline = buffer.search(/[\r\n]/);
        if (newline < 0) return;
        const line2 = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (!line2) continue;
        const head = pending[0];
        if (!head) continue;
        if (line2.startsWith("!") || line2 === "OK") finish(head, line2 === "OK" ? head.lines.join("\n") : line2);
        else if (NO_OK.has(head.name)) finish(head, line2);
        else head.lines.push(line2);
      }
    }
    async function pump() {
      try {
        while (active) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            deliver();
          }
        }
      } catch {
      }
    }
    return {
      async open() {
        if (!port) {
          if (!globalThis.navigator?.serial) throw new Error("Web Serial is not available in this browser/context.");
          port = await navigator.serial.requestPort({ filters: options.filters ?? [EBB_PROFILES["idraw-hse-a2"].usb] });
        }
        if (!port.readable) await port.open({ baudRate: options.baudRate ?? 115200 });
        reader = port.readable.getReader();
        writer = port.writable.getWriter();
        buffer = "";
        active = true;
        pump();
      },
      send(cmd, sendOptions = {}) {
        if (!active) return Promise.reject(new Error("Open the transport first."));
        const timeoutMs = sendOptions.timeoutMs ?? 3e3;
        return new Promise((resolve, reject) => {
          const item = { cmd, name: cmd.split(",")[0], lines: [], resolve, reject, timer: null };
          pending.push(item);
          item.timer = setTimeout(() => failAll(new Error(`No reply to "${cmd}" within ${timeoutMs} ms.`)), timeoutMs);
          writes = writes.then(() => writer.write(encoder.encode(`${cmd}\r`))).catch((error) => finish(item, null, error));
        });
      },
      // The page is going away: no time for replies. One write with stop, pen
      // up and motors off, and the transport is dead from here on.
      async stop() {
        if (!active) return;
        active = false;
        failAll(new Error("The plot was stopped: pen up, motors off."));
        try {
          await writes;
          if (writer) await writer.write(encoder.encode("ES\rSP,1\rEM,0,0\r"));
        } catch {
        }
      },
      async close() {
        active = false;
        failAll(new Error("The transport was closed."));
        if (reader) {
          try {
            await reader.cancel();
          } catch {
          }
          reader.releaseLock();
          reader = null;
        }
        if (writer) {
          writer.releaseLock();
          writer = null;
        }
        if (port) await port.close();
      }
    };
  }

  // ../vanilla.penplotter/src/driver/grbl.js
  var scaleByUnit = { mm: 1, cm: 10, in: 25.4 };
  var delay2 = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  function positive3(value, name) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} must be positive.`);
    return value;
  }
  function compileDrawCorePlan(plan, options = {}) {
    const scale = scaleByUnit[plan.units];
    if (!scale || !Array.isArray(plan.moves)) throw new Error("A physical plot plan is required.");
    const { travel, penUp, penDown } = options;
    positive3(travel?.width, "Travel width");
    positive3(travel?.height, "Travel height");
    for (const [name, value] of [["penUp", penUp], ["penDown", penDown]]) {
      if (!Number.isFinite(value) || value < 0 || value > 10) throw new RangeError(`${name} must be an explicit Z position between 0 and 10.`);
    }
    if (penUp === penDown) throw new RangeError("Pen positions must differ.");
    const axes = options.axes;
    if (!axes || typeof axes.swapXY !== "boolean" || ![1, -1].includes(axes.xDirection) || ![1, -1].includes(axes.yDirection)) {
      throw new Error("Supply an explicit axes mapping: swapXY, xDirection and yDirection (+1 or -1).");
    }
    const drawFeed = positive3(options.drawFeed ?? 1200, "Drawing feed");
    const travelFeed = positive3(options.travelFeed ?? 1800, "Travel feed");
    const penFeed = positive3(options.penFeed ?? 1e3, "Pen feed");
    const number2 = (value) => Number(value.toFixed(4));
    const xy = (point2) => {
      const x = point2?.x * scale, y = point2?.y * scale;
      if (![x, y].every(Number.isFinite) || x < 0 || y < 0 || x > travel.width || y > travel.height) throw new RangeError("A point falls outside the configured machine bounds.");
      const a = axes.swapXY ? y : x, b = axes.swapXY ? x : y;
      return `X${number2(a * axes.xDirection)} Y${number2(b * axes.yDirection)}`;
    };
    const up = `G1 Z${number2(penUp)} F${penFeed}`;
    const down = `G1 Z${number2(penDown)} F${penFeed}`;
    const commands = ["G21", "G90", "G94", up];
    const tools = /* @__PURE__ */ new Set();
    for (const move of plan.moves) {
      if (move.type === "tool-change") {
        tools.add(move.toolId);
        if (tools.size > 1) throw new Error("DrawCore jobs currently support one pen.");
      } else if (move.type === "travel") {
        commands.push(up, `G1 ${xy(move.to)} F${travelFeed}`);
      } else if (move.type === "draw") {
        if (!Array.isArray(move.points) || move.points.length < 2) throw new Error("A drawing move needs at least two points.");
        commands.push(up, `G1 ${xy(move.points[0])} F${travelFeed}`, down);
        for (const point2 of move.points.slice(1)) commands.push(`G1 ${xy(point2)} F${drawFeed}`);
        commands.push(up);
      } else throw new Error(`Unsupported move type: ${move.type}`);
    }
    commands.push(up);
    if (options.returnHome !== false) commands.push(`G1 X0 Y0 F${travelFeed}`);
    return { commands };
  }
  function parseGrblStatus(reply) {
    const match = /^<([^|>]+)\|(.+)>$/.exec(reply.trim());
    if (!match) throw new Error(`Invalid GRBL status: ${reply}`);
    const fields = Object.fromEntries(match[2].split("|").map((field) => {
      const at = field.indexOf(":");
      return [field.slice(0, at), field.slice(at + 1).split(",").map(Number)];
    }));
    const position = fields.WPos || (fields.MPos && fields.WCO ? fields.MPos.map((n, i) => n - fields.WCO[i]) : null);
    return { state: match[1], position, machinePosition: fields.MPos, offset: fields.WCO };
  }
  var DrawCoreDriver = class {
    constructor(options = {}) {
      if (!options.transport) throw new TypeError("DrawCoreDriver needs a transport.");
      this.transport = options.transport;
      this.options = options;
      this.aborted = false;
      this.stopPromise = null;
    }
    abort() {
      this.aborted = true;
    }
    async safeStop() {
      this.aborted = true;
      return this.transport.writeRealtime("!").then(() => true, () => false);
    }
    async emergencyStop() {
      return this.safeStop();
    }
    async finishAbort(settings) {
      if (!this.stopPromise) this.stopPromise = (async () => {
        await this.waitIdle(settings.idleTimeoutMs ?? 12e4, true);
        await this.transport.send(`G1 Z${Number(settings.penUp.toFixed(4))} F${settings.penFeed ?? 1e3}`, {
          timeoutMs: settings.commandTimeoutMs ?? 12e4
        });
        await this.waitIdle(settings.idleTimeoutMs ?? 12e4, true);
        return { status: "aborted", penRaised: true };
      })();
      return this.stopPromise;
    }
    async status() {
      const status = parseGrblStatus(await this.transport.send("?"));
      if (status.offset) this.offset = status.offset;
      if (!status.position && status.machinePosition && this.offset) status.position = status.machinePosition.map((n, i) => n - this.offset[i]);
      return status;
    }
    async waitIdle(timeoutMs, stopping = false) {
      const until = Date.now() + timeoutMs;
      while (Date.now() < until) {
        if (this.aborted && !stopping) return;
        const status = await this.status();
        if (status.state === "Idle") return;
        if (status.state !== "Run") throw new Error(`Controller is ${status.state}; job cannot continue.`);
        await delay2(100);
      }
      throw new Error("Timed out waiting for physical idle.");
    }
    async run(plan, options = {}) {
      if (options.confirmed !== true) throw new Error("A physical job requires confirmed: true.");
      if (this.busy) throw new Error("The DrawCore driver is already running.");
      const settings = { ...this.options, ...options };
      const compiled = compileDrawCorePlan(plan, settings);
      const commandTimeoutMs = positive3(settings.commandTimeoutMs ?? 12e4, "Command timeout");
      this.busy = true;
      this.aborted = false;
      this.stopPromise = null;
      this.offset = null;
      try {
        let initial = await this.status();
        for (let attempt = 0; initial.state === "Idle" && !initial.position && attempt < 12; attempt++) {
          if (this.aborted) return await this.finishAbort(settings);
          await delay2(100);
          initial = await this.status();
        }
        if (initial.state !== "Idle") throw new Error(`Controller must be Idle, found ${initial.state}.`);
        if (!initial.position || initial.position.length < 2 || !initial.position.slice(0, 2).every((n) => Number.isFinite(n) && Math.abs(n) < 0.05)) {
          throw new Error("Set the machine's work origin to X0 Y0 before plotting. No automatic homing or coordinate reset is performed.");
        }
        for (const command of compiled.commands) {
          if (this.aborted) break;
          await this.transport.send(command, { timeoutMs: commandTimeoutMs });
        }
        if (!this.aborted) await this.waitIdle(settings.idleTimeoutMs ?? 12e4);
        if (this.aborted) {
          return await this.finishAbort(settings);
        }
        return { status: "complete", commands: compiled.commands.length };
      } catch (error) {
        await this.safeStop();
        throw error;
      } finally {
        this.busy = false;
      }
    }
  };

  // ../vanilla.penplotter/src/driver/auto.js
  function identifyController(response) {
    const text = String(response).trim();
    if (/^EBB(?:\b|v\d)/i.test(text)) return { protocol: "ebb", response: text };
    if (/\bDrawCore\s+V[\d.]+/i.test(text)) return { protocol: "drawcore", response: text };
    if (/^Grbl\b/i.test(text) || /\[VER:1\.1/.test(text)) return { protocol: "grbl", response: text };
    return { protocol: "unknown", response: text };
  }
  async function detectDriver(transport, options = {}) {
    let identity = transport.identity;
    if (!identity || identity.protocol === "unknown") {
      try {
        identity = identifyController(await transport.send("V"));
      } catch (error) {
        if (!/^GRBL error:/.test(error.message)) throw error;
        identity = identifyController(await transport.send("$I"));
      }
    }
    if (identity.protocol === "unknown") throw new Error(`Unknown controller: ${identity.response}`);
    if (identity.protocol === "grbl") throw new Error("GRBL detected; a machine-specific pen driver is required. This driver supports DrawCore only.");
    transport.protocol = identity.protocol;
    const driver = identity.protocol === "ebb" ? new EbbDriver({ transport, profile: options.profile }) : new DrawCoreDriver({ ...options.drawcore, transport });
    driver.identity = identity;
    return driver;
  }
  function createAutoSerialTransport(port = null, options = {}) {
    const encoder = new TextEncoder(), decoder = new TextDecoder();
    let reader, writer, active = false, pending = null, buffer = "", fault = null;
    const requests = [];
    let writes = Promise.resolve();
    const transport = {
      identity: null,
      protocol: null,
      get faulted() {
        return Boolean(fault);
      },
      async open() {
        if (!port) {
          if (!globalThis.navigator?.serial) throw new Error("Web Serial is not available.");
          port = await navigator.serial.requestPort({ filters: [] });
        }
        if (!port.readable) await port.open({ baudRate: options.baudRate ?? 115200 });
        reader = port.readable.getReader();
        writer = port.writable.getWriter();
        active = true;
        pump();
      },
      async writeRealtime(text) {
        if (!writer) throw new Error("The serial port is closed.");
        writes = writes.catch(() => {
        }).then(() => writer.write(encoder.encode(text)));
        await writes;
      },
      send(command, sendOptions = {}) {
        if (!active || fault) return Promise.reject(fault || new Error("Open the serial transport first."));
        if (pending && transport.protocol !== "ebb") return Promise.reject(new Error("Another serial request is pending."));
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => fail(new Error(`No reply to ${command}.`)), sendOptions.timeoutMs ?? options.timeoutMs ?? 3e3);
          requests.push({ command, lines: [], resolve, reject, timer });
          pending = requests[0];
          writes = writes.then(() => {
            if (fault) throw fault;
            return writer.write(encoder.encode(command === "?" ? "?" : `${command}\r`));
          });
          writes.catch(fail);
        });
      },
      async stop() {
        fail(new Error("The controller connection was stopped."));
        if (transport.protocol === "ebb") await transport.writeRealtime("ES\rSP,1\rEM,0,0\r");
        else if (transport.protocol === "drawcore" || transport.protocol === "grbl") await transport.writeRealtime("!");
      },
      async close() {
        active = false;
        fail(new Error("The serial port was closed."));
        if (reader) {
          try {
            await reader.cancel();
          } catch {
          }
          reader.releaseLock();
        }
        try {
          await writes;
        } catch {
        }
        if (writer) {
          writer.releaseLock();
          writer = null;
        }
        if (port) await port.close();
      }
    };
    function finish(error, response) {
      if (!pending) return;
      const item = pending;
      requests.shift();
      pending = requests[0] || null;
      clearTimeout(item.timer);
      if (error) item.reject(error);
      else item.resolve(response);
    }
    function fail(error) {
      fault = error;
      while (pending) finish(error);
    }
    function deliver(line2) {
      const identity = identifyController(line2);
      if (identity.protocol !== "unknown") {
        const previousIdentity = transport.identity;
        transport.identity = identity;
        transport.protocol = identity.protocol;
        if (pending?.command === "V") {
          finish(null, line2);
          return;
        }
        if (/^Grbl\b/i.test(line2) && (pending || previousIdentity)) {
          fail(new Error("Controller restarted; reconnect before continuing."));
          return;
        }
      }
      if (/^(?:error:|ALARM:)/i.test(line2)) {
        const error = new Error(`GRBL error: ${line2}`);
        if (/^ALARM:/i.test(line2)) fail(error);
        else finish(error);
        return;
      }
      if (!pending) return;
      if (pending.command === "?" && line2.startsWith("<")) {
        finish(null, line2);
        return;
      }
      if (line2 === "ok" || line2 === "OK") {
        finish(null, pending.lines.join("\n"));
        return;
      }
      if (line2.startsWith("!")) {
        finish(new Error(`EBB error: ${line2}`));
        return;
      }
      if (["V", "QM"].includes(pending.command)) {
        finish(null, line2);
        return;
      }
      if (line2.startsWith("<")) return;
      pending.lines.push(line2);
    }
    async function pump() {
      try {
        while (active) {
          const { value, done } = await reader.read();
          if (done) {
            if (active) fail(new Error("Serial connection ended."));
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          for (; ; ) {
            const at = buffer.search(/[\r\n]/);
            if (at < 0) break;
            const line2 = buffer.slice(0, at).trim();
            buffer = buffer.slice(at + 1);
            if (line2) deliver(line2);
          }
        }
      } catch (error) {
        if (active) fail(error);
      }
    }
    return transport;
  }

  // ../vanilla.penplotter/src/driver/index.js
  var MACHINE_PROFILES = Object.freeze({
    "generic-grbl": {
      id: "generic-grbl",
      name: "Generic GRBL + servo",
      renderer: "gcode",
      page: { width: 210, height: 297 },
      drawSpeed: 30,
      travelSpeed: 70,
      direct: "experimental-web-serial"
    },
    "generic-hpgl": {
      id: "generic-hpgl",
      name: "Generic HP-GL plotter",
      renderer: "hpgl",
      page: { width: 210, height: 297 },
      drawSpeed: 25,
      travelSpeed: 55,
      direct: "experimental-web-serial"
    },
    axidraw: {
      id: "axidraw",
      name: "AxiDraw / EBB",
      renderer: "svg",
      page: { width: 279.4, height: 215.9 },
      drawSpeed: 35,
      travelSpeed: 80,
      direct: false,
      note: "Requires a dedicated EBB protocol driver; SVG export is available now."
    },
    idraw: {
      id: "idraw",
      name: "iDraw",
      renderer: "svg",
      page: { width: 420, height: 297 },
      drawSpeed: 35,
      travelSpeed: 80,
      direct: false,
      note: "Protocol varies by controller. HSE/A2 uses EBB; DrawCore uses its own driver with explicit machine settings."
    },
    "idraw-hse-a2": {
      id: "idraw-hse-a2",
      name: "iDraw HSE / A2 (EBB)",
      renderer: "svg",
      page: { width: 594, height: 432 },
      drawSpeed: 40,
      travelSpeed: 40,
      direct: "ebb-web-serial",
      note: "Plots directly through EbbDriver; machine facts live in EBB_PROFILES."
    }
  });
  var SimulationDriver = class {
    constructor(options = {}) {
      this.options = options;
      this.aborted = false;
    }
    abort() {
      this.aborted = true;
    }
    async run(plan, handlers = {}) {
      this.aborted = false;
      const total = plan.moves.length;
      for (let index = 0; index < total; index += 1) {
        if (this.aborted) return { status: "aborted", index };
        const move = plan.moves[index];
        if (handlers.onMove) await handlers.onMove(move, index, total);
      }
      return { status: "complete", moves: total };
    }
  };
  var WebSerialTextDriver = class {
    constructor(options = {}) {
      this.options = { baudRate: 115200, lineDelay: 0, ...options };
      this.port = null;
      this.writer = null;
      this.aborted = false;
    }
    async connect(filters = []) {
      if (!globalThis.navigator?.serial) {
        throw new Error("Web Serial is not available in this browser/context.");
      }
      this.port = await navigator.serial.requestPort({ filters });
      await this.port.open({ baudRate: this.options.baudRate });
      this.writer = this.port.writable.getWriter();
    }
    abort() {
      this.aborted = true;
    }
    async send(text, options = {}) {
      if (!this.writer) throw new Error("Connect the serial driver first.");
      if (options.confirmed !== true) {
        throw new Error("Direct plotting requires { confirmed: true } after a physical dry run.");
      }
      this.aborted = false;
      const encoder = new TextEncoder();
      const lines = String(text).split(/\r?\n/);
      for (let index = 0; index < lines.length; index += 1) {
        if (this.aborted) return { status: "aborted", line: index };
        await this.writer.write(encoder.encode(`${lines[index]}
`));
        if (this.options.lineDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.options.lineDelay));
        }
      }
      return { status: "complete", lines: lines.length };
    }
    async disconnect() {
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    }
  };

  // ../vanilla.penplotter/vanilla.penplotter.js
  var VERSION = "0.5.0";
  var PlotterEngine = class {
    static version = VERSION;
    static paperSize = paperSize;
    constructor(options = {}) {
      this.plugins = options.plugins || new PluginHost();
      this.document = createDocument(options);
      this.activeLayer = addLayer(this.document, {
        id: options.layerId || "default",
        name: options.layerName || "Default",
        toolId: options.toolId || "pen-1"
      });
      this.optimized = null;
      this.planned = null;
      this._documentSnapshot = JSON.stringify(this.document);
      this._optimizationOptions = {};
      this._planOptions = {};
    }
    // Paths, layers and tools can also be edited through the public document.
    // Check its contents before reusing derived geometry or a machine plan.
    _syncDocument() {
      const snapshot = JSON.stringify(this.document);
      if (snapshot !== this._documentSnapshot) {
        this.optimized = null;
        this.planned = null;
        this._documentSnapshot = snapshot;
      }
    }
    _currentPlan(options = this._planOptions) {
      this._syncDocument();
      return this.planned || this.plan(options);
    }
    tool(options = {}) {
      const tool = createTool(options);
      const existing = this.document.tools.findIndex((value) => value.id === tool.id);
      if (existing >= 0) this.document.tools[existing] = tool;
      else this.document.tools.push(tool);
      return tool;
    }
    // pen() is the word people use; tool() is the same thing.
    pen(options = {}) {
      return this.tool(options);
    }
    layer(id, options = {}) {
      let layer = getLayer(this.document, id);
      if (!layer) layer = addLayer(this.document, { ...options, id, name: options.name || id });
      this.activeLayer = layer;
      return layer;
    }
    line(x1, y1, x2, y2, options) {
      return line(this.activeLayer, x1, y1, x2, y2, options);
    }
    polyline(points, options) {
      return polyline(this.activeLayer, points, options);
    }
    polygon(points, options) {
      return polygon(this.activeLayer, points, options);
    }
    rect(x, y, width, height, options) {
      return rectangle(this.activeLayer, x, y, width, height, options);
    }
    circle(x, y, radius, options) {
      return circle(this.activeLayer, x, y, radius, options);
    }
    arc(x, y, radius, startAngle, endAngle, options) {
      return arc(this.activeLayer, x, y, radius, startAngle, endAngle, options);
    }
    hatch(points, options) {
      return hatchPolygon(this.activeLayer, points, options);
    }
    crossHatch(points, options) {
      return crossHatchPolygon(this.activeLayer, points, options);
    }
    stipple(points, options) {
      return stipplePolygon(this.activeLayer, points, options);
    }
    use(plugin) {
      this.plugins.use(plugin);
      return this;
    }
    importSVG(svg, options = {}) {
      const imported = importSVG(svg, options);
      for (const layer of imported.layers) {
        const target = addLayer(this.document, {
          ...layer,
          id: getLayer(this.document, layer.id) ? `${layer.id}-${this.document.layers.length}` : layer.id
        });
        target.paths = layer.paths;
      }
      return imported;
    }
    optimize(options = {}) {
      this._syncDocument();
      this.optimized = optimizeDocument(this.document, options, this.plugins);
      this._optimizationOptions = { ...options };
      this.planned = null;
      return this.optimized;
    }
    plan(options = {}) {
      this._syncDocument();
      const source = options.useRaw ? this.document : this.optimized || this.optimize(options.optimize || this._optimizationOptions);
      this.planned = planDocument(source, options);
      this._planOptions = { ...options };
      return this.planned;
    }
    stats(options = this._planOptions) {
      return this._currentPlan(options).stats;
    }
    exportSVG(options = {}) {
      return renderSVG(this._currentPlan(options.plan), options);
    }
    exportHPGL(options = {}) {
      return renderHPGL(this._currentPlan(options.plan), options);
    }
    exportGCode(options = {}) {
      return renderGCode(this._currentPlan(options.plan), options);
    }
    exportJSON(options = {}) {
      return renderJSON(this._currentPlan(options.plan), options);
    }
    drawPreview(context, options = {}) {
      return drawPreview(context, this._currentPlan(options.plan), options);
    }
    // The route is what you see: the plan, drawn the way the pen will run it.
    drawRoute(context, options = {}) {
      return this.drawPreview(context, options);
    }
    // The bed as the machine sees it, with the sheet and the drawing on it.
    // options.bed defaults to the page; options.sheet is { x, y, width, height } in mm.
    drawBed(context, options = {}) {
      const bed = options.bed || this.document.page;
      return drawBed(context, this._currentPlan(options.plan), { ...options, bed });
    }
  };

  // p5.penplotter.js
  var REQUIRES = Object.freeze({ core: "0.2.0", p5: "2.2.2" });
  function versionAtLeast(version, minimum) {
    const have = String(version).split(".").map(Number);
    const need = minimum.split(".").map(Number);
    for (let index = 0; index < need.length; index += 1) {
      if ((have[index] || 0) !== need[index]) return (have[index] || 0) > need[index];
    }
    return true;
  }
  function assertDriver(EngineClass, driver) {
    if (!EngineClass.version || !versionAtLeast(EngineClass.version, REQUIRES.core)) {
      throw new Error(
        `p5.penplotter needs vanilla.penplotter ${REQUIRES.core} or newer for direct plotting; this one is ${EngineClass.version || "older than 0.2.0"}. Update vanilla.penplotter first.`
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
  function drawPlanWithP5(p, plan, options = {}) {
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
  function toRadians(p, angle) {
    return typeof p.angleMode === "function" && p.angleMode() === "degrees" ? angle * Math.PI / 180 : angle;
  }
  function ellipsePoints(x, y, w, h, start, stop) {
    const span = stop - start;
    const segments = Math.max(2, Math.ceil(Math.abs(span) / (Math.PI / 48)));
    const points = [];
    for (let index = 0; index <= segments; index += 1) {
      const angle = start + span * index / segments;
      points.push({ x: x + Math.cos(angle) * w / 2, y: y + Math.sin(angle) * h / 2 });
    }
    return points;
  }
  var POINT_RADIUS_MM = 0.12;
  var P5Plot = class _P5Plot {
    constructor(p, EngineClass, options = {}) {
      this.p = p;
      this.EngineClass = EngineClass;
      this.options = options;
      this.kit = options.driver || null;
      this.profileId = options.profile || "idraw-hse-a2";
      this.offset = { x: options.x ?? 0, y: options.y ?? 0 };
      this.scale = options.width ? options.width / p.width : options.mmPerPixel ?? 1;
      this.paper = null;
      if (options.paper !== void 0) {
        if (typeof EngineClass.paperSize !== "function") {
          throw new Error("createPlot({ paper }) needs current vanilla.penplotter source with PlotterEngine.paperSize(). Update both libraries.");
        }
        if (!(Number.isFinite(p.width) && p.width > 0 && Number.isFinite(p.height) && p.height > 0)) {
          throw new RangeError("Create a canvas with positive dimensions before choosing paper.");
        }
        const bed = options._bed || this.options.drawcore?.travel || this.kit?.EBB_PROFILES?.[this.profileId]?.travel;
        const requested = options.orientation ?? "auto";
        if (!["auto", "portrait", "landscape"].includes(requested)) throw new RangeError("Use auto, portrait or landscape for paper orientation.");
        let orientation = requested === "auto" ? p.width >= p.height ? "landscape" : "portrait" : requested;
        let size = EngineClass.paperSize(options.paper, orientation);
        if (bed && requested === "auto" && (size.width > bed.width || size.height > bed.height)) {
          orientation = orientation === "landscape" ? "portrait" : "landscape";
          size = EngineClass.paperSize(options.paper, orientation);
        }
        const margin = options.margin ?? 12;
        if (!Number.isFinite(margin) || margin < 0 || 2 * margin >= Math.min(size.width, size.height)) throw new RangeError("Paper margin must leave a positive drawing area.");
        const x = options.paperX ?? (bed ? (bed.width - size.width) / 2 : 0);
        const y = options.paperY ?? (bed ? (bed.height - size.height) / 2 : 0);
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || bed && (x + size.width > bed.width + 1e-6 || y + size.height > bed.height + 1e-6)) throw new RangeError("The chosen paper does not fit on the machine bed at this position.");
        this.scale = options.width !== void 0 ? options.width / p.width : options.mmPerPixel ?? Math.min((size.width - 2 * margin) / p.width, (size.height - 2 * margin) / p.height);
        if (!Number.isFinite(this.scale) || this.scale <= 0) throw new RangeError("Drawing scale must be positive.");
        this.offset = {
          x: options.x ?? x + (size.width - p.width * this.scale) / 2,
          y: options.y ?? y + (size.height - p.height * this.scale) / 2
        };
        if (!Number.isFinite(this.offset.x) || !Number.isFinite(this.offset.y) || this.offset.x < x + margin - 1e-6 || this.offset.y < y + margin - 1e-6 || this.offset.x + p.width * this.scale > x + size.width - margin + 1e-6 || this.offset.y + p.height * this.scale > y + size.height - margin + 1e-6) throw new RangeError("The drawing canvas does not fit inside the paper margins.");
        this.paper = { x, y, ...size, margin, format: String(options.paper).toUpperCase(), orientation };
      }
      this.transport = null;
      this.driver = null;
      this.busy = false;
      this.pending = null;
      this.status = "idle";
      this.clear();
    }
    machineBed() {
      if (this.driver?.identity?.protocol === "drawcore") return this.options.drawcore?.travel;
      if (this.driver) return this.kit?.EBB_PROFILES?.[this.profileId]?.travel;
      return this.options._bed || this.options.drawcore?.travel || this.kit?.EBB_PROFILES?.[this.profileId]?.travel;
    }
    updatePlacement() {
      const bed = this.machineBed();
      if (!bed || !this.engine.document) return;
      if (this.paper) {
        const placed = new _P5Plot(this.p, this.EngineClass, { ...this.options, width: this.scale * this.p.width, _bed: bed });
        const dx = placed.offset.x - this.offset.x;
        const dy = placed.offset.y - this.offset.y;
        for (const layer of this.engine.document.layers) {
          for (const path of layer.paths) for (const point2 of path.points) {
            point2.x += dx;
            point2.y += dy;
          }
        }
        this.offset = placed.offset;
        this.paper = placed.paper;
      }
      this.engine.document.page = { ...bed };
      if (this.bedPreview) this.showBed();
    }
    clear() {
      const travel = this.machineBed();
      this.engine = new this.EngineClass({
        units: "mm",
        page: travel ? { ...travel } : { width: this.paper ? this.paper.x + this.paper.width : this.offset.x + this.p.width * this.scale, height: this.paper ? this.paper.y + this.paper.height : this.offset.y + this.p.height * this.scale }
      });
      return this;
    }
    toMm(x, y) {
      return { x: this.offset.x + x * this.scale, y: this.offset.y + y * this.scale };
    }
    toPx(point2) {
      return { x: (point2.x - this.offset.x) / this.scale, y: (point2.y - this.offset.y) / this.scale };
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
      this.engine.circle(c.x, c.y, diameter / 2 * this.scale);
      return this;
    }
    // Like p5: width and height, not radii. A circle-shaped ellipse stays a circle.
    ellipse(x, y, w, h = w) {
      this.p.ellipse(x, y, w, h);
      const c = this.toMm(x, y);
      if (w === h) this.engine.circle(c.x, c.y, w / 2 * this.scale);
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
      for (const point2 of list) this.p.vertex(point2.x, point2.y);
      if (closed) this.p.endShape("close");
      else this.p.endShape();
      this.p.pop();
      const mm = list.map((point2) => this.toMm(point2.x, point2.y));
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
      const mm = points.map(toPoint).map((point2) => this.toMm(point2.x, point2.y));
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
      const plan = this.engine.plan(options);
      if (this.paper) {
        const { x, y, width, height, margin } = this.paper;
        for (const move of plan.moves) {
          if (move.type !== "draw") continue;
          for (const point2 of move.points) {
            if (!Number.isFinite(point2.x) || !Number.isFinite(point2.y) || point2.x < x + margin - 1e-6 || point2.y < y + margin - 1e-6 || point2.x > x + width - margin + 1e-6 || point2.y > y + height - margin + 1e-6) throw new RangeError("Recorded strokes fall outside the paper margins. Keep the strokes inside the canvas or adjust the drawing size and position.");
          }
        }
      }
      return plan;
    }
    // The bed as the machine sees it. Supply sheet (mm) for actual paper;
    // otherwise show the mapped canvas area. canvas is an HTML
    // canvas; it keeps the bed's proportions (594 by 432 for the iDraw).
    drawBed(canvas, options = {}) {
      if (typeof this.engine.drawBed !== "function") {
        throw new Error("plot.drawBed() needs a vanilla.penplotter build with drawBed(). See Setup for current-source imports.");
      }
      const bed = this.machineBed() || this.engine.document.page;
      const sheet = options.sheet ?? this.paper ?? { x: this.offset.x, y: this.offset.y, width: this.p.width * this.scale, height: this.p.height * this.scale };
      this.plan();
      const context = typeof canvas.getContext === "function" ? canvas.getContext("2d") : canvas;
      this.engine.drawBed(context, { bed, sheet });
      return this;
    }
    // Create a separate preview when no canvas is supplied; reuse it on redraw.
    showBed(canvas = this.bedPreview) {
      const document = this.p.canvas?.ownerDocument || globalThis.document;
      if (!document) throw new Error("plot.showBed() needs a browser document.");
      if (!canvas) {
        const bed = this.machineBed() || this.engine.document.page;
        canvas = document.createElement("canvas");
        canvas.width = Math.ceil(bed.width) + 20;
        canvas.height = Math.ceil(bed.height) + 20;
        canvas.style.cssText = "display:block;width:420px;max-width:100%;height:auto";
        canvas.setAttribute("aria-label", "Bed coordinates: red cross marks the machine origin");
        const parent = this.p.canvas?.parentNode || document.body;
        parent.appendChild(canvas);
      }
      this.bedPreview = canvas;
      const drawing = this._bedDrawing || (this._bedDrawing = document.createElement("canvas"));
      drawing.width = Math.max(1, canvas.width - 20);
      drawing.height = Math.max(1, canvas.height - 20);
      this.drawBed(drawing);
      const context = canvas.getContext("2d");
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(drawing, 10, 10);
      context.strokeStyle = "#d32f2f";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(6, 6);
      context.lineTo(14, 14);
      context.moveTo(6, 14);
      context.lineTo(14, 6);
      context.stroke();
      return this;
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
      const createTransport = this.kit.createAutoSerialTransport || this.kit.createWebSerialTransport;
      const transport = createTransport(granted[0] ?? null, { filters: [] });
      try {
        await transport.open();
      } catch (error) {
        if (!/No port selected/i.test(error.message)) throw error;
        throw new Error("No plotter was chosen. If no list appeared at all, open this page in Chrome or Edge itself.");
      }
      try {
        this.driver = this.kit.detectDriver ? await this.kit.detectDriver(transport, { profile: this.profileId, drawcore: this.options.drawcore }) : new this.kit.EbbDriver({ transport, profile: this.profileId });
        this.updatePlacement();
      } catch (error) {
        await transport.close();
        this.driver = null;
        throw error;
      }
      this.transport = transport;
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
      this.plan(options.plan);
      await this.connect();
      const plan = this.plan(options.plan);
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
        this.say(`plot stopped: ${error.message}`);
        throw error;
      } finally {
        if (target) target.removeEventListener("click", stopOnClick);
        this.busy = false;
      }
    }
    // Prepare the next object only after physical idle; return home once at the end.
    async sequence(prepare, options = {}) {
      if (typeof prepare !== "function") throw new TypeError("plot.sequence() needs a drawing function.");
      if (options.returnHome === false) throw new Error("A sequence must return home after its final object.");
      this.requireKit();
      if (this.busy || this.pending) return { status: "busy" };
      this.sequenceStopped = false;
      const operation = async () => {
        let batches = 0;
        const target = this.clickTarget();
        const stopOnClick = () => this.stop();
        try {
          if (!this.hasGesture()) {
            this.say("Ready to plot. Click the drawing to start the sequence; click again to stop.");
            await this.nextClick();
          } else {
            const confirm = this.options.confirm || ((text) => globalThis.confirm(text));
            if (!confirm("Start the sequence? Carriage at home, paper in place, hands clear?")) return { status: "cancelled", batches };
          }
          if (this.sequenceStopped) return { status: "aborted", batches };
          this.busy = true;
          if (target) target.addEventListener("click", stopOnClick);
          await this.connect();
          if (typeof this.driver.session !== "function") {
            throw new Error("plot.sequence() requires EBB sessions; DrawCore sessions are not supported.");
          }
          await this.driver.session(async (session) => {
            while (!this.sequenceStopped) {
              this.clear();
              if (await prepare(batches) === false) break;
              if (this.sequenceStopped) break;
              const plan = this.plan({ ...options.plan, origin: session.position });
              this.say(`Plotting object ${batches + 1}… click the drawing to stop.`);
              const result = await session.run(plan, options);
              if (result.status !== "complete") {
                this.sequenceStopped = true;
                break;
              }
              batches++;
              if (options.onBatch) await options.onBatch(batches, result);
            }
          }, { ...options, confirmed: true });
          const status = this.sequenceStopped ? "aborted" : "complete";
          this.say(`Sequence ${status}: ${batches} objects.`);
          return { status, batches };
        } catch (error) {
          if (this.driver?.safeStop) await this.driver.safeStop();
          if (this.sequenceStopped) {
            this.say(`Sequence aborted: ${batches} objects.`);
            return { status: "aborted", batches };
          }
          this.say(`Sequence stopped: ${error.message}`);
          throw error;
        } finally {
          if (target) target.removeEventListener("click", stopOnClick);
          this.busy = false;
          this.pending = null;
        }
      };
      this.pending = Promise.resolve().then(operation);
      return this.pending;
    }
    stop() {
      this.sequenceStopped = true;
      if (this.driver) this.driver.abort();
      this.say(this.driver?.identity?.protocol === "drawcore" ? "Stop requested: accepted moves finish, then the pen lifts and Idle is confirmed." : "stop requested");
      return this;
    }
  };
  function installP5Penplotter(p5Constructor, EngineClass, installOptions = {}) {
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
          ...options.page || {}
        }
      });
    };
    p5Constructor.prototype.createPlot = function createPlot(options = {}) {
      return new P5Plot(this, EngineClass, { driver: installOptions.driver, ...options });
    };
    p5Constructor.prototype.drawPlotPlan = function drawPlotPlan(plan, options = {}) {
      return drawPlanWithP5(this, plan, options);
    };
    p5Constructor.prototype.drawRoute = p5Constructor.prototype.drawPlotPlan;
    return p5Constructor;
  }
  var P5Penplotter = Object.freeze({
    version: "0.3.1",
    requires: REQUIRES,
    install: installP5Penplotter,
    draw: drawPlanWithP5
  });

  // browser/entry.js
  var metadata = Object.freeze({
    version: P5Penplotter.version,
    development: false,
    coreVersion: PlotterEngine.version,
    coreCommit: "131efc79ebf9341dcc13dced550d6877e831ba6b"
  });
  var installation = /* @__PURE__ */ Symbol.for("p5.penplotter.installation");
  function install(p5Constructor) {
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
    installP5Penplotter(p5Constructor, PlotterEngine, { driver: driver_exports });
    Object.defineProperty(p5Constructor, installation, { value: metadata });
    return p5Constructor;
  }
  var entry_default = Object.freeze({ install, metadata });

  // browser/classic.js
  install(globalThis.p5);
  return __toCommonJS(classic_exports);
})();
