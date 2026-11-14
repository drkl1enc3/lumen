#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const [, , artifactsArg, tagArg, repoArg] = process.argv;
if (!artifactsArg || !tagArg) {
  console.error("Usage: node scripts/make-latest-json.mjs <artifacts-dir> <tag> [owner/repo]");
  process.exit(1);
}

const root = resolve(artifactsArg);
const version = tagArg.replace(/^v/, "");
const repo = repoArg || "drkl1enc3/lumen";
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(root);

const platforms = {};
for (const signatureFile of files.filter((file) => file.endsWith(".sig"))) {
  const asset = signatureFile.slice(0, -4);
  const name = basename(asset);
  let platform = null;
  if (name.includes("AppImage")) platform = "linux-x86_64";
  else if (name.includes("setup") || name.includes(".nsis.")) platform = "windows-x86_64";
  else if (name.includes("aarch64") && (name.includes(".app.") || name.includes(".dmg")))
    platform = "darwin-aarch64";
  else if (name.includes(".app.") || name.includes(".dmg")) platform = "darwin-x86_64";
  if (!platform) continue;
  platforms[platform] = {
    signature: readFileSync(signatureFile, "utf8").trim(),
    url: `https://github.com/${repo}/releases/download/${tagArg}/${encodeURIComponent(name)}`,
  };
}

let notes = "";
try {
  const changelog = readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf8");
  const marker = `## ${version}`;
  const start = changelog.indexOf(marker);
  if (start >= 0) {
    const body = changelog.slice(start + marker.length);
    const end = body.indexOf("\n## ");
    notes = (end >= 0 ? body.slice(0, end) : body).trim();
  }
} catch {
  // Changelog is optional for the updater manifest.
}

const latest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms,
};
writeFileSync(join(root, "latest.json"), `${JSON.stringify(latest, null, 2)}\n`);

const sums = files
  .filter((file) => !file.endsWith(".sig") && !file.endsWith("latest.json") && !file.endsWith("SHA256SUMS"))
  .map((file) => {
    const digest = createHash("sha256").update(readFileSync(file)).digest("hex");
    return `${digest}  ${relative(root, file)}`;
  })
  .sort();
writeFileSync(join(root, "SHA256SUMS"), `${sums.join("\n")}\n`);
console.log(`Wrote latest.json (${Object.keys(platforms).length} platforms) and SHA256SUMS`);
