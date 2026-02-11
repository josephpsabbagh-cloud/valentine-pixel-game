#!/usr/bin/env bash
set -euo pipefail

echo "WARNING: This will discard all uncommitted changes in this repository."
echo "It will run: git reset --hard baseline-safe-point and git clean -fd"
read -r -p "Type YES to continue: " confirm

if [[ "$confirm" != "YES" ]]; then
  echo "Aborted."
  exit 1
fi

git reset --hard baseline-safe-point
git clean -fd

echo "Branch: $(git branch --show-current)"
echo "Commit: $(git rev-parse --short HEAD)"
