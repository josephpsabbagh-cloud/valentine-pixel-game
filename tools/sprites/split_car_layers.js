#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

let sharp;
try {
  sharp = require("sharp");
} catch (err) {
  console.error("sharp is required. Install with: npm i sharp");
  process.exit(1);
}

const ROOT = process.cwd();
const INPUT = path.join(ROOT, "assets/props/charly_car.png");
const OUT_BASE = path.join(ROOT, "assets/props/charly_car_base.png");
const OUT_HEAD = path.join(ROOT, "assets/props/charly_head_car.png");

// Tunable crop regions (source image pixel coords).
// Update these values if your source car framing changes.
const WINDOW_CUT = { left: 286, top: 378, width: 188, height: 260 };
const HEAD_EXTRACT = { left: 304, top: 412, width: 150, height: 170 };

function isCheckerPixel(r, g, b) {
  const neutral = Math.abs(r - g) < 9 && Math.abs(g - b) < 9;
  if (!neutral) {
    return false;
  }
  const bright = r >= 212 && r <= 253;
  const mid = r >= 168 && r <= 208;
  return bright || mid;
}

async function build() {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`Missing input: ${INPUT}`);
  }

  const source = sharp(INPUT).ensureAlpha();
  const meta = await source.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (!width || !height) {
    throw new Error("Could not read input dimensions.");
  }

  const { data } = await source.raw().toBuffer({ resolveWithObject: true });
  const cleaned = Buffer.from(data);
  for (let i = 0; i < cleaned.length; i += 4) {
    const r = cleaned[i];
    const g = cleaned[i + 1];
    const b = cleaned[i + 2];
    if (isCheckerPixel(r, g, b)) {
      cleaned[i + 3] = 0;
    }
  }

  const cleanedPng = await sharp(cleaned, {
    raw: { width, height, channels: 4 }
  })
    .png()
    .toBuffer();

  const cutW = Math.max(1, Math.min(WINDOW_CUT.width, width - WINDOW_CUT.left));
  const cutH = Math.max(1, Math.min(WINDOW_CUT.height, height - WINDOW_CUT.top));
  const windowMask = Buffer.alloc(cutW * cutH * 4, 0);
  await sharp(cleanedPng)
    .composite([
      {
        input: windowMask,
        raw: { width: cutW, height: cutH, channels: 4 },
        left: WINDOW_CUT.left,
        top: WINDOW_CUT.top,
        blend: "dest-out"
      }
    ])
    .png()
    .toFile(OUT_BASE);

  const headW = Math.max(1, Math.min(HEAD_EXTRACT.width, width - HEAD_EXTRACT.left));
  const headH = Math.max(1, Math.min(HEAD_EXTRACT.height, height - HEAD_EXTRACT.top));
  await sharp(cleanedPng)
    .extract({
      left: HEAD_EXTRACT.left,
      top: HEAD_EXTRACT.top,
      width: headW,
      height: headH
    })
    .trim()
    .png()
    .toFile(OUT_HEAD);

  console.log("Generated:");
  console.log(path.relative(ROOT, OUT_BASE));
  console.log(path.relative(ROOT, OUT_HEAD));
  console.log("Tune WINDOW_CUT / HEAD_EXTRACT in tools/sprites/split_car_layers.js if alignment needs adjustment.");
}

build().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
