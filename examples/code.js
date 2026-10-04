// The code panel of an example page shows the example's own files, fetched
// from next to the page, so the code you read is the code that runs. Each
// <code data-src="file.js"> is filled in and highlighted when Prism is there.
// This file is shared with p5.penplotter; keep the two copies identical.
export function extractModule(source) {
  const module = source.match(/<script\b[^>]*\btype=["']module["'][^>]*>[\s\S]*?<\/script>/i);
  if (!module) throw new Error('No <script type="module"> block found');
  return module[0];
}

const blocks = globalThis.document?.querySelectorAll("code[data-src]") || [];
for (const block of blocks) {
  const file = block.dataset.src;
  fetch(file, { cache: "no-cache" })
    .then((response) => (response.ok ? response.text() : Promise.reject(new Error(`${response.status} ${response.statusText}`))))
    .then((source) => {
      block.textContent = (block.dataset.part === "module" ? extractModule(source) : source).replace(/\s+$/, "");
      if (globalThis.Prism) globalThis.Prism.highlightElement(block);
    })
    .catch((error) => {
      block.textContent = `// ${file} could not be loaded (${error.message}). It is in the repository next to this page.`;
    });
}
