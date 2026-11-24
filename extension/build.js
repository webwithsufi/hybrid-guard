import { build } from "esbuild";
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "dist");

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

console.log("[Build] Step 1: Building React Popup with Vite...");
execSync("npx.cmd vite build", { stdio: "inherit", cwd: __dirname });

console.log("[Build] Step 2: Bundling background service worker with esbuild...");
await build({
  entryPoints: [resolve(__dirname, "src/background.ts")],
  outfile: resolve(distDir, "background.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  define: {
    "process.env.NODE_ENV": '"production"',
    "global": "self",
    "import.meta.env": "{}"
  }
});

console.log("[Build] Step 3: Bundling content-serp.ts with esbuild (IIFE)...");
await build({
  entryPoints: [resolve(__dirname, "src/content-serp.ts")],
  outfile: resolve(distDir, "content-serp.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  define: {
    "process.env.NODE_ENV": '"production"',
    "global": "self",
    "import.meta.env": "{}"
  }
});

console.log("[Build] Step 4: Bundling content-page.ts with esbuild (IIFE)...");
await build({
  entryPoints: [resolve(__dirname, "src/content-page.ts")],
  outfile: resolve(distDir, "content-page.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  define: {
    "process.env.NODE_ENV": '"production"',
    "global": "self",
    "import.meta.env": "{}"
  }
});

console.log("[Build] Step 4b: Bundling content-bridge.ts with esbuild (IIFE)...");
await build({
  entryPoints: [resolve(__dirname, "src/content-bridge.ts")],
  outfile: resolve(distDir, "content-bridge.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  define: {
    "process.env.NODE_ENV": '"production"',
    "global": "self",
    "import.meta.env": "{}"
  }
});

console.log("[Build] Step 5: Copying manifest.json...");
copyFileSync(resolve(__dirname, "manifest.json"), resolve(distDir, "manifest.json"));

console.log("✓ Extension build completed successfully in /extension/dist!");
