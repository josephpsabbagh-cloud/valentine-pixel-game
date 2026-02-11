#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="/mnt/c/Users/josep/OneDrive/Desktop"
DST_DIR="$ROOT_DIR/assets/content/photos/visited"

mkdir -p "$DST_DIR"

cp -f "$SRC_DIR/uk.jpeg" "$DST_DIR/uk.jpeg"
cp -f "$SRC_DIR/spain.jpeg" "$DST_DIR/spain.jpeg"
cp -f "$SRC_DIR/ghana.jpeg" "$DST_DIR/ghana.jpeg"
cp -f "$SRC_DIR/paris.jpeg" "$DST_DIR/france.jpeg"
cp -f "$SRC_DIR/colombia.jpeg" "$DST_DIR/colombia.jpeg"
cp -f "$SRC_DIR/uae.jpeg" "$DST_DIR/uae.jpeg"
cp -f "$SRC_DIR/Finland.jpeg" "$DST_DIR/finland.jpeg"
cp -f "$SRC_DIR/Vietnam.jpeg" "$DST_DIR/vietnam.jpeg"
cp -f "$SRC_DIR/Croatia.jpeg" "$DST_DIR/croatia.jpeg"
cp -f "$SRC_DIR/Lebanon.jpeg" "$DST_DIR/lebanon.jpeg"
cp -f "$SRC_DIR/Peru.jpeg" "$DST_DIR/peru.jpeg"
cp -f "$SRC_DIR/Egypt.jpg" "$DST_DIR/egypt.jpg"

echo "Imported visited destination photos into: $DST_DIR"
ls -1 "$DST_DIR"
