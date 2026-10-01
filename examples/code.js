// The code panel of an example page shows the example's own files, fetched
// from next to the page, so the code you read is the code that runs. Each
// <code data-src="file.js"> is filled in and highlighted when Prism is there.
// This file is shared with p5.penplotter; keep the two copies identical.
const blocks = document.querySelectorAll("code[data-src]");
for (const block of blocks) {
  const file = block.dataset.src;
  fetch(file, { cache: "no-cache" })
    .then((response) => (response.ok ? response.text() : Promise.reject(new Error(`${response.status} ${response.statusText}`))))
    .then((source) => {
      block.textContent = source.replace(/\s+$/, "");
      if (globalThis.Prism) globalThis.Prism.highlightElement(block);
    })
    .catch((error) => {
      block.textContent = `// ${file} could not be loaded (${error.message}). It is in the repository next to this page.`;
    });
}
