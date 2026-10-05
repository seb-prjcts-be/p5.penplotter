# Stable CDN imports

The stable branch follows tested release tags. Publishing a tag runs the repository checks; only a successful run can advance stable. Prerelease tags are excluded. Promotion uses a normal fast-forward push and never changes an existing release tag.

A stable URL keeps a sketch on the released code as releases arrive. jsDelivr caches branch URLs, so an update may take time to appear. An already open sketch keeps its loaded code until reloaded. Use a version tag when a saved drawing must keep the same implementation.

For p5.js, load p5 first and use the self-contained adapter bundle:

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2.2.2/lib/p5.min.js"></script>
<script type="module">
  import { install } from "https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.penplotter@stable/dist/p5.penplotter.js";
  install(p5);
</script>
```

The classic-script alternative is:

```html
<script src="https://cdn.jsdelivr.net/gh/seb-prjcts-be/p5.penplotter@stable/dist/p5.penplotter.browser.js"></script>
```

The p5 bundle contains its tested vanilla core and both drivers. Do not add a separate vanilla import to the same sketch. Standalone vanilla projects can use:

```js
import { PlotterEngine } from "https://cdn.jsdelivr.net/gh/seb-prjcts-be/vanilla.penplotter@stable/vanilla.penplotter.js";
import * as Driver from "https://cdn.jsdelivr.net/gh/seb-prjcts-be/vanilla.penplotter@stable/src/driver/index.js";
```

Each repository advances independently. The p5 core pin remains explicit; changing standalone vanilla stable does not replace the core inside the p5 bundle.

Existing Web Editor sketches need their imports changed once. Their saved files are not edited by this release process. The repository examples keep versioned imports for repeatable release checks.

Initial setup uses the locally verified p5 v0.3.1 commit f98a088 and vanilla commit 131efc7, including the DrawCore stop fixes after v0.5.0. Future advances require a full release tag and successful CI. These automated checks do not establish a physical stop test.
