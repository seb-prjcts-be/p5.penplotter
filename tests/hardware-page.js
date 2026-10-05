import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "playwright-core";
const directory = process.env.PENPLOTTER_TEST_BUNDLE_DIR || path.resolve(import.meta.dirname, "../node_modules/.drawcore-test");
const root = path.resolve(import.meta.dirname, "..");
const siteMode = process.env.PENPLOTTER_TEST_SITE === "1";
const server = http.createServer((request, response) => {
  if (request.url === "/docs/drawcore-test.html") {
    response.setHeader("Content-Type", "text/html");
    response.end(fs.readFileSync(path.join(root, "docs/drawcore-test.html")));
    return;
  }
  if (new URL(request.url, "http://localhost").pathname === "/dist/p5.penplotter.js") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(fs.readFileSync(path.join(root, "dist/p5.penplotter.js")));
    return;
  }
  const name = request.url === "/" ? "index.html" : request.url.slice(1);
  if (!["index.html", "drawcore-test.html", "p5.min.js", "p5.penplotter.js"].includes(name)) { response.writeHead(404).end(); return; }
  response.setHeader("Content-Type", name.endsWith(".js") ? "text/javascript" : "text/html");
  response.end(fs.readFileSync(path.join(directory, name)));
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  const executablePath = process.env.PENPLOTTER_CHROMIUM || (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
  browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
  const standalone = await browser.newPage();
  const standaloneErrors = [];
  standalone.on("pageerror", error => standaloneErrors.push(error.message));
  await standalone.goto(`http://127.0.0.1:${server.address().port}/drawcore-test.html`);
  await standalone.waitForSelector("canvas");
  assert.deepEqual(standaloneErrors, []);
  assert(await standalone.evaluate(() => isSecureContext && typeof navigator.serial?.requestPort === "function"), "standalone page permits Web Serial on localhost in Chromium");
  await standalone.close();
  const page = await browser.newPage();
  await page.route("https://cdn.jsdelivr.net/npm/p5@2.2.2/lib/p5.min.js", route => route.fulfill({ path: path.join(root, "node_modules/p5/lib/p5.min.js"), contentType: "text/javascript" }));
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => dialog.accept());
  await page.addInitScript(() => {
    window.sentCommands = [];
    let input;
    const port = {
      readable: new ReadableStream({ start(controller) { input = controller; } }),
      writable: new WritableStream({ write(bytes) {
        const command = new TextDecoder().decode(bytes);
        window.sentCommands.push(command);
        if (window.stopDuringPenDown && command === "G1 Z5 F1000\r") {
          window.stopDuringPenDown = false;
          document.querySelector("#stop").click();
        }
        const reply = command === "V\r" ? "DrawCore V2.09\r\n" : command === "?" ? "<Idle|WPos:0,0,0>\r\n" : command === "!" ? "" : "ok\r\n";
        if (reply) input.enqueue(new TextEncoder().encode(reply));
      } }),
      async close() {}
    };
    Object.defineProperty(navigator, "serial", { value: { async requestPort() { return port; } } });
  });
  await page.goto(`http://127.0.0.1:${server.address().port}${siteMode ? "/docs/drawcore-test.html" : "/"}`);
  await page.waitForSelector("canvas");
  await page.click("#connect");
  await page.waitForFunction(() => document.querySelector("#log").textContent.includes('Herkend {"protocol":"drawcore"'));
  assert.deepEqual(await page.evaluate(() => sentCommands), ["V\r"], "connection only probes identity");
  await page.click("#status");
  await page.waitForFunction(() => !document.querySelector("#status").disabled);
  assert((await page.evaluate(() => sentCommands)).every(command => ["V\r", "?"].includes(command)), "status never moves the machine");
  await page.click("#up");
  await page.waitForFunction(() => document.querySelector("#log").textContent.includes("Pencommando voltooid"));
  await page.click("#origin");
  await page.waitForFunction(() => document.querySelector("#log").textContent.includes("XY-werknulpunt expliciet"));
  await page.click("#jogX");
  await page.waitForFunction(() => document.querySelector("#log").textContent.includes("Pen-op-richtingstest X:"));
  await page.click("#jogY");
  await page.waitForFunction(() => document.querySelector("#log").textContent.includes("Pen-op-richtingstest Y:"));
  await page.click("#line");
  await page.waitForFunction(() => document.querySelector("#log").textContent.includes('Resultaat {"status":"complete"'));
  await page.click("#square");
  await page.waitForFunction(() => document.querySelector("#log").textContent.split('Resultaat {"status":"complete"').length === 3);
  const commands = await page.evaluate(() => sentCommands);
  assert(commands.includes("G1 X-12 Y-22 F600\r"));
  assert(commands.includes("G1 X-22 Y-22 F600\r"));
  assert(commands.includes("G1 X0 Y-1 F60\r"));
  assert(commands.includes("G1 X-1 Y0 F60\r"));
  assert(commands.includes("G92 X0 Y0\r"));
  assert(!commands.some(command => /^(SP|SM|LM|EM|ES|\$H|M3|M5)/.test(command)));
  assert(!await page.locator("#log").evaluate(node => node.textContent.includes("Fout:")));
  assert.deepEqual(errors, []);
  await page.evaluate(() => { window.stopDuringPenDown = true; });
  await page.click("#line");
  await page.waitForFunction(() => document.querySelector("#log").textContent.includes('Resultaat {"status":"aborted","penRaised":true}'));
  await page.click("#stop");
  assert(!(await page.evaluate(() => sentCommands)).includes("!"), "ordinary Stop never sends feed-hold");
  await page.waitForFunction(() => document.querySelector("#log").textContent.includes("Stop aangevraagd:"));
  console.log(`${siteMode ? "Release site" : "Development"} hardware test page: real p5 canvas, automatic DrawCore selection, read-only status, explicit origin, Z lift, 10 mm line/square and controlled Stop text verified in Chromium with simulated serial.`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
