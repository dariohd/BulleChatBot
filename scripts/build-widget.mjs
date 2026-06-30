#!/usr/bin/env node
import { copyFileSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const widgetDir = path.join(root, "public", "widget");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8"));
const version = pkg.version.replace(/\./g, "");
const versionedName = `bulle.v${version}.js`;

const appSource = readFileSync(path.join(widgetDir, "bulle.app.js"), "utf-8");
const stampedApp = appSource.replace(
  /__BULLE_WIDGET_VERSION__/g,
  pkg.version
);

writeFileSync(path.join(widgetDir, versionedName), stampedApp);
copyFileSync(
  path.join(widgetDir, "bulle.loader.js"),
  path.join(widgetDir, "bulle.js")
);
writeFileSync(
  path.join(widgetDir, "manifest.json"),
  JSON.stringify(
    {
      version: pkg.version,
      file: versionedName,
      assets: {
        mascot: "bulle-mascot.svg",
      },
    },
    null,
    2
  ) + "\n"
);

console.log(`Widget versionné : ${versionedName}`);
