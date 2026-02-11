# Valentine Pixel Game

A browser-based pixel-style game built with plain HTML, CSS, and JavaScript modules.

## Project Structure

- `index.html` - app shell and canvas mount
- `game.js` - main loop, rendering, scenes, state
- `world.js` - world layouts and map data
- `interactions.js` - interaction helpers/modals
- `characters.js` - character definitions
- `style.css` - UI and scene styling
- `assets/` - images/audio placeholders

## Prerequisites

- Git (optional but recommended)
- Python 3 **or** Node.js (for local dev server)
- A modern browser (Chrome/Edge/Firefox)

## 1) Set Up Git

If this folder is not already a Git repository:

```bash
git init
git add .
git commit -m "Initial commit"
```

Optional: connect a remote and push:

```bash
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

## 2) Install Dependencies

This project currently has **no npm dependencies**. Nothing to install for runtime.

If you later add tooling (lint/test/build), run:

```bash
npm install
```

## 3) Run a Dev Server

Because this project uses ES modules, open it through HTTP (not `file://`).

### Option A: Python

```bash
python3 -m http.server 8000
```

Then open:

`http://localhost:8000`

### Option B: Node (if you prefer)

```bash
npx serve .
```

or

```bash
npx http-server .
```

## 4) Debugging Guide

### Browser DevTools

1. Open the game at `http://localhost:8000`.
2. Open DevTools:
- Chrome/Edge: `F12` or `Ctrl+Shift+I`
- Firefox: `F12` or `Ctrl+Shift+I`
3. Use:
- **Console** for runtime errors and logs
- **Sources** for breakpoints in `game.js`
- **Network** to verify assets load (audio/images)

### Common Issues

- `Cannot use import statement outside a module`
- Cause: opening via `file://`
- Fix: run an HTTP server (see above)

- Asset/music/photo not loading
- Cause: file missing or wrong path
- Fix: verify files under `assets/` and check Network tab

- Scene/modal feels stuck
- Check Console for errors
- Press `Escape` to close scene overlays where supported

### LocalStorage Reset (useful for testing rewards/progression)

In DevTools Console:

```js
localStorage.clear();
```

Or remove specific keys (examples):

```js
localStorage.removeItem("olw_totalFlowers");
localStorage.removeItem("olw_collectedFlowerIds");
localStorage.removeItem("olw_unlockedLetters");
```

## 5) Create a Dated Backup Zip

Use the included backup script:

```bash
bash backup.sh
```

It creates a timestamped zip inside `backups/`.

Example output:

- `backups/valentine_pixel_game_2026-02-09_213045.zip`

## Development Tips

- Keep game logic in `game.js` and map/layout data in `world.js`.
- Prefer small commits with clear messages.
- Test in browser after scene or interaction changes.
