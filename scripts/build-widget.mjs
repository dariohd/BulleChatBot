#!/usr/bin/env node
import { copyFileSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8"));
const version = pkg.version.replace(/\./g, "");
const source = path.join(root, "public", "widget", "bulle.js");
const versioned = path.join(root, "public", "widget", `bulle.v${version}.js`);

copyFileSync(source, versioned);
writeFileSync(
  path.join(root, "public", "widget", "manifest.json"),
  JSON.stringify({ version: pkg.version, file: `bulle.v${version}.js` }, null, 2)
);

console.log(`Widget versionné : bulle.v${version}.js`);
