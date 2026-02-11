#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/assets/content/photos/wishlist"
mkdir -p "$OUT_DIR"

curl -L --fail "https://commons.wikimedia.org/wiki/Special:FilePath/New_Caledonia_lagoon.jpg" -o "$OUT_DIR/new_caledonia.jpg"
curl -L --fail "https://commons.wikimedia.org/wiki/Special:FilePath/Chocolate_Hills_Bohol_Philippines.jpg" -o "$OUT_DIR/philippines.jpg"
curl -L --fail "https://commons.wikimedia.org/wiki/Special:FilePath/Mount_Fuji_from_Lake_Kawaguchi.jpg" -o "$OUT_DIR/japan.jpg"
curl -L --fail "https://commons.wikimedia.org/wiki/Special:FilePath/Powder_skiing_in_Chamonix_Mont_Blanc.JPG" -o "$OUT_DIR/chamonix.jpg"
curl -L --fail "https://commons.wikimedia.org/wiki/Special:FilePath/Fitz_Roy%2C_El_Chalten%2C_Patagonia.jpg" -o "$OUT_DIR/patagonia.jpg"

echo "Wishlist photos saved to $OUT_DIR"
ls -1 "$OUT_DIR"
