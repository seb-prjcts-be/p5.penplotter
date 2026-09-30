// Renders docs/*.md that the site links to as HTML pages in the site's own
// chrome. GitHub Pages serves a bare .md as plain text, so the Markdown stays
// the editable source and the HTML next to it is generated: `npm run docs`.
// tests/snapshot.js fails when a generated page is out of date.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const PAGES = [
  { source: "docs/architecture.md", target: "docs/architecture.html", eyebrow: "Architecture · an adapter, not a second engine" }
];

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function inline(text) {
  const codes = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  out = escapeHtml(out)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return out.replace(/\u0000(\d+)\u0000/g, (_, index) => codes[Number(index)]);
}

function tableRow(line, tag) {
  const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
  return `<tr>${cells.map((cell) => `<${tag}>${inline(cell)}</${tag}>`).join("")}</tr>`;
}

export function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let index = 0;
  const paragraph = [];
  const flush = () => {
    if (paragraph.length > 0) html.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph.length = 0;
  };
  while (index < lines.length) {
    const line = lines[index];
    if (line.startsWith("```")) {
      flush();
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) code.push(lines[index++]);
      html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      index += 1;
    } else if (/^#{1,3} /.test(line)) {
      flush();
      const level = line.match(/^#+/)[0].length;
      html.push(`<h${level}>${inline(line.slice(level + 1))}</h${level}>`);
      index += 1;
    } else if (line.startsWith("|")) {
      flush();
      const rows = [];
      while (index < lines.length && lines[index].startsWith("|")) rows.push(lines[index++]);
      const body = rows.slice(2).map((row) => tableRow(row, "td")).join("");
      html.push(`<table><thead>${tableRow(rows[0], "th")}</thead><tbody>${body}</tbody></table>`);
    } else if (/^(-|\d+\.) /.test(line)) {
      flush();
      const ordered = /^\d+\./.test(line);
      const items = [];
      while (index < lines.length && /^(-|\d+\.) /.test(lines[index])) {
        let item = lines[index++].replace(/^(-|\d+\.) /, "");
        while (index < lines.length && /^\s+\S/.test(lines[index])) item += ` ${lines[index++].trim()}`;
        items.push(`<li>${inline(item)}</li>`);
      }
      html.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`);
    } else if (line.trim() === "") {
      flush();
      index += 1;
    } else {
      paragraph.push(line.trim());
      index += 1;
    }
  }
  flush();
  return html.join("\n");
}

export function renderPage(page, markdown) {
  const body = renderMarkdown(markdown);
  const title = (markdown.match(/^# (.+)$/m) || [, page.target])[1];
  const content = body.replace(/^<h1>.*?<\/h1>\n?/, "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — p5.penplotter</title>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="nav">
    <a class="brand" href="../index.html"><span>p5</span>.penplotter</a>
    <div class="nav-links"><a href="setup.html">Setup</a><a href="guide.html">Guide</a><a href="examples.html">Examples</a><a href="architecture.html">Architecture</a><a href="about.html">About</a></div>
  </nav>
  <main class="page">
    <header class="page-header">
      <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="lead">Generated from <a href="${path.basename(page.source)}">${path.basename(page.source)}</a>; edit the Markdown and run <code>npm run docs</code>.</p>
    </header>
${content}
  </main>
</body>
</html>
`;
}

export function buildDocs(write = true) {
  const stale = [];
  for (const page of PAGES) {
    const markdown = fs.readFileSync(path.join(root, page.source), "utf8");
    const html = renderPage(page, markdown);
    const target = path.join(root, page.target);
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n") : null;
    if (current !== html) stale.push(page.target);
    if (write) fs.writeFileSync(target, html);
  }
  return stale;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const stale = buildDocs(true);
  console.log(`docs: ${PAGES.length} page rendered${stale.length ? ` (${stale.join(", ")} updated)` : " (already current)"}`);
}
