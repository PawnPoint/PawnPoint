import { copyFileSync, existsSync, mkdirSync } from "fs";
import path from "path";

const srcDir = path.join(process.cwd(), "node_modules", "stockfish.wasm");
const destDir = path.join(process.cwd(), "public", "stockfish");
const files = ["stockfish.js", "stockfish.wasm", "stockfish.worker.js"];

if (!existsSync(srcDir)) {
  console.error("stockfish.wasm is not installed. Run `npm install stockfish.wasm` first.");
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });

files.forEach((file) => {
  const from = path.join(srcDir, file);
  const to = path.join(destDir, file);
  if (!existsSync(from)) {
    console.warn(`Skipping missing file: ${file}`);
    return;
  }
  copyFileSync(from, to);
});

console.log("Stockfish assets copied to", destDir);
