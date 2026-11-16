#!/usr/bin/env node
/**
 * Regenerate the raster favicons from public/favicon.svg.
 *
 * The ICO is a container around a 32x32 PNG, which every current browser reads,
 * and it avoids a 404 on the legacy /favicon.ico request that Lighthouse counts
 * as a console error.
 */
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync("public/favicon.svg");

const [png32, png180, png512] = await Promise.all(
  [32, 180, 512].map(size => sharp(svg).resize(size, size).png().toBuffer())
);

writeFileSync("public/apple-touch-icon.png", png180);
writeFileSync("public/favicon-512.png", png512);
writeFileSync("public/favicon-32.png", png32);

// ICO header: reserved(0), type(1 = icon), image count(1); then one directory
// entry pointing at the PNG payload that follows.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0); // width
entry.writeUInt8(32, 1); // height
entry.writeUInt8(0, 2); // palette colours
entry.writeUInt8(0, 3); // reserved
entry.writeUInt16LE(1, 4); // colour planes
entry.writeUInt16LE(32, 6); // bits per pixel
entry.writeUInt32LE(png32.length, 8);
entry.writeUInt32LE(header.length + entry.length, 12);

writeFileSync(
  "public/favicon.ico",
  Buffer.concat([header, entry, png32])
);

console.log("favicons written: favicon.ico, favicon-32.png, apple-touch-icon.png, favicon-512.png");
