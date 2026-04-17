/**
 * Flattens src/packs/devil-fruit-feats/**\/*.json into a temporary staging directory
 * before packing, since fvtt-cli does not recurse into subdirectories.
 * Usage: node scripts/flatten-feats.mjs [stage|clean]
 */
import { readdirSync, mkdirSync, copyFileSync, rmSync, existsSync } from "fs";
import { join } from "path";

const SRC = "src/packs/devil-fruit-feats";
const STAGE = ".tmp-devil-fruit-feats";

function collectJsonFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      results.push(full);
    }
  }
  return results;
}

const action = process.argv[2] ?? "stage";

if (action === "stage") {
  mkdirSync(STAGE, { recursive: true });
  const files = collectJsonFiles(SRC);
  for (const file of files) {
    const dest = join(STAGE, file.split(/[\\/]/).pop());
    copyFileSync(file, dest);
  }
  console.log(`Staged ${files.length} feat files into ${STAGE}`);
} else if (action === "clean") {
  if (existsSync(STAGE)) rmSync(STAGE, { recursive: true, force: true });
  console.log(`Cleaned ${STAGE}`);
}
