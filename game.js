import { getWorldLayout, worldLayouts } from "./world.js";
import { characters } from "./characters.js";
import {
  getInteractableNearPlayer,
  isPointInRect,
  loadJsonArray,
  openInteractableOverlay,
  saveJsonArray,
  tryCollectFlower,
  tryPetInteraction
} from "./interactions.js";

const TOTAL_FLOWERS_KEY = "olw_totalFlowers";
const COLLECTED_FLOWER_IDS_KEY = "olw_collectedFlowerIds";
const PETTED_PET_IDS_KEY = "olw_pettedPetIds";
const MOVIE_LAST_CLAIM_DATE_KEY = "olw_movieLastClaimDate";
const PIMPLE_CLAIM_DATE_KEY = "olw_pimpleClaimDate";
const PIMPLE_TODAY_COUNT_KEY = "olw_pimpleTodayCount";
const SKI_LAST_CLAIM_DATE_KEY = "olw_skiLastClaimDate";
const RESTAURANT_WIN_DATE_KEY = "olw_restaurantWinDate";
const EDIT_WIN_DATE_KEY = "olw_editWinDate";
const UNLOCKED_LETTERS_KEY = "olw_unlockedLetters";

const LETTER_MILESTONES = [10, 20, 35, 50, 70, 95, 125];
const LOVE_LETTERS = [
  {
    id: "letter-1",
    title: "First Bloom",
    body:
      "Charly,\n\nEvery tiny win you make feels big to me.\nEven your quiet moments are bright.\n\n- Joe"
  },
  {
    id: "letter-2",
    title: "Soft Evenings",
    body:
      "My love,\n\nYou make ordinary evenings feel warm.\nI still smile at your sleepy face on movie nights.\n\n- Joe"
  },
  {
    id: "letter-3",
    title: "Your Spark",
    body:
      "Charly,\n\nYou bring energy to every room.\nThat big smile of yours always wins me over.\n\n- Joe"
  },
  {
    id: "letter-4",
    title: "Playful Promise",
    body:
      "Hey trouble,\n\nIf you steal the blanket again,\nI still choose you.\nEvery single night.\n\n- Joe"
  },
  {
    id: "letter-5",
    title: "Little Things",
    body:
      "Charly,\n\nI notice the little things:\nYour laugh, your focus, your kindness.\nThey matter more than you think.\n\n- Joe"
  },
  {
    id: "letter-6",
    title: "Always Home",
    body:
      "My heart,\n\nNo matter where we go,\nhome is wherever we are together.\n\n- Joe"
  },
  {
    id: "letter-7",
    title: "Forever Note",
    body:
      "Charly,\n\nThank you for being my favorite person.\nI will keep choosing you,\nsoftly and loudly,\nevery day.\n\n- Joe"
  }
];

const MINI_GAMES = {
  movie: {
    rewardFlowers: 3,
    dailyKey: MOVIE_LAST_CLAIM_DATE_KEY,
    chooseOptions: ["Reality Show", "Classics (Joe's pick)", "Thriller Documentary (Charly's pick)"],
    durations: {
      playing1Ms: 7000,
      wakeWindowMs: 5000,
      playing2Ms: 4500
    }
  },
  pimple: {
    thresholds: {
      fastScrub: 420,
      maxHoldMs: 900,
      popFastMs: 380,
      popVeryFastMs: 240
    },
    moodCooldownMs: 1500,
    rewardFlowers: 1
  },
  edit: {
    rewardFlowers: 4,
    dailyKey: EDIT_WIN_DATE_KEY,
    sequence: ["brand shoot", "closeup", "product", "voiceover", "cta", "outro"]
  }
};

let canvas;
let ctx;
let uiEl;
let lastTimestamp = 0;
let editVideoUpgradeLogged = false;
const WORLD_TILE_SIZE_PX = 48;
const PLAYER_RENDER_SIZE_PX = WORLD_TILE_SIZE_PX;
const COMPANION_RENDER_SIZE_PX = WORLD_TILE_SIZE_PX;
const CAMERA_LERP = 0.14;
const CAMERA_DEADZONE_X_PX = 72;
const CAMERA_DEADZONE_Y_PX = 52;
const CHARLY_SPRITE_SHEET_SRC = "assets/sprites/characters/charly_walksheet_48.png";
const CHARLY_FRAME_W = 48;
const CHARLY_FRAME_H = 48;
const CHARLY_SHEET_COLS = 6;
const CHARLY_ANIM_FPS = 10;
const JOE_SPRITE_SHEET_SRC = "assets/sprites/characters/joe_walksheet_48.png";
const JOE_FRAME_W = 48;
const JOE_FRAME_H = 48;
const JOE_SHEET_COLS = 6;
const JOE_ANIM_FPS = 10;
const PET_FRAME_W = 32;
const PET_FRAME_H = 32;
const PET_SHEET_COLS = 4;
const PET_IDLE_FPS = 4;
const PET_WALK_FPS = 8;
const PET_TILE_RENDER_SIZE = 40; // Explicitly smaller than one world tile.
const PET_WALK_WINDOW_MS = 180;
const COUSIN_SWIM_FRAME_W = 32;
const COUSIN_SWIM_FRAME_H = 32;
const COUSIN_SWIM_FRAMES = 4;
const COUSIN_SWIM_FPS = 5;
const COUSIN_SWIM_RENDER_SIZE = 40; // Explicitly smaller than one world tile.
const COUSIN_SWAY_TILE_RANGE = 1;
const COUSIN_SWAY_SPEED = 0.9;
const COUSIN_BOB_PX = 3;
const COUSIN_BOB_SPEED = 2.1;
const FLOATER_BOUNCE_PX = 9;
const GUIDE_TARGET_HIDE_RADIUS_TILES = 3;
const GUIDE_MAX_ARROWS = 2;
const GUIDE_EDGE_PADDING_X = 36;
const GUIDE_EDGE_PADDING_TOP = 72;
const GUIDE_EDGE_PADDING_BOTTOM = 32;
const GUIDE_ARROW_BOUNCE_PX = 5;
const DRIVE_HEAD_OFFSET_X = 56;
const DRIVE_HEAD_OFFSET_Y = 56;
const DRIVE_HEAD_DRAW_W = 42;
const DRIVE_HEAD_DRAW_H = 42;
const DRIVE_HEAD_BOB_PX = 2.4;
const DRIVE_HEAD_BOB_SPEED = 3.4;
const DRIVE_HEAD_DEBUG_CROSSHAIR = false;
const PET_SPRITE_SOURCES = {
  cat: "assets/sprites/pets/papi_chulo_cat_32.png",
  dog: "assets/sprites/pets/rio_dog_32.png"
};
const COUSIN_SWIM_SPRITE_SOURCES = {
  "cousin-1": "assets/sprites/cousins/jonah_swim_32.png",
  "cousin-2": "assets/sprites/cousins/millie_swim_floaters_32.png",
  "cousin-3": "assets/sprites/cousins/benji_swim_32.png"
};
const BEDROOM_CLUTTER_POSITIONS = [
  // Next to bed
  { x: 13, y: 9, w: 1, h: 1, asset: "clutter1" },
  // In the middle, next to small couch (2x2)
  { x: 8, y: 4, w: 2, h: 2, asset: "clutter2" },
  // Extra cozy piece
  { x: 13, y: 6, w: 1, h: 1, asset: "clutter3" },
  // Next to TV stand (2x2)
  { x: 12, y: 1, w: 2, h: 2, asset: "clutter4" }
];
let charlySpriteSheet = null;
let charlySpriteLoaded = false;
let charlySpriteErrored = false;
let joeSpriteSheet = null;
let joeSpriteLoaded = false;
let joeSpriteErrored = false;
const petSprites = {
  cat: { image: null, loaded: false, errored: false },
  dog: { image: null, loaded: false, errored: false }
};
const cousinSwimSprites = {};
const bedroomArtAssets = {
  floor: { src: "assets/tiles/bedroom_floor_48.png", image: null, loaded: false, errored: false },
  wall: { src: "assets/tiles/bedroom_wall_48.png", image: null, loaded: false, errored: false },
  bed: { src: "assets/props/bed_big_comfy.png", image: null, loaded: false, errored: false },
  tv: { src: "assets/props/tv_stand_glow.png", image: null, loaded: false, errored: false },
  desk: { src: "assets/props/desk_macbook.png", image: null, loaded: false, errored: false },
  couch: { src: "assets/props/small_couch.png", image: null, loaded: false, errored: false },
  car: { src: "assets/props/charly_car.png", image: null, loaded: false, errored: false },
  carBase: { src: "assets/props/charly_car_base.png", image: null, loaded: false, errored: false },
  carHead: { src: "assets/props/charly_head_car.png", image: null, loaded: false, errored: false },
  clutter1: { src: "assets/props/cozy_clutter_set.png", image: null, loaded: false, errored: false },
  clutter2: { src: "assets/props/cozy_clutter_set2.png", image: null, loaded: false, errored: false },
  clutter3: { src: "assets/props/cozy_clutter_set3.png", image: null, loaded: false, errored: false },
  clutter4: { src: "assets/props/cozy_clutter_set4.png", image: null, loaded: false, errored: false }
};
const destinationArtAssets = {
  skiLiftKiosk: { src: "assets/props/ski_lift_kiosk.png", image: null, loaded: false, errored: false, renderMode: "crop" },
  airportDeparturesKiosk: {
    src: "assets/props/airport_departures_kiosk.png",
    image: null,
    loaded: false,
    errored: false,
    renderMode: "crop"
  },
  restaurantEntrance: {
    src: "assets/props/restaurant_host_counter.png",
    image: null,
    loaded: false,
    errored: false,
    renderMode: "crop"
  },
  rosePickup: { src: "assets/sprites/rose_pickup_48.png", image: null, loaded: false, errored: false, renderMode: "crop" },
  skiBg: { src: "assets/scenes/ski_bg_520x220.png", image: null, loaded: false, errored: false },
  slalomGate: { src: "assets/sprites/slalom_gate_48.png", image: null, loaded: false, errored: false, renderMode: "crop" },
  heartIcon: { src: "assets/ui/heart_32.png", image: null, loaded: false, errored: false, renderMode: "crop" },
  airportGlobe: { src: "assets/props/airport_globe.png", image: null, loaded: false, errored: false },
  globeFrame: { src: "assets/ui/globe_frame_520x320.png", image: null, loaded: false, errored: false, renderMode: "alpha" },
  restaurantMoodCozy: {
    src: "assets/scenes/restaurant_mood_cozy_520x320.png",
    image: null,
    loaded: false,
    errored: false
  },
  restaurantMoodFancy: {
    src: "assets/scenes/restaurant_mood_fancy_520x320.png",
    image: null,
    loaded: false,
    errored: false
  },
  restaurantMoodFun: {
    src: "assets/scenes/restaurant_mood_fun_520x320.png",
    image: null,
    loaded: false,
    errored: false
  }
};
const pimpleSceneAssets = {
  joeBase: { src: "assets/minigames/pimple/joe_forehead_crop_base.png", image: null, loaded: false, errored: false },
  react1: { src: "assets/minigames/pimple/joe_forehead_crop_react1.png", image: null, loaded: false, errored: false },
  react2: { src: "assets/minigames/pimple/joe_forehead_crop_react2.png", image: null, loaded: false, errored: false },
  react3: { src: "assets/minigames/pimple/joe_forehead_crop_react3.png", image: null, loaded: false, errored: false },
  charly: { src: "assets/minigames/pimple/charly_idle.png", image: null, loaded: false, errored: false },
  bubbles: { src: "assets/minigames/pimple/forehead_bubbles_round.png", image: null, loaded: false, errored: false },
  popParticles: { src: "assets/minigames/pimple/pop_particles.png", image: null, loaded: false, errored: false }
};
const petAnimStates = new Map();
const charlyAnim = {
  facingRow: 0,
  frame: 0,
  elapsedMs: 0,
  movingMs: 0
};
const joeAnim = {
  facingRow: 0,
  frame: 0,
  elapsedMs: 0,
  movingMs: 0
};

function safeAudioPlay(fn) {
  try {
    if (typeof fn === "function") {
      fn();
    }
  } catch {
    // Keep scenes safe if audio cannot initialize.
  }
}

const state = {
  tileSize: WORLD_TILE_SIZE_PX,
  flowers: 0,
  collectedFlowerIds: [],
  pettedPetIds: [],
  floaters: [],
  player: { x: 0, y: 0 },
  companion: { x: 0, y: 0 },
  followTimerMs: 0,
  companionOffscreenMs: 0,
  petWanderTimerMs: 0,
  pets: [],
  camera: { x: 0, y: 0 },
  viewport: { w: 800, h: 600 },
  isModalOpen: false,
  closeOverlay: null,
  currentWorld: "home",
  activeWorldLayout: getWorldLayout("home"),
  soundOn: true,
  unlockedLetters: [],
  letterUnlockQueue: [],
  drive: {
    destination: "ski",
    remainingMs: 0,
    selectedTrack: 0,
    soundOn: true
  },
  debug: {
    showTileOverlay: false
  }
};

function initCanvas() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  uiEl = document.getElementById("ui");
  state.viewport.w = canvas.width;
  state.viewport.h = canvas.height;

  if (!document.getElementById("lettersHudButton")) {
    const app = document.getElementById("app");
    if (app) {
      const btn = document.createElement("button");
      btn.id = "lettersHudButton";
      btn.type = "button";
      btn.className = "ui-button";
      btn.textContent = "📖 Letters";
      btn.style.position = "absolute";
      btn.style.top = "8px";
      btn.style.right = "8px";
      btn.style.zIndex = "30";
      btn.style.pointerEvents = "auto";
      btn.addEventListener("click", () => {
        openLetterBook();
      });
      app.appendChild(btn);
    }
  }
}

function loadCharlySpriteSheet() {
  charlySpriteSheet = new Image();
  charlySpriteLoaded = false;
  charlySpriteErrored = false;
  charlySpriteSheet.onload = () => {
    charlySpriteLoaded = true;
  };
  charlySpriteSheet.onerror = () => {
    charlySpriteErrored = true;
    charlySpriteLoaded = false;
  };
  charlySpriteSheet.src = CHARLY_SPRITE_SHEET_SRC;
}

function loadJoeSpriteSheet() {
  joeSpriteSheet = new Image();
  joeSpriteLoaded = false;
  joeSpriteErrored = false;
  joeSpriteSheet.onload = () => {
    joeSpriteLoaded = true;
  };
  joeSpriteSheet.onerror = () => {
    joeSpriteErrored = true;
    joeSpriteLoaded = false;
  };
  joeSpriteSheet.src = JOE_SPRITE_SHEET_SRC;
}

function loadPetSprites() {
  for (const [species, src] of Object.entries(PET_SPRITE_SOURCES)) {
    const entry = petSprites[species];
    if (!entry) {
      continue;
    }
    entry.image = new Image();
    entry.loaded = false;
    entry.errored = false;
    entry.image.onload = () => {
      entry.loaded = true;
    };
    entry.image.onerror = () => {
      entry.errored = true;
      entry.loaded = false;
    };
    entry.image.src = src;
  }
}

function loadCousinSwimSprites() {
  for (const [cousinId, src] of Object.entries(COUSIN_SWIM_SPRITE_SOURCES)) {
    const entry = { image: new Image(), loaded: false, errored: false };
    entry.image.onload = () => {
      entry.loaded = true;
    };
    entry.image.onerror = () => {
      entry.errored = true;
      entry.loaded = false;
    };
    entry.image.src = src;
    cousinSwimSprites[cousinId] = entry;
  }
}

function loadBedroomArtAssets() {
  for (const asset of Object.values(bedroomArtAssets)) {
    asset.image = new Image();
    asset.loaded = false;
    asset.errored = false;
    asset.image.onload = () => {
      asset.loaded = true;
    };
    asset.image.onerror = () => {
      asset.errored = true;
      asset.loaded = false;
    };
    asset.image.src = asset.src;
  }
}

function loadDestinationArtAssets() {
  for (const asset of Object.values(destinationArtAssets)) {
    asset.image = new Image();
    asset.loaded = false;
    asset.errored = false;
    asset.preparedCanvas = null;
    asset.crop = null;
    asset.image.onload = () => {
      asset.loaded = true;
      prepareDestinationAsset(asset);
    };
    asset.image.onerror = () => {
      asset.errored = true;
      asset.loaded = false;
    };
    asset.image.src = asset.src;
  }
}

function prepareDestinationAsset(asset) {
  if (!asset?.image || asset.errored || !asset.loaded) {
    return;
  }
  if (asset.renderMode !== "crop" && asset.renderMode !== "alpha") {
    return;
  }
  const src = asset.image;
  const w = src.naturalWidth || src.width;
  const h = src.naturalHeight || src.height;
  if (!w || !h) {
    return;
  }
  const prep = document.createElement("canvas");
  prep.width = w;
  prep.height = h;
  const prepCtx = prep.getContext("2d");
  prepCtx.imageSmoothingEnabled = false;
  prepCtx.drawImage(src, 0, 0, w, h);
  const img = prepCtx.getImageData(0, 0, w, h);
  const d = img.data;

  const samples = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
    [Math.floor(w * 0.5), 0],
    [Math.floor(w * 0.5), h - 1],
    [0, Math.floor(h * 0.5)],
    [w - 1, Math.floor(h * 0.5)]
  ];
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  for (const [sx, sy] of samples) {
    const i = (sy * w + sx) * 4;
    bgR += d[i];
    bgG += d[i + 1];
    bgB += d[i + 2];
  }
  bgR /= samples.length;
  bgG /= samples.length;
  bgB /= samples.length;

  const originalAlpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i += 1) {
    originalAlpha[i] = d[i * 4 + 3];
  }

  const bgThreshold = 44;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (!a) {
      continue;
    }
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const dr = r - bgR;
    const dg = g - bgG;
    const db = b - bgB;
    const distBg = Math.sqrt(dr * dr + dg * dg + db * db);
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (distBg <= bgThreshold) {
      d[i + 3] = 0;
      continue;
    }
    if (r > 228 && g > 228 && b > 228 && sat < 18 && distBg < 95) {
      d[i + 3] = 0;
    }
  }

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const idx = y * w + x;
      const i = idx * 4;
      if (!d[i + 3]) {
        continue;
      }
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (r < 220 || g < 220 || b < 220 || sat > 24) {
        continue;
      }
      const n0 = originalAlpha[idx - 1];
      const n1 = originalAlpha[idx + 1];
      const n2 = originalAlpha[idx - w];
      const n3 = originalAlpha[idx + w];
      if (!n0 || !n1 || !n2 || !n3) {
        d[i + 3] = 0;
      }
    }
  }

  prepCtx.putImageData(img, 0, 0);
  asset.preparedCanvas = prep;
  asset.crop = null;
  if (asset.renderMode === "crop") {
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const a = d[(y * w + x) * 4 + 3];
        if (a > 10) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX >= minX && maxY >= minY) {
      asset.crop = {
        sx: minX,
        sy: minY,
        sw: maxX - minX + 1,
        sh: maxY - minY + 1
      };
    }
  }
}

function drawDestinationAsset(asset, dx, dy, dw, dh) {
  if (!asset) {
    return false;
  }
  const source = asset.preparedCanvas || asset.image;
  if (!source || !asset.loaded || asset.errored) {
    return false;
  }
  if (asset.crop) {
    ctx.drawImage(source, asset.crop.sx, asset.crop.sy, asset.crop.sw, asset.crop.sh, dx, dy, dw, dh);
    return true;
  }
  ctx.drawImage(source, dx, dy, dw, dh);
  return true;
}

function loadPimpleSceneAssets() {
  for (const asset of Object.values(pimpleSceneAssets)) {
    asset.image = new Image();
    asset.loaded = false;
    asset.errored = false;
    asset.image.onload = () => {
      asset.loaded = true;
    };
    asset.image.onerror = () => {
      asset.errored = true;
      asset.loaded = false;
    };
    asset.image.src = asset.src;
  }
}

function setPlayerFacingFromDirection(dx, dy) {
  if (dy > 0) {
    charlyAnim.facingRow = 0; // down
    return;
  }
  if (dx < 0) {
    charlyAnim.facingRow = 1; // left
    return;
  }
  if (dx > 0) {
    charlyAnim.facingRow = 2; // right
    return;
  }
  if (dy < 0) {
    charlyAnim.facingRow = 3; // up
  }
}

function markPlayerMoved() {
  // Keep a short moving window so tile-step movement can still show walk frames.
  charlyAnim.movingMs = 120;
}

function setCompanionFacingFromDirection(dx, dy) {
  if (dy > 0) {
    joeAnim.facingRow = 0; // down
    return;
  }
  if (dx < 0) {
    joeAnim.facingRow = 1; // left
    return;
  }
  if (dx > 0) {
    joeAnim.facingRow = 2; // right
    return;
  }
  if (dy < 0) {
    joeAnim.facingRow = 3; // up
  }
}

function markCompanionMoved() {
  // Keep a short moving window so tile-step movement can still show walk frames.
  joeAnim.movingMs = 120;
}

function ensurePetAnimState(pet) {
  if (!petAnimStates.has(pet.id)) {
    petAnimStates.set(pet.id, {
      frame: 0,
      elapsedMs: 0,
      movingMs: 0
    });
  }
  return petAnimStates.get(pet.id);
}

function markPetMoved(pet) {
  const anim = ensurePetAnimState(pet);
  anim.movingMs = PET_WALK_WINDOW_MS;
}

function todayLondonDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function persistFlowers() {
  localStorage.setItem(TOTAL_FLOWERS_KEY, String(state.flowers));
}

function persistUnlockedLetters() {
  saveJsonArray(UNLOCKED_LETTERS_KEY, state.unlockedLetters);
}

function getLetterById(letterId) {
  return LOVE_LETTERS.find((letter) => letter.id === letterId) ?? null;
}

function syncLetterMilestones(showCelebration = true) {
  const unlockedSet = new Set(state.unlockedLetters);
  let changed = false;
  for (let i = 0; i < LETTER_MILESTONES.length; i += 1) {
    const milestone = LETTER_MILESTONES[i];
    const letter = LOVE_LETTERS[i];
    if (!letter) {
      continue;
    }
    if (state.flowers >= milestone && !unlockedSet.has(letter.id)) {
      unlockedSet.add(letter.id);
      state.unlockedLetters.push(letter.id);
      changed = true;
      if (showCelebration) {
        state.letterUnlockQueue.push(letter.id);
      }
    }
  }
  if (changed) {
    persistUnlockedLetters();
  }
}

function getNextLetterTarget() {
  for (let i = 0; i < LOVE_LETTERS.length; i += 1) {
    const letterId = LOVE_LETTERS[i].id;
    if (!state.unlockedLetters.includes(letterId)) {
      return LETTER_MILESTONES[i];
    }
  }
  return null;
}

function openLetterBook(initialLetterId = null) {
  if (state.isModalOpen) {
    return;
  }

  state.isModalOpen = true;
  uiEl.innerHTML = "";

  const overlay = document.createElement("div");
  overlay.className = "ui-overlay";
  const modal = document.createElement("section");
  modal.className = "ui-modal";
  const title = document.createElement("h2");
  title.className = "ui-modal-title";
  title.textContent = "📖 Letter Book";
  const content = document.createElement("div");
  const actions = document.createElement("div");
  actions.className = "ui-modal-actions";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "ui-button";
  closeBtn.textContent = "Close";

  actions.appendChild(closeBtn);
  modal.append(title, content, actions);
  overlay.appendChild(modal);
  uiEl.appendChild(overlay);

  const close = () => {
    document.removeEventListener("keydown", onEsc);
    if (overlay.parentNode === uiEl) {
      uiEl.removeChild(overlay);
    }
    state.isModalOpen = false;
    state.closeOverlay = null;
  };

  const onEsc = (event) => {
    if (event.key === "Escape") {
      close();
    }
  };

  function renderList() {
    content.innerHTML = "";
    const list = document.createElement("div");
    list.className = "movie-controls";
    LOVE_LETTERS.forEach((letter, index) => {
      const milestone = LETTER_MILESTONES[index];
      const unlocked = state.unlockedLetters.includes(letter.id);
      const row = document.createElement("div");
      row.className = "movie-remote-row";
      if (unlocked) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ui-button";
        btn.textContent = `💌 ${letter.title}`;
        btn.addEventListener("click", () => renderReader(letter));
        row.appendChild(btn);
      } else {
        const locked = document.createElement("div");
        locked.className = "scene-subtext";
        locked.textContent = `🔒 Locked (${milestone} 🌹)`;
        row.appendChild(locked);
      }
      list.appendChild(row);
    });
    content.appendChild(list);
  }

  function renderReader(letter) {
    content.innerHTML = "";
    const letterTitle = document.createElement("h3");
    letterTitle.className = "ui-modal-title";
    letterTitle.style.fontSize = "18px";
    letterTitle.style.marginBottom = "8px";
    letterTitle.textContent = letter.title;
    const body = document.createElement("p");
    body.className = "ui-modal-body";
    body.style.whiteSpace = "pre-wrap";
    body.style.lineHeight = "1.65";
    body.textContent = letter.body;
    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "ui-button";
    backBtn.textContent = "Close";
    backBtn.addEventListener("click", renderList);
    content.append(letterTitle, body, backBtn);
  }

  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", onEsc);
  state.closeOverlay = close;

  if (initialLetterId) {
    const letter = getLetterById(initialLetterId);
    if (letter && state.unlockedLetters.includes(initialLetterId)) {
      renderReader(letter);
      return;
    }
  }
  renderList();
}

function openLetterUnlockOverlay(letterId) {
  const letter = getLetterById(letterId);
  if (!letter || state.isModalOpen) {
    return;
  }

  state.isModalOpen = true;
  uiEl.innerHTML = "";

  const overlay = document.createElement("div");
  overlay.className = "ui-overlay";
  const modal = document.createElement("section");
  modal.className = "ui-modal";
  const title = document.createElement("h2");
  title.className = "ui-modal-title";
  title.textContent = "💌 A New Letter";
  const subtitle = document.createElement("p");
  subtitle.className = "scene-subtext";
  subtitle.textContent = letter.title;
  const actions = document.createElement("div");
  actions.className = "ui-modal-actions";
  const laterBtn = document.createElement("button");
  laterBtn.type = "button";
  laterBtn.className = "ui-button";
  laterBtn.textContent = "Later";
  const readBtn = document.createElement("button");
  readBtn.type = "button";
  readBtn.className = "ui-button primary-button";
  readBtn.textContent = "Read now";
  actions.append(laterBtn, readBtn);
  modal.append(title, subtitle, actions);
  overlay.appendChild(modal);
  uiEl.appendChild(overlay);

  const close = () => {
    document.removeEventListener("keydown", onEsc);
    if (overlay.parentNode === uiEl) {
      uiEl.removeChild(overlay);
    }
    state.isModalOpen = false;
    state.closeOverlay = null;
  };
  const onEsc = (event) => {
    if (event.key === "Escape") {
      close();
    }
  };

  laterBtn.addEventListener("click", close);
  readBtn.addEventListener("click", () => {
    close();
    openLetterBook(letterId);
  });
  document.addEventListener("keydown", onEsc);
  state.closeOverlay = close;
}

function addFloater(text, tileX, tileY) {
  const size = state.tileSize;
  const startXPx = tileX * size + size / 2;
  const startYPx = tileY * size + size / 2 - 8;
  state.floaters.push({
    text,
    xPx: startXPx,
    yPx: startYPx,
    startXPx,
    startYPx,
    life: 900,
    age: 0
  });
}

function loadPersistentState() {
  const total = Number.parseInt(localStorage.getItem(TOTAL_FLOWERS_KEY) ?? "0", 10);
  state.flowers = Number.isFinite(total) ? total : 0;

  state.collectedFlowerIds = loadJsonArray(COLLECTED_FLOWER_IDS_KEY);
  state.pettedPetIds = loadJsonArray(PETTED_PET_IDS_KEY);
  state.unlockedLetters = loadJsonArray(UNLOCKED_LETTERS_KEY);
  const collectedSet = new Set(state.collectedFlowerIds);

  for (const layout of Object.values(worldLayouts)) {
    layout.flowerPickups = layout.flowerPickups.filter((flower) => !collectedSet.has(flower.id));
  }
  syncLetterMilestones(false);
}

function worldToScreen(px, py) {
  return { x: px - state.camera.x, y: py - state.camera.y };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function clampTile(pos, layout = state.activeWorldLayout) {
  return {
    x: clamp(pos.x, 0, layout.width - 1),
    y: clamp(pos.y, 0, layout.height - 1)
  };
}

function isWallTile(x, y, layout = state.activeWorldLayout) {
  return layout.walls.some((wall) => wall.x === x && wall.y === y);
}

function isInteractableTile(x, y, layout = state.activeWorldLayout) {
  return layout.interactables.some((rect) => isPointInRect(x, y, rect));
}

function isBlockedTile(x, y, layout = state.activeWorldLayout) {
  if (layout?.name === "home" && layout.zones) {
    const { bedroomRegion, outsideRegion, drivewayRegion, poolRegion } = layout.zones;
    const inRect = (rect) =>
      rect &&
      x >= rect.x &&
      x < rect.x + rect.w &&
      y >= rect.y &&
      y < rect.y + rect.h;
    const inPlayableZone =
      inRect(bedroomRegion) || inRect(outsideRegion) || inRect(drivewayRegion) || inRect(poolRegion);
    if (!inPlayableZone) {
      return true;
    }
  }
  return isWallTile(x, y, layout) || isInteractableTile(x, y, layout);
}

function isTileVisible(tileX, tileY, padTiles = 0) {
  const size = state.tileSize;
  const px = tileX * size;
  const py = tileY * size;
  const pad = padTiles * size;
  return !(
    px + size < state.camera.x - pad ||
    py + size < state.camera.y - pad ||
    px > state.camera.x + state.viewport.w + pad ||
    py > state.camera.y + state.viewport.h + pad
  );
}

function stepToward(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx !== 0) {
    return { x: from.x + Math.sign(dx), y: from.y };
  }
  if (dy !== 0) {
    return { x: from.x, y: from.y + Math.sign(dy) };
  }
  return { x: from.x, y: from.y };
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isCompanionOffscreen() {
  const size = state.tileSize;
  const px = state.companion.x * size;
  const py = state.companion.y * size;
  return (
    px + size < state.camera.x ||
    py + size < state.camera.y ||
    px > state.camera.x + state.viewport.w ||
    py > state.camera.y + state.viewport.h
  );
}

function placeCompanionNearPlayer() {
  const offsets = [
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: -1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: 1, y: 1 },
    { x: -2, y: 0 },
    { x: 2, y: 0 },
    { x: 0, y: -2 },
    { x: 0, y: 2 }
  ];

  for (const offset of offsets) {
    const next = { x: state.player.x + offset.x, y: state.player.y + offset.y };
    if (
      next.x >= 0 &&
      next.y >= 0 &&
      next.x < state.activeWorldLayout.width &&
      next.y < state.activeWorldLayout.height &&
      !isBlockedTile(next.x, next.y)
    ) {
      state.companion = next;
      return;
    }
  }
}

function setWorld(worldName, spawnKey = "default") {
  const layout = getWorldLayout(worldName);
  if (!layout) {
    return;
  }

  state.currentWorld = worldName;
  state.activeWorldLayout = layout;

  const spawn = layout.spawnPoints?.[spawnKey] ?? layout.spawnPoints?.default ?? { x: 1, y: 1 };
  const clampedSpawn = clampTile(spawn, layout);

  if (isBlockedTile(clampedSpawn.x, clampedSpawn.y, layout)) {
    for (let y = 1; y < layout.height - 1; y += 1) {
      let found = false;
      for (let x = 1; x < layout.width - 1; x += 1) {
        if (!isBlockedTile(x, y, layout)) {
          state.player = { x, y };
          found = true;
          break;
        }
      }
      if (found) {
        break;
      }
    }
  } else {
    state.player = clampedSpawn;
  }

  placeCompanionNearPlayer();

  if (worldName === "home") {
    initPets();
  } else {
    state.pets = [];
  }

  const worldPixelW = layout.width * state.tileSize;
  const worldPixelH = layout.height * state.tileSize;
  state.camera.x = clamp(
    state.player.x * state.tileSize + state.tileSize / 2 - state.viewport.w / 2,
    0,
    Math.max(0, worldPixelW - state.viewport.w)
  );
  state.camera.y = clamp(
    state.player.y * state.tileSize + state.tileSize / 2 - state.viewport.h / 2,
    0,
    Math.max(0, worldPixelH - state.viewport.h)
  );
}

function updateCamera() {
  const layout = state.activeWorldLayout;
  const size = state.tileSize;
  const worldPixelW = layout.width * size;
  const worldPixelH = layout.height * size;
  const maxX = Math.max(0, worldPixelW - state.viewport.w);
  const maxY = Math.max(0, worldPixelH - state.viewport.h);

  const playerCenterX = state.player.x * size + size / 2;
  const playerCenterY = state.player.y * size + size / 2;
  const cameraCenterX = state.camera.x + state.viewport.w / 2;
  const cameraCenterY = state.camera.y + state.viewport.h / 2;

  let targetCenterX = cameraCenterX;
  let targetCenterY = cameraCenterY;
  const dx = playerCenterX - cameraCenterX;
  const dy = playerCenterY - cameraCenterY;
  if (Math.abs(dx) > CAMERA_DEADZONE_X_PX) {
    targetCenterX = playerCenterX - Math.sign(dx) * CAMERA_DEADZONE_X_PX;
  }
  if (Math.abs(dy) > CAMERA_DEADZONE_Y_PX) {
    targetCenterY = playerCenterY - Math.sign(dy) * CAMERA_DEADZONE_Y_PX;
  }

  let targetX = targetCenterX - state.viewport.w / 2;
  let targetY = targetCenterY - state.viewport.h / 2;

  targetX = clamp(targetX, 0, maxX);
  targetY = clamp(targetY, 0, maxY);

  state.camera.x += (targetX - state.camera.x) * CAMERA_LERP;
  state.camera.y += (targetY - state.camera.y) * CAMERA_LERP;
  state.camera.x = clamp(state.camera.x, 0, maxX);
  state.camera.y = clamp(state.camera.y, 0, maxY);

  // Hard safety: Charly must remain on-screen even if smoothing lags.
  const playerScreenX = playerCenterX - state.camera.x;
  const playerScreenY = playerCenterY - state.camera.y;
  const padX = Math.min(80, state.viewport.w * 0.22);
  const padY = Math.min(72, state.viewport.h * 0.22);
  if (playerScreenX < padX) {
    state.camera.x = clamp(playerCenterX - padX, 0, maxX);
  } else if (playerScreenX > state.viewport.w - padX) {
    state.camera.x = clamp(playerCenterX - (state.viewport.w - padX), 0, maxX);
  }
  if (playerScreenY < padY) {
    state.camera.y = clamp(playerCenterY - padY, 0, maxY);
  } else if (playerScreenY > state.viewport.h - padY) {
    state.camera.y = clamp(playerCenterY - (state.viewport.h - padY), 0, maxY);
  }
}

function findRandomValidOutsideTile(occupied = new Set()) {
  const region = worldLayouts.home.outsideRegion;
  if (!region) {
    return null;
  }

  for (let i = 0; i < 500; i += 1) {
    const x = region.x + Math.floor(Math.random() * region.w);
    const y = region.y + Math.floor(Math.random() * region.h);
    const key = `${x},${y}`;
    if (occupied.has(key)) {
      continue;
    }
    if (isBlockedTile(x, y, worldLayouts.home)) {
      continue;
    }
    return { x, y };
  }
  return null;
}

function initPets() {
  const occupied = new Set([`${state.player.x},${state.player.y}`, `${state.companion.x},${state.companion.y}`]);
  state.pets = characters.pets.map((pet) => {
    const tile = findRandomValidOutsideTile(occupied) ?? { x: state.player.x + 1, y: state.player.y + 1 };
    occupied.add(`${tile.x},${tile.y}`);
    const nextPet = { ...pet, x: tile.x, y: tile.y };
    ensurePetAnimState(nextPet);
    return nextPet;
  });
}

function updateCompanion(deltaTime) {
  state.followTimerMs += deltaTime;

  if (isCompanionOffscreen()) {
    state.companionOffscreenMs += deltaTime;
  } else {
    state.companionOffscreenMs = 0;
  }

  const distance = manhattan(state.player, state.companion);
  if (state.followTimerMs < 70) {
    return;
  }
  state.followTimerMs = 0;

  const steps = distance >= 6 ? 3 : distance >= 2 ? 2 : 1;
  for (let i = 0; i < steps; i += 1) {
    const from = state.companion;
    const next = stepToward(state.companion, state.player);
    if (
      (next.x !== state.player.x || next.y !== state.player.y) &&
      !isBlockedTile(next.x, next.y)
    ) {
      state.companion = next;
      setCompanionFacingFromDirection(next.x - from.x, next.y - from.y);
      markCompanionMoved();
    } else {
      break;
    }
  }
}

function updatePets(deltaTime) {
  if (state.currentWorld !== "home") {
    return;
  }

  const region = worldLayouts.home.outsideRegion;
  state.petWanderTimerMs += deltaTime;
  if (state.petWanderTimerMs < 650) {
    return;
  }
  state.petWanderTimerMs = 0;

  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ];

  for (const pet of state.pets) {
    if (
      pet.x < region.x ||
      pet.x >= region.x + region.w ||
      pet.y < region.y ||
      pet.y >= region.y + region.h
    ) {
      const tile = findRandomValidOutsideTile(new Set([`${state.player.x},${state.player.y}`, `${state.companion.x},${state.companion.y}`]));
      if (tile) {
        pet.x = tile.x;
        pet.y = tile.y;
        markPetMoved(pet);
      }
      continue;
    }

    if (Math.random() > 0.45) {
      continue;
    }

    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    const nx = clamp(pet.x + dir.x, region.x, region.x + region.w - 1);
    const ny = clamp(pet.y + dir.y, region.y, region.y + region.h - 1);

    if (isBlockedTile(nx, ny, worldLayouts.home)) {
      continue;
    }
    if (nx === state.player.x && ny === state.player.y) {
      continue;
    }
    if (nx === state.companion.x && ny === state.companion.y) {
      continue;
    }
    const occupiedByOtherPet = state.pets.some((otherPet) => otherPet !== pet && otherPet.x === nx && otherPet.y === ny);
    if (occupiedByOtherPet) {
      continue;
    }

    pet.x = nx;
    pet.y = ny;
    markPetMoved(pet);
  }
}

function update(deltaTime) {
  for (const floater of state.floaters) {
    floater.age += deltaTime;
  }
  state.floaters = state.floaters.filter((floater) => floater.age < floater.life);

  syncLetterMilestones(true);
  if (!state.isModalOpen && state.letterUnlockQueue.length > 0) {
    const nextLetterId = state.letterUnlockQueue.shift();
    openLetterUnlockOverlay(nextLetterId);
  }

  if (!state.isModalOpen && state.currentWorld !== "drive") {
    updateCompanion(deltaTime);
    updatePets(deltaTime);
  }

  if (charlyAnim.movingMs > 0) {
    charlyAnim.movingMs = Math.max(0, charlyAnim.movingMs - deltaTime);
    charlyAnim.elapsedMs += deltaTime;
    const frameDurationMs = 1000 / CHARLY_ANIM_FPS;
    while (charlyAnim.elapsedMs >= frameDurationMs) {
      charlyAnim.elapsedMs -= frameDurationMs;
      // Skip frame 0 during movement so idle pose remains frame 0.
      charlyAnim.frame = ((charlyAnim.frame + 1) % (CHARLY_SHEET_COLS - 1)) + 1;
    }
  } else {
    charlyAnim.elapsedMs = 0;
    charlyAnim.frame = 0;
  }

  if (joeAnim.movingMs > 0) {
    joeAnim.movingMs = Math.max(0, joeAnim.movingMs - deltaTime);
    joeAnim.elapsedMs += deltaTime;
    const frameDurationMs = 1000 / JOE_ANIM_FPS;
    while (joeAnim.elapsedMs >= frameDurationMs) {
      joeAnim.elapsedMs -= frameDurationMs;
      // Skip frame 0 during movement so idle pose remains frame 0.
      joeAnim.frame = ((joeAnim.frame + 1) % (JOE_SHEET_COLS - 1)) + 1;
    }
  } else {
    joeAnim.elapsedMs = 0;
    joeAnim.frame = 0;
  }

  for (const pet of state.pets) {
    const anim = ensurePetAnimState(pet);
    if (anim.movingMs > 0) {
      anim.movingMs = Math.max(0, anim.movingMs - deltaTime);
      anim.elapsedMs += deltaTime;
      const frameDurationMs = 1000 / PET_WALK_FPS;
      while (anim.elapsedMs >= frameDurationMs) {
        anim.elapsedMs -= frameDurationMs;
        anim.frame = (anim.frame + 1) % PET_SHEET_COLS;
      }
    } else {
      anim.elapsedMs += deltaTime;
      const frameDurationMs = 1000 / PET_IDLE_FPS;
      while (anim.elapsedMs >= frameDurationMs) {
        anim.elapsedMs -= frameDurationMs;
        anim.frame = (anim.frame + 1) % PET_SHEET_COLS;
      }
    }
  }

  updateCamera();
}

function openReturnHomeConfirm() {
  if (state.isModalOpen) {
    return;
  }

  state.isModalOpen = true;
  uiEl.innerHTML = "";

  const overlay = document.createElement("div");
  overlay.className = "ui-overlay";
  const modal = document.createElement("section");
  modal.className = "ui-modal";

  const title = document.createElement("h2");
  title.className = "ui-modal-title";
  title.textContent = "Go back home?";

  const body = document.createElement("p");
  body.className = "ui-modal-body";
  body.textContent = "You can stay here or return to the driveway near the car.";

  const actions = document.createElement("div");
  actions.className = "ui-modal-actions";

  const noBtn = document.createElement("button");
  noBtn.type = "button";
  noBtn.className = "ui-button secondary-button";
  noBtn.textContent = "No";

  const yesBtn = document.createElement("button");
  yesBtn.type = "button";
  yesBtn.className = "ui-button primary-button";
  yesBtn.textContent = "Yes";

  actions.append(noBtn, yesBtn);
  modal.append(title, body, actions);
  overlay.appendChild(modal);
  uiEl.appendChild(overlay);

  const cleanup = () => {
    document.removeEventListener("keydown", onEsc);
    if (overlay.parentNode === uiEl) {
      uiEl.removeChild(overlay);
    }
    state.isModalOpen = false;
    state.closeOverlay = null;
  };

  const onEsc = (event) => {
    if (event.key === "Escape") {
      cleanup();
    }
  };

  yesBtn.addEventListener("click", () => {
    cleanup();
    setWorld("home", "driveway");
  });
  noBtn.addEventListener("click", cleanup);

  document.addEventListener("keydown", onEsc);
  state.closeOverlay = cleanup;
}

function stopAllDriveTracks() {
  const tracks = [
    document.getElementById("driveTrack1"),
    document.getElementById("driveTrack2"),
    document.getElementById("driveTrack3")
  ].filter(Boolean);

  for (const track of tracks) {
    track.pause();
    track.currentTime = 0;
    track.loop = true;
  }
}

function playDriveTrack(index) {
  stopAllDriveTracks();
  if (!state.drive.soundOn) {
    return;
  }
  const track = document.getElementById(`driveTrack${index + 1}`);
  if (!track) {
    return;
  }
  track.loop = true;
  const playPromise = track.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {});
  }
}

function openDriveScene() {
  if (state.isModalOpen) {
    return;
  }

  state.currentWorld = "drive";
  state.activeWorldLayout = getWorldLayout("drive");
  state.drive = {
    destination: "ski",
    remainingMs: 15000,
    selectedTrack: 0,
    soundOn: state.soundOn
  };

  state.isModalOpen = true;
  uiEl.innerHTML = "";

  const overlay = document.createElement("div");
  overlay.className = "ui-overlay";

  const modal = document.createElement("section");
  modal.className = "ui-modal";

  const title = document.createElement("h2");
  title.className = "ui-modal-title";
  title.textContent = "Car Ride";

  const status = document.createElement("div");
  status.className = "drive-status";

  const destinationRow = document.createElement("div");
  destinationRow.className = "destination-buttons";

  const skiBtn = document.createElement("button");
  skiBtn.type = "button";
  skiBtn.className = "ui-button";
  skiBtn.textContent = "Ski";

  const airportBtn = document.createElement("button");
  airportBtn.type = "button";
  airportBtn.className = "ui-button";
  airportBtn.textContent = "Airport";

  const restBtn = document.createElement("button");
  restBtn.type = "button";
  restBtn.className = "ui-button";
  restBtn.textContent = "Restaurant";

  destinationRow.append(skiBtn, airportBtn, restBtn);

  const musicRow = document.createElement("div");
  musicRow.className = "music-picker";

  const trackButtons = [1, 2, 3].map((n, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ui-button";
    btn.textContent = `Track ${n}`;
    btn.addEventListener("click", () => {
      state.drive.selectedTrack = idx;
      updateButtons();
      playDriveTrack(idx);
    });
    musicRow.appendChild(btn);
    return btn;
  });

  const soundBtn = document.createElement("button");
  soundBtn.type = "button";
  soundBtn.className = "ui-button";

  const canvasScene = document.createElement("canvas");
  canvasScene.width = 520;
  canvasScene.height = 220;
  canvasScene.className = "scene-canvas drive-canvas";
  const sceneCtx = canvasScene.getContext("2d");
  sceneCtx.imageSmoothingEnabled = false;

  const actions = document.createElement("div");
  actions.className = "ui-modal-actions";

  const skipBtn = document.createElement("button");
  skipBtn.type = "button";
  skipBtn.className = "ui-button primary-button";
  skipBtn.textContent = "Skip";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "ui-button secondary-button";
  closeBtn.textContent = "Cancel";

  actions.append(soundBtn, closeBtn, skipBtn);

  modal.append(title, status, destinationRow, musicRow, canvasScene, actions);
  overlay.appendChild(modal);
  uiEl.appendChild(overlay);

  function updateButtons() {
    const choices = ["ski", "airport", "restaurant"];
    const destButtons = [skiBtn, airportBtn, restBtn];
    destButtons.forEach((btn, i) => {
      btn.classList.toggle("chip-selected", choices[i] === state.drive.destination);
    });
    trackButtons.forEach((btn, i) => {
      btn.classList.toggle("chip-selected", i === state.drive.selectedTrack);
    });
    soundBtn.textContent = state.drive.soundOn ? "🔈 Sound on" : "🔇 Sound off";
    status.textContent = `Destination: ${state.drive.destination.toUpperCase()} • ${Math.ceil(state.drive.remainingMs / 1000)}s`;
  }

  skiBtn.addEventListener("click", () => {
    state.drive.destination = "ski";
    updateButtons();
  });
  airportBtn.addEventListener("click", () => {
    state.drive.destination = "airport";
    updateButtons();
  });
  restBtn.addEventListener("click", () => {
    state.drive.destination = "restaurant";
    updateButtons();
  });

  soundBtn.addEventListener("click", () => {
    state.drive.soundOn = !state.drive.soundOn;
    state.soundOn = state.drive.soundOn;
    if (state.drive.soundOn) {
      playDriveTrack(state.drive.selectedTrack);
    } else {
      stopAllDriveTracks();
    }
    updateButtons();
  });

  let roadOffset = 0;
  let rafId = 0;
  let last = performance.now();
  let closed = false;
  const CAR_SCALE = 1.0;
  const HEAD_OFFSET_X = -10;
  const HEAD_OFFSET_Y = -8;

  function roundedRectPath(drawCtx, x, y, w, h, r) {
    const rr = Math.min(r, w * 0.5, h * 0.5);
    drawCtx.beginPath();
    drawCtx.moveTo(x + rr, y);
    drawCtx.lineTo(x + w - rr, y);
    drawCtx.arcTo(x + w, y, x + w, y + rr, rr);
    drawCtx.lineTo(x + w, y + h - rr);
    drawCtx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    drawCtx.lineTo(x + rr, y + h);
    drawCtx.arcTo(x, y + h, x, y + h - rr, rr);
    drawCtx.lineTo(x, y + rr);
    drawCtx.arcTo(x, y, x + rr, y, rr);
    drawCtx.closePath();
  }

  function drawCarRideScene(drawCtx, t, destinationName) {
    const viewW = canvasScene.width;
    const viewH = canvasScene.height;
    const cockpitBob = Math.sin(t * 3) | 0;
    const steerSway = Math.sin(t * 2) * 2;
    const centerX = 260;
    const windshield = { x: 34, y: 18, w: 452, h: 132 };
    const roadTopY = 44;
    const roadBottomY = 150;
    const dashY = 146 + cockpitBob;

    function pxRect(x, y, w, h, fill, outline = null) {
      drawCtx.fillStyle = fill;
      drawCtx.fillRect(x | 0, y | 0, w | 0, h | 0);
      if (outline) {
        drawCtx.fillStyle = outline;
        drawCtx.fillRect(x | 0, y | 0, w | 0, 1);
        drawCtx.fillRect(x | 0, (y + h - 1) | 0, w | 0, 1);
        drawCtx.fillRect(x | 0, y | 0, 1, h | 0);
        drawCtx.fillRect((x + w - 1) | 0, y | 0, 1, h | 0);
      }
    }

    function pxPoly(points, fill, outline = null) {
      drawCtx.beginPath();
      drawCtx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i += 1) {
        drawCtx.lineTo(points[i][0], points[i][1]);
      }
      drawCtx.closePath();
      drawCtx.fillStyle = fill;
      drawCtx.fill();
      if (outline) {
        drawCtx.strokeStyle = outline;
        drawCtx.lineWidth = 1;
        drawCtx.stroke();
      }
    }

    function ditherFill(rect, c1, c2, step = 2, density = 0.12) {
      pxRect(rect.x, rect.y, rect.w, rect.h, c1);
      const mod = Math.max(2, Math.floor(1 / density));
      drawCtx.fillStyle = c2;
      for (let y = rect.y; y < rect.y + rect.h; y += step) {
        for (let x = rect.x; x < rect.x + rect.w; x += step) {
          if (((x + y) / step) % mod === 0) {
            drawCtx.fillRect(x, y, 1, 1);
          }
        }
      }
    }

    function drawPixelRing(cx, cy, radius, thickness, fill, outline = null) {
      const r2 = radius * radius;
      const inner = (radius - thickness) * (radius - thickness);
      drawCtx.fillStyle = fill;
      for (let y = -radius; y <= radius; y += 1) {
        for (let x = -radius; x <= radius; x += 1) {
          const d = x * x + y * y;
          if (d <= r2 && d >= inner) {
            drawCtx.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
          }
        }
      }
      if (outline) {
        drawCtx.fillStyle = outline;
        for (let y = -radius; y <= radius; y += 1) {
          for (let x = -radius; x <= radius; x += 1) {
            const d = x * x + y * y;
            if (d <= r2 && d >= r2 - 2 * radius) {
              drawCtx.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
            }
          }
        }
      }
    }

    // Exterior through windshield
    pxRect(0, 0, viewW, viewH, "#ccb89f");
    pxRect(windshield.x, windshield.y, windshield.w, windshield.h, "#93a3b4");
    pxRect(windshield.x, windshield.y, windshield.w, roadTopY - windshield.y, "#9fadb9");

    const roadPoly = [
      [centerX - 48, roadTopY],
      [centerX + 48, roadTopY],
      [centerX + 210, roadBottomY],
      [centerX - 210, roadBottomY]
    ];
    drawCtx.save();
    drawCtx.beginPath();
    drawCtx.moveTo(roadPoly[0][0], roadPoly[0][1]);
    for (let i = 1; i < roadPoly.length; i += 1) {
      drawCtx.lineTo(roadPoly[i][0], roadPoly[i][1]);
    }
    drawCtx.closePath();
    drawCtx.clip();
    ditherFill(
      { x: centerX - 220, y: roadTopY, w: 440, h: roadBottomY - roadTopY },
      "#2f3640",
      "#39424d",
      2,
      0.1
    );
    drawCtx.restore();
    pxPoly(roadPoly, "rgba(0,0,0,0)", "#4a5360");

    const laneStep = 28;
    const laneTravel = roadOffset % laneStep;
    drawCtx.fillStyle = "#e7c95b";
    for (let y = roadTopY + laneTravel; y < roadBottomY + laneStep; y += laneStep) {
      const p = (y - roadTopY) / (roadBottomY - roadTopY);
      const dashW = 2 + p * 4;
      const dashH = 6 + p * 14;
      drawCtx.fillRect((centerX - dashW * 0.5) | 0, y | 0, dashW | 0, dashH | 0);
    }

    // Hood target shape
    pxPoly(
      [
        [150, 150],
        [370, 150],
        [330, 170],
        [190, 170]
      ],
      "#8a929d",
      "#6f7885"
    );
    pxRect(210, 154, 100, 1, "#a2a9b3");

    // Glass sheen + border (no gradients)
    pxRect(windshield.x, windshield.y, windshield.w, windshield.h, "rgba(0,0,0,0)", "#c0ceda");
    pxRect(84, 28, 44, 1, "rgba(190,212,230,0.35)");
    pxRect(96, 35, 36, 1, "rgba(190,212,230,0.28)");
    pxRect(110, 42, 28, 1, "rgba(190,212,230,0.22)");
    pxRect(124, 49, 22, 1, "rgba(190,212,230,0.18)");

    // Interior frame
    pxRect(34, 18, 452, 14, "#4a525e", "#2f363f");
    pxPoly(
      [
        [34, 18],
        [74, 18],
        [106, 150],
        [34, 150]
      ],
      "#4a525e",
      "#2f363f"
    );
    pxPoly(
      [
        [486, 18],
        [446, 18],
        [414, 150],
        [486, 150]
      ],
      "#4a525e",
      "#2f363f"
    );

    // Dashboard + trim + vents
    pxRect(0, dashY, 520, 74, "#2f343c");
    pxRect(0, dashY, 520, 1, "#404852");
    pxRect(40, dashY + 2, 440, 2, "#596372");
    pxRect(78, dashY + 10, 34, 3, "#222831");
    pxRect(126, dashY + 10, 34, 3, "#222831");
    pxRect(360, dashY + 10, 34, 3, "#222831");
    pxRect(408, dashY + 10, 34, 3, "#222831");

    // Radio UI
    pxRect(176, dashY + 8, 168, 52, "#262d36", "#171c22");
    pxRect(206, dashY + 17, 108, 14, "#182129", "#0f1418");
    pxRect(212, dashY + 21, 48, 6, "#70b7c5");
    pxRect(212, dashY + 35, 84, 2, "#3f4854");
    pxRect(212, dashY + 40, 64, 2, "#3f4854");
    pxRect(190, dashY + 38, 6, 6, "#2f3742", "#11161c");
    pxRect(324, dashY + 38, 6, 6, "#2f3742", "#11161c");

    // Pixel-art wheel
    const wheelX = (centerX + steerSway) | 0;
    const wheelY = (208 + cockpitBob) | 0;
    drawPixelRing(wheelX, wheelY, 44, 8, "#13181e", "#0a0f13");
    drawPixelRing(wheelX, wheelY, 16, 6, "#141a20", "#0a0f13");
    pxPoly(
      [
        [wheelX - 2, wheelY - 14],
        [wheelX + 2, wheelY - 14],
        [wheelX + 2, wheelY - 36],
        [wheelX - 2, wheelY - 36]
      ],
      "#12171d"
    );
    pxPoly(
      [
        [wheelX - 2, wheelY - 6],
        [wheelX - 24, wheelY - 20 + (steerSway > 0 ? 1 : 0)],
        [wheelX - 20, wheelY - 24 + (steerSway > 0 ? 1 : 0)],
        [wheelX + 1, wheelY - 10]
      ],
      "#12171d"
    );
    pxPoly(
      [
        [wheelX + 2, wheelY - 6],
        [wheelX + 24, wheelY - 20 - (steerSway > 0 ? 1 : 0)],
        [wheelX + 20, wheelY - 24 - (steerSway > 0 ? 1 : 0)],
        [wheelX - 1, wheelY - 10]
      ],
      "#12171d"
    );
    pxRect(wheelX - 2, wheelY - 2, 4, 4, "#3d4652");

    // Pixel glove silhouettes (no arcs)
    const handShade = "#d4ae90";
    const handMid = "#e8c2a4";
    const handHi = "#f4d2b8";
    pxPoly(
      [
        [wheelX - 43, wheelY - 38],
        [wheelX - 33, wheelY - 38],
        [wheelX - 30, wheelY - 34],
        [wheelX - 30, wheelY - 28],
        [wheelX - 33, wheelY - 25],
        [wheelX - 40, wheelY - 25],
        [wheelX - 44, wheelY - 28]
      ],
      handMid,
      "#6b4f40"
    );
    pxRect(wheelX - 41, wheelY - 37, 6, 1, handHi);
    pxRect(wheelX - 42, wheelY - 27, 8, 1, handShade);

    pxPoly(
      [
        [wheelX + 43, wheelY - 38],
        [wheelX + 33, wheelY - 38],
        [wheelX + 30, wheelY - 34],
        [wheelX + 30, wheelY - 28],
        [wheelX + 33, wheelY - 25],
        [wheelX + 40, wheelY - 25],
        [wheelX + 44, wheelY - 28]
      ],
      handMid,
      "#6b4f40"
    );
    pxRect(wheelX + 35, wheelY - 37, 6, 1, handHi);
    pxRect(wheelX + 34, wheelY - 27, 8, 1, handShade);

    // Sleeves
    pxRect(wheelX - 50, wheelY - 23, 11, 7, "#9a6872", "#5b3d45");
    pxRect(wheelX + 39, wheelY - 23, 11, 7, "#9a6872", "#5b3d45");

    drawCtx.fillStyle = "#f6e4c8";
    drawCtx.font = "16px Georgia";
    drawCtx.fillText("Driving...", 20, 34);
    drawCtx.fillText(`To ${destinationName}`, 20, 58);
  }

  function draw(now) {
    drawCarRideScene(sceneCtx, now / 1000, state.drive.destination);
  }

  function finish(arrive) {
    if (closed) {
      return;
    }
    closed = true;
    cancelAnimationFrame(rafId);
    stopAllDriveTracks();
    document.removeEventListener("keydown", onEsc);
    if (overlay.parentNode === uiEl) {
      uiEl.removeChild(overlay);
    }
    state.isModalOpen = false;
    state.closeOverlay = null;

    if (arrive) {
      setWorld(state.drive.destination, "fromCar");
    } else {
      setWorld("home", "driveway");
    }
  }

  function loop(now) {
    if (closed) {
      return;
    }
    const dt = now - last;
    last = now;
    state.drive.remainingMs -= dt;
    roadOffset += dt * 0.2;
    draw(now);
    updateButtons();

    if (state.drive.remainingMs <= 0) {
      finish(true);
      return;
    }

    rafId = requestAnimationFrame(loop);
  }

  function onEsc(event) {
    if (event.key === "Escape") {
      finish(false);
    }
  }

  skipBtn.addEventListener("click", () => finish(true));
  closeBtn.addEventListener("click", () => finish(false));
  document.addEventListener("keydown", onEsc);

  state.closeOverlay = () => finish(false);
  playDriveTrack(state.drive.selectedTrack);
  updateButtons();
  rafId = requestAnimationFrame(loop);
}

function openMovieScene() {
  if (state.isModalOpen) {
    return;
  }
  state.isModalOpen = true;
  uiEl.innerHTML = "";

  let sceneState = "choose";
  let selectedMovie = MINI_GAMES.movie.chooseOptions[0];
  let tvOn = false;
  let stateTimeMs = 0;
  let rewardResolved = false;
  let wakeNudgeMs = 0;
  let soundOn = true;
  const FIRST_SLEEP_AFTER_PLAY_MS = 3000;

  const overlay = document.createElement("div");
  overlay.className = "ui-overlay";
  const modal = document.createElement("section");
  modal.className = "ui-modal";
  const title = document.createElement("h2");
  title.className = "ui-modal-title";
  title.textContent = "Movie Night";

  const subtitle = document.createElement("p");
  subtitle.className = "scene-subtext";
  subtitle.textContent = "Pick a movie, press play, and see how long Charly stays awake.";

  const canvasScene = document.createElement("canvas");
  canvasScene.className = "scene-canvas";
  canvasScene.width = 520;
  canvasScene.height = 320;
  const sceneCtx = canvasScene.getContext("2d");
  sceneCtx.imageSmoothingEnabled = false;
  sceneCtx.imageSmoothingEnabled = false;

  const controls = document.createElement("div");
  controls.className = "movie-controls";

  const actions = document.createElement("div");
  actions.className = "ui-modal-actions";
  const soundBtn = document.createElement("button");
  soundBtn.type = "button";
  soundBtn.className = "ui-button";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "ui-button";
  closeBtn.textContent = "Close";
  actions.append(soundBtn, closeBtn);

  modal.append(title, subtitle, canvasScene, controls, actions);
  overlay.appendChild(modal);
  uiEl.appendChild(overlay);

  let audioCtx = null;
  let humNodes = null;
  let rafId = 0;
  let last = performance.now();
  let closed = false;
  const movieSceneArt = {
    bed: { src: "assets/props/bed_big_comfy.png", image: null, loaded: false, errored: false },
    tv: { src: "assets/props/tv_stand_glow.png", image: null, loaded: false, errored: false }
  };
  for (const asset of Object.values(movieSceneArt)) {
    asset.image = new Image();
    asset.image.onload = () => {
      asset.loaded = true;
    };
    asset.image.onerror = () => {
      asset.errored = true;
      asset.loaded = false;
    };
    asset.image.src = asset.src;
  }

  function ensureAudioCtx() {
    if (!soundOn) {
      return null;
    }
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        return null;
      }
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") {
      safeAudioPlay(() => {
        audioCtx.resume();
      });
    }
    return audioCtx;
  }

  function playRemoteClick() {
    safeAudioPlay(() => {
      const ctxAudio = ensureAudioCtx();
      if (!ctxAudio) {
        return;
      }
      const osc = ctxAudio.createOscillator();
      const gain = ctxAudio.createGain();
      osc.type = "square";
      osc.frequency.value = 920;
      gain.gain.setValueAtTime(0.0001, ctxAudio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.04, ctxAudio.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctxAudio.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctxAudio.destination);
      osc.start();
      osc.stop(ctxAudio.currentTime + 0.09);
    });
  }

  function startTvHum() {
    safeAudioPlay(() => {
      if (!tvOn) {
        return;
      }
      if (humNodes) {
        return;
      }
      const ctxAudio = ensureAudioCtx();
      if (!ctxAudio) {
        return;
      }
      const master = ctxAudio.createGain();
      master.gain.value = 0.0001;
      master.connect(ctxAudio.destination);

      const osc1 = ctxAudio.createOscillator();
      const osc1Gain = ctxAudio.createGain();
      osc1.type = "sine";
      osc1.frequency.value = 62;
      osc1Gain.gain.value = 0.008;
      osc1.connect(osc1Gain);
      osc1Gain.connect(master);

      const osc2 = ctxAudio.createOscillator();
      const osc2Gain = ctxAudio.createGain();
      osc2.type = "sine";
      osc2.frequency.value = 124;
      osc2.detune.value = 4;
      osc2Gain.gain.value = 0.004;
      osc2.connect(osc2Gain);
      osc2Gain.connect(master);

      const lfo = ctxAudio.createOscillator();
      const lfoGain = ctxAudio.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 0.22;
      lfoGain.gain.value = 0.0012;
      lfo.connect(lfoGain);
      lfoGain.connect(master.gain);

      const noiseBuffer = ctxAudio.createBuffer(1, 4096, ctxAudio.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i += 1) {
        noiseData[i] = (Math.random() * 2 - 1) * 0.12;
      }
      const noise = ctxAudio.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;
      const noiseFilter = ctxAudio.createBiquadFilter();
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.value = 480;
      const noiseGain = ctxAudio.createGain();
      noiseGain.gain.value = 0.0023;
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);

      master.gain.exponentialRampToValueAtTime(0.02, ctxAudio.currentTime + 0.18);

      osc1.start();
      osc2.start();
      lfo.start();
      noise.start();

      humNodes = { master, osc1, osc2, lfo, noise };
    });
  }

  function stopTvHum() {
    if (!humNodes) {
      return;
    }
    safeAudioPlay(() => {
      const now = audioCtx?.currentTime ?? 0;
      humNodes.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      humNodes.osc1.stop(now + 0.2);
      humNodes.osc2.stop(now + 0.2);
      humNodes.lfo.stop(now + 0.2);
      humNodes.noise.stop(now + 0.2);
    });
    humNodes = null;
  }

  function maybeGrantReward() {
    if (rewardResolved) {
      return;
    }
    rewardResolved = true;
    const today = todayLondonDate();
    const already = localStorage.getItem(MINI_GAMES.movie.dailyKey) === today;
    if (!already) {
      state.flowers += MINI_GAMES.movie.rewardFlowers;
      persistFlowers();
      localStorage.setItem(MINI_GAMES.movie.dailyKey, today);
      addFloater(`+🌹${MINI_GAMES.movie.rewardFlowers}`, state.player.x, state.player.y);
    }
  }

  function setState(next) {
    sceneState = next;
    stateTimeMs = 0;
    if (next !== "waking") {
      wakeNudgeMs = 0;
    }
    renderControls();
  }

  function toggleTv() {
    tvOn = !tvOn;
    playRemoteClick();
    if (tvOn) {
      startTvHum();
    } else {
      stopTvHum();
    }
    renderControls();
  }

  function wakeHer() {
    if (sceneState !== "asleep") {
      return;
    }
    playRemoteClick();
    setState("waking");
  }

  function renderControls() {
    controls.innerHTML = "";
    soundBtn.textContent = soundOn ? "🔈 Sound on" : "🔇 Sound off";

    if (sceneState === "choose") {
      const row = document.createElement("div");
      row.className = "movie-choice-row";
      MINI_GAMES.movie.chooseOptions.forEach((choice) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ui-button";
        if (selectedMovie === choice) {
          btn.classList.add("chip-selected");
        }
        btn.textContent = choice;
        btn.addEventListener("click", () => {
          selectedMovie = choice;
          playRemoteClick();
          renderControls();
        });
        row.appendChild(btn);
      });

      const playBtn = document.createElement("button");
      playBtn.type = "button";
      playBtn.className = "ui-button primary-button";
      playBtn.textContent = "Play";
      playBtn.addEventListener("click", () => {
        tvOn = true;
        startTvHum();
        playRemoteClick();
        setState("playing");
      });
      controls.append(row, playBtn);
      return;
    }

    if (["playing", "asleep", "playing2", "asleep2", "waking"].includes(sceneState)) {
      const remote = document.createElement("div");
      remote.className = "movie-remote-row";
      const tvBtn = document.createElement("button");
      tvBtn.type = "button";
      tvBtn.className = "ui-button";
      tvBtn.textContent = tvOn ? "Pause" : "Play";
      tvBtn.addEventListener("click", toggleTv);

      const wakeBtn = document.createElement("button");
      wakeBtn.type = "button";
      wakeBtn.className = "ui-button";
      wakeBtn.textContent = "Wake her";
      wakeBtn.disabled = sceneState !== "asleep";
      wakeBtn.addEventListener("click", wakeHer);
      remote.append(tvBtn, wakeBtn);
      controls.appendChild(remote);
      return;
    }

    if (sceneState === "done") {
      const line = document.createElement("p");
      line.className = "scene-hint";
      line.textContent = "She lasted 12 seconds this time.";
      controls.appendChild(line);
    }
  }

  function drawScene(nowMs) {
    const t = nowMs / 1000;
    sceneCtx.fillStyle = "#2d2830";
    sceneCtx.fillRect(0, 0, 520, 320);
    sceneCtx.fillStyle = "#6a5760";
    sceneCtx.fillRect(24, 20, 472, 286);

    const bedRect = { x: 74, y: 128, w: 372, h: 166 };
    const tvRect = { x: 194, y: 34, w: 132, h: 98 };
    const wakeShake = sceneState === "waking" ? Math.sin(t * 32) * 6 : 0;
    const charlyRect = { x: bedRect.x + 132, y: bedRect.y + 54, w: 72, h: 72 };
    const joeRect = { x: bedRect.x + 226 + wakeShake, y: bedRect.y + 48, w: 78, h: 78 };

    // 1) bed
    if (movieSceneArt.bed.loaded && movieSceneArt.bed.image && !movieSceneArt.bed.errored) {
      sceneCtx.drawImage(movieSceneArt.bed.image, bedRect.x, bedRect.y, bedRect.w, bedRect.h);
    } else {
      sceneCtx.fillStyle = "#8b7265";
      sceneCtx.fillRect(bedRect.x, bedRect.y, bedRect.w, bedRect.h);
    }

    // 2) seated characters on bed
    if (charlySpriteLoaded && charlySpriteSheet && !charlySpriteErrored) {
      sceneCtx.drawImage(
        charlySpriteSheet,
        0,
        3 * CHARLY_FRAME_H,
        CHARLY_FRAME_W,
        CHARLY_FRAME_H,
        charlyRect.x,
        charlyRect.y + Math.sin(t * 2.2) * 1.4,
        charlyRect.w,
        charlyRect.h
      );
    } else {
      sceneCtx.fillStyle = characters.player.color;
      sceneCtx.fillRect(charlyRect.x + 24, charlyRect.y + 22, 24, 30);
    }

    if (joeSpriteLoaded && joeSpriteSheet && !joeSpriteErrored) {
      sceneCtx.drawImage(
        joeSpriteSheet,
        0,
        3 * JOE_FRAME_H,
        JOE_FRAME_W,
        JOE_FRAME_H,
        joeRect.x,
        joeRect.y + Math.sin(t * 1.9 + 0.5) * 1.3,
        joeRect.w,
        joeRect.h
      );
    } else {
      sceneCtx.fillStyle = characters.followNPC.color;
      sceneCtx.fillRect(joeRect.x + 24, joeRect.y + 20, 28, 34);
    }

    // 3) TV and glow
    if (movieSceneArt.tv.loaded && movieSceneArt.tv.image && !movieSceneArt.tv.errored) {
      sceneCtx.drawImage(movieSceneArt.tv.image, tvRect.x, tvRect.y, tvRect.w, tvRect.h);
    } else {
      sceneCtx.fillStyle = "#4f4c58";
      sceneCtx.fillRect(tvRect.x, tvRect.y, tvRect.w, tvRect.h);
    }

    if (tvOn) {
      const glowAlpha = 0.14 + 0.08 * (Math.sin(t * 6) * 0.5 + 0.5);
      sceneCtx.fillStyle = `rgba(172, 204, 236, ${glowAlpha})`;
      sceneCtx.fillRect(tvRect.x + 10, tvRect.y + 10, tvRect.w - 20, tvRect.h - 26);
      sceneCtx.fillStyle = `rgba(201, 225, 245, ${glowAlpha * 0.7})`;
      sceneCtx.fillRect(tvRect.x + 2, tvRect.y + 2, tvRect.w - 4, tvRect.h - 4);
    }

    // 4) Zzz animation when asleep
    if (sceneState === "asleep" || sceneState === "asleep2") {
      const zLift = Math.sin(t * 2.6) * 2;
      const badgeX = charlyRect.x - 4;
      const badgeY = charlyRect.y - 28 + zLift;
      const badgeW = 74;
      const badgeH = 20;
      sceneCtx.fillStyle = "rgba(255, 182, 193, 0.94)";
      sceneCtx.fillRect(badgeX, badgeY, badgeW, badgeH);
      sceneCtx.strokeStyle = "rgba(143, 62, 81, 0.95)";
      sceneCtx.lineWidth = 2;
      sceneCtx.strokeRect(badgeX, badgeY, badgeW, badgeH);
      sceneCtx.fillStyle = "#4b2330";
      sceneCtx.font = '16px "VT323", "Silkscreen", sans-serif';
      sceneCtx.fillText("zzz 😴", badgeX + 8, badgeY + 14);
    }

    if (sceneState === "waking") {
      sceneCtx.fillStyle = "#f5ead8";
      sceneCtx.font = "14px Georgia";
      sceneCtx.fillText("hey 😅", joeRect.x - 8, joeRect.y - 10);
    }

    sceneCtx.fillStyle = "#f5ead8";
    sceneCtx.font = "14px Georgia";
    sceneCtx.fillText(selectedMovie, 14, 24);
    sceneCtx.fillText(`State: ${sceneState}`, 14, 44);
  }

  function close() {
    if (closed) {
      return;
    }
    closed = true;
    cancelAnimationFrame(rafId);
    stopTvHum();
    document.removeEventListener("keydown", onEsc);
    canvasScene.removeEventListener("click", onCanvasClick);
    if (overlay.parentNode === uiEl) {
      uiEl.removeChild(overlay);
    }
    state.isModalOpen = false;
    state.closeOverlay = null;
  }

  function onEsc(event) {
    if (event.key === "Escape") {
      close();
    }
  }

  function onCanvasClick(event) {
    if (sceneState !== "asleep") {
      return;
    }
    const rect = canvasScene.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvasScene.width / rect.width);
    const y = (event.clientY - rect.top) * (canvasScene.height / rect.height);
    if (x >= 286 && x <= 344 && y >= 206 && y <= 252) {
      wakeHer();
    }
  }

  function tick(now) {
    if (closed) {
      return;
    }
    const dt = now - last;
    last = now;
    stateTimeMs += dt;

    if (sceneState === "playing" && stateTimeMs >= FIRST_SLEEP_AFTER_PLAY_MS) {
      setState("asleep");
    } else if (sceneState === "asleep" && stateTimeMs >= MINI_GAMES.movie.durations.wakeWindowMs) {
      setState("waking");
    } else if (sceneState === "waking") {
      wakeNudgeMs += dt;
      if (wakeNudgeMs >= 900) {
        setState("playing2");
      }
    } else if (sceneState === "playing2" && stateTimeMs >= MINI_GAMES.movie.durations.playing2Ms) {
      setState("asleep2");
    } else if (sceneState === "asleep2" && stateTimeMs >= 1700) {
      setState("done");
      maybeGrantReward();
    }

    if (!tvOn || !soundOn) {
      stopTvHum();
    } else if (!humNodes && sceneState !== "choose") {
      startTvHum();
    }

    drawScene(now);
    rafId = requestAnimationFrame(tick);
  }

  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    if (!soundOn) {
      stopTvHum();
    } else if (tvOn) {
      startTvHum();
    }
    renderControls();
  });
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", onEsc);
  canvasScene.addEventListener("click", onCanvasClick);
  state.closeOverlay = close;
  renderControls();
  rafId = requestAnimationFrame(tick);
}

function openVideoEditScene() {
  if (state.isModalOpen) {
    return;
  }
  if (!editVideoUpgradeLogged) {
    console.log("Edit Videos mini-game upgraded: visuals + timeline polish");
    editVideoUpgradeLogged = true;
  }

  state.isModalOpen = true;
  uiEl.innerHTML = "";

  const overlay = document.createElement("div");
  overlay.className = "ui-overlay";

  const modal = document.createElement("section");
  modal.className = "ui-modal";

  const title = document.createElement("h2");
  title.className = "ui-modal-title";
  title.textContent = "Edit Videos";

  const sub = document.createElement("p");
  sub.className = "scene-subtext";
  sub.textContent = "Make the timeline match the target beat pattern.";

  const canvasScene = document.createElement("canvas");
  canvasScene.className = "scene-canvas edit-video-canvas";
  canvasScene.width = 520;
  canvasScene.height = 320;
  const sceneCtx = canvasScene.getContext("2d");
  sceneCtx.imageSmoothingEnabled = false;

  const hint = document.createElement("p");
  hint.className = "scene-hint";
  hint.textContent = "Drag 3 clips horizontally to match the faint target outlines.";

  const actions = document.createElement("div");
  actions.className = "ui-modal-actions";

  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "ui-button";
  playBtn.textContent = "Play";

  const restartBtn = document.createElement("button");
  restartBtn.type = "button";
  restartBtn.className = "ui-button";
  restartBtn.textContent = "Restart";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "ui-button";
  closeBtn.textContent = "Close";

  actions.append(playBtn, restartBtn, closeBtn);
  modal.append(title, sub, canvasScene, hint, actions);
  overlay.appendChild(modal);
  uiEl.appendChild(overlay);

  const BRANDS = ["HoneyCut Studio", "Lime Loop", "Cloudberry Edit", "Velvet Reel"];
  const brandTag = BRANDS[Math.floor(Math.random() * BRANDS.length)];
  const timeline = { x: 24, y: 170, w: 472, h: 124 };
  const laneYs = [timeline.y + 30, timeline.y + 62, timeline.y + 94];
  const clipW = 128;
  const clipH = 24;
  const snapTolerancePx = 6;
  const clipPalette = ["#8bb6d1", "#9bc79c", "#d4aa8d"];
  const clipIcons = ["🎬", "✨", "🔤"];
  const labels = MINI_GAMES.edit.sequence.slice(0, 3);
  let clips = [];
  let dragging = null;
  let solved = false;
  let exportMs = 0;
  let rewarded = false;
  let rewardAlready = false;
  let rewardAmount = MINI_GAMES.edit.rewardFlowers;
  let audioCtx = null;
  let playing = false;
  let playheadX = timeline.x;
  let previewPulse = 0;
  let gameDone = false;

  function ensureAudioCtx() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        return null;
      }
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") {
      safeAudioPlay(() => audioCtx.resume());
    }
    return audioCtx;
  }

  function uiTone(freq, dur = 0.08, gainLevel = 0.03) {
    safeAudioPlay(() => {
      const ctxAudio = ensureAudioCtx();
      if (!ctxAudio) {
        return;
      }
      const osc = ctxAudio.createOscillator();
      const gain = ctxAudio.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctxAudio.currentTime);
      gain.gain.exponentialRampToValueAtTime(gainLevel, ctxAudio.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctxAudio.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctxAudio.destination);
      osc.start();
      osc.stop(ctxAudio.currentTime + dur + 0.02);
    });
  }

  function clipAt(x, y) {
    for (let i = clips.length - 1; i >= 0; i -= 1) {
      const clip = clips[i];
      if (clip.locked) {
        continue;
      }
      if (x >= clip.x && x <= clip.x + clipW && y >= clip.y && y <= clip.y + clipH) {
        return clip;
      }
    }
    return null;
  }

  function checkSolved() {
    return clips.every((clip) => clip.locked);
  }

  function initPuzzle() {
    const ids = [0, 1, 2];
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    const targetXs = [timeline.x + 282, timeline.x + 246, timeline.x + 316];
    const startXs = [timeline.x + 12, timeline.x + 30, timeline.x + 20];
    clips = ids.map((clipId, i) => ({
      id: clipId,
      label: labels[clipId],
      icon: clipIcons[clipId],
      color: clipPalette[clipId],
      x: startXs[i],
      y: laneYs[clipId],
      targetX: targetXs[clipId],
      locked: false
    }));
    dragging = null;
    solved = false;
    exportMs = 0;
    rewarded = false;
    rewardAlready = false;
    rewardAmount = MINI_GAMES.edit.rewardFlowers;
    playing = false;
    playheadX = timeline.x;
    gameDone = false;
  }
  initPuzzle();

  function drawClip(clip, isDragging = false) {
    const x = isDragging ? dragging.x : clip.x;
    const y = clip.y;
    const w = clipW;
    const h = clipH;
    const border = clip.locked
      ? "rgba(125, 176, 106, 0.95)"
      : isDragging
        ? "#f9e7b9"
        : "rgba(37, 31, 28, 0.65)";
    const fill = clip.color;
    const lift = isDragging ? -2 : 0;
    sceneCtx.fillStyle = "rgba(20,16,14,0.22)";
    sceneCtx.fillRect(x + 2, y + 2, w, h);
    sceneCtx.fillStyle = fill;
    sceneCtx.fillRect(x, y + lift, w, h);
    sceneCtx.strokeStyle = border;
    sceneCtx.lineWidth = isDragging ? 2 : 1;
    sceneCtx.strokeRect(x + 0.5, y + lift + 0.5, w - 1, h - 1);
    sceneCtx.clearRect(x, y + lift, 1, 1);
    sceneCtx.clearRect(x + w - 1, y + lift, 1, 1);
    sceneCtx.clearRect(x, y + lift + h - 1, 1, 1);
    sceneCtx.clearRect(x + w - 1, y + lift + h - 1, 1, 1);
    sceneCtx.fillStyle = "rgba(255,255,255,0.2)";
    sceneCtx.fillRect(x + 1, y + lift + 1, w - 2, 4);
    sceneCtx.fillStyle = "#2b2420";
    sceneCtx.font = "12px VT323, Silkscreen, sans-serif";
    sceneCtx.fillText(clip.icon, x + 4, y + lift + 15);
    sceneCtx.font = "10px VT323, Silkscreen, sans-serif";
    sceneCtx.fillText(clip.label, x + 18, y + lift + 15);
  }

  function drawPreview(nowMs) {
    const pv = { x: 16, y: 44, w: 208, h: 118 };
    sceneCtx.fillStyle = "#ecd9bc";
    sceneCtx.fillRect(pv.x, pv.y, pv.w, pv.h);
    sceneCtx.strokeStyle = "#634f43";
    sceneCtx.lineWidth = 2;
    sceneCtx.strokeRect(pv.x + 0.5, pv.y + 0.5, pv.w - 1, pv.h - 1);
    const t = nowMs / 1000;
    const frame = Math.floor((playing ? nowMs : previewPulse * 600) / 260) % 3;
    const bgColors = ["#8fb2bf", "#9abf95", "#bd9b89"];
    sceneCtx.fillStyle = bgColors[frame];
    sceneCtx.fillRect(pv.x + 8, pv.y + 8, pv.w - 16, pv.h - 26);
    sceneCtx.fillStyle = "rgba(255,255,255,0.22)";
    sceneCtx.fillRect(pv.x + 16, pv.y + 16, pv.w - 60, 10);
    sceneCtx.fillStyle = "#f7efdd";
    sceneCtx.font = "10px VT323, Silkscreen, sans-serif";
    sceneCtx.fillText("PREVIEW", pv.x + 10, pv.y + pv.h - 8);

    // Charly from the back, tucked in corner so she doesn't block.
    if (charlySpriteLoaded && charlySpriteSheet && !charlySpriteErrored) {
      sceneCtx.drawImage(
        charlySpriteSheet,
        0,
        3 * CHARLY_FRAME_H,
        CHARLY_FRAME_W,
        CHARLY_FRAME_H,
        pv.x + pv.w - 52,
        pv.y + pv.h - 52 + Math.sin(t * 2.5) * 0.8,
        36,
        36
      );
    } else {
      sceneCtx.fillStyle = "#de8d9a";
      sceneCtx.fillRect(pv.x + pv.w - 46, pv.y + pv.h - 46, 24, 24);
    }
  }

  function draw() {
    sceneCtx.fillStyle = "#1f2028";
    sceneCtx.fillRect(0, 0, 520, 320);

    // Top bar
    sceneCtx.fillStyle = "#ead9bb";
    sceneCtx.fillRect(0, 0, 520, 28);
    sceneCtx.fillStyle = "#352c27";
    sceneCtx.font = "14px VT323, Silkscreen, sans-serif";
    sceneCtx.fillText("EDIT VIDEOS", 12, 18);
    sceneCtx.fillStyle = "#fff2d8";
    sceneCtx.fillRect(354, 6, 154, 16);
    sceneCtx.fillStyle = "#5a4a41";
    sceneCtx.font = "10px VT323, Silkscreen, sans-serif";
    sceneCtx.fillText(brandTag, 360, 17);

    drawPreview(performance.now());

    sceneCtx.fillStyle = "#f2e6d1";
    sceneCtx.font = "11px VT323, Silkscreen, sans-serif";
    sceneCtx.fillText("Goal: Match ghost clips", 236, 56);
    sceneCtx.fillText("Drag horizontally, snap when close", 236, 72);

    // Timeline panel
    sceneCtx.fillStyle = "#efe1c9";
    sceneCtx.fillRect(16, 170, 488, 128);
    sceneCtx.strokeStyle = "#6a5849";
    sceneCtx.strokeRect(16.5, 170.5, 487, 127);

    // Ruler
    sceneCtx.fillStyle = "#d8c4a2";
    sceneCtx.fillRect(timeline.x, timeline.y, timeline.w, 18);
    for (let i = 0; i <= 12; i += 1) {
      const x = timeline.x + i * (timeline.w / 12);
      sceneCtx.strokeStyle = "rgba(70,56,43,0.28)";
      sceneCtx.beginPath();
      sceneCtx.moveTo(x + 0.5, timeline.y);
      sceneCtx.lineTo(x + 0.5, timeline.y + (i % 2 === 0 ? 14 : 9));
      sceneCtx.stroke();
    }

    for (let i = 0; i < laneYs.length; i += 1) {
      const laneY = laneYs[i] - 3;
      sceneCtx.fillStyle = "#f6ecda";
      sceneCtx.fillRect(timeline.x, laneY, timeline.w, clipH + 6);
      sceneCtx.strokeStyle = "rgba(72,58,47,0.22)";
      sceneCtx.strokeRect(timeline.x + 0.5, laneY + 0.5, timeline.w - 1, clipH + 5);
      sceneCtx.fillStyle = "#5a4c41";
      sceneCtx.font = "10px VT323, Silkscreen, sans-serif";
      sceneCtx.fillText(`TRACK ${i + 1}`, 32, laneY + 16);
    }

    // Ghost target clips
    for (const clip of clips) {
      const gx = clip.targetX;
      const gy = clip.y;
      const gw = clipW;
      sceneCtx.fillStyle = "rgba(106, 149, 170, 0.17)";
      sceneCtx.fillRect(gx, gy, gw, clipH);
      sceneCtx.strokeStyle = "rgba(106, 149, 170, 0.45)";
      sceneCtx.strokeRect(gx + 0.5, gy + 0.5, gw - 1, clipH - 1);
    }

    // Playhead
    sceneCtx.strokeStyle = "#c85b7c";
    sceneCtx.lineWidth = 2;
    sceneCtx.beginPath();
    sceneCtx.moveTo(playheadX + 0.5, timeline.y + 1);
    sceneCtx.lineTo(playheadX + 0.5, timeline.y + timeline.h - 2);
    sceneCtx.stroke();

    for (const clip of clips) {
      if (dragging && dragging.id === clip.id) {
        continue;
      }
      drawClip(clip, false);
    }
    if (dragging) {
      drawClip(dragging, true);
    }

    if (solved && exportMs < 2000) {
      sceneCtx.fillStyle = "#f5ead8";
      sceneCtx.font = "14px VT323, Silkscreen, sans-serif";
      sceneCtx.fillText("Exporting...", 22, 156);
      const progress = Math.min(1, exportMs / 2000);
      sceneCtx.fillStyle = "#95c386";
      sceneCtx.fillRect(104, 146, 170 * progress, 10);
      sceneCtx.strokeStyle = "#f5ead8";
      sceneCtx.strokeRect(104, 146, 170, 10);
    } else if (solved) {
      sceneCtx.fillStyle = "#c9f0b3";
      sceneCtx.font = "16px VT323, Silkscreen, sans-serif";
      sceneCtx.fillText("✅ Done", 22, 156);
      sceneCtx.fillStyle = "#f1e7cf";
      sceneCtx.fillRect(290, 134, 190, 46);
      sceneCtx.strokeStyle = "#7d6959";
      sceneCtx.strokeRect(290.5, 134.5, 189, 45);
      sceneCtx.fillStyle = "#3f342d";
      sceneCtx.font = "12px VT323, Silkscreen, sans-serif";
      sceneCtx.fillText("FILE: reel_export.mp4", 300, 153);
      sceneCtx.fillText("Status: Export complete", 300, 168);
      sceneCtx.fillStyle = "#f5ead8";
      sceneCtx.font = "12px VT323, Silkscreen, sans-serif";
      sceneCtx.fillText(`🌹 ${rewardAmount}${rewardAlready ? " (already earned today)" : ""}`, 22, 172);
    }
  }

  let rafId = 0;
  let closed = false;
  function close() {
    if (closed) {
      return;
    }
    closed = true;
    cancelAnimationFrame(rafId);
    canvasScene.removeEventListener("mousedown", onDown);
    canvasScene.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    document.removeEventListener("keydown", onEsc);
    if (overlay.parentNode === uiEl) {
      uiEl.removeChild(overlay);
    }
    state.isModalOpen = false;
    state.closeOverlay = null;
  }

  function onEsc(event) {
    if (event.key === "Escape") {
      close();
    }
  }

  function toLocal(evt) {
    const rect = canvasScene.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) * (canvasScene.width / rect.width),
      y: (evt.clientY - rect.top) * (canvasScene.height / rect.height)
    };
  }

  function onDown(evt) {
    if (solved || gameDone) {
      return;
    }
    const p = toLocal(evt);
    const clip = clipAt(p.x, p.y);
    if (!clip) {
      return;
    }
    dragging = {
      ...clip,
      offsetX: p.x - clip.x,
      x: clip.x
    };
    uiTone(760, 0.04, 0.024);
  }

  function onMove(evt) {
    if (!dragging || solved || gameDone) {
      return;
    }
    const p = toLocal(evt);
    const rawX = p.x - dragging.offsetX;
    const minX = timeline.x;
    const maxX = timeline.x + timeline.w - clipW;
    dragging.x = clamp(rawX, minX, maxX);
    const original = clips.find((c) => c.id === dragging.id);
    if (original && Math.abs(dragging.x - original.targetX) <= snapTolerancePx) {
      original.x = original.targetX;
      original.locked = true;
      dragging = null;
      uiTone(560, 0.08, 0.03);
      if (checkSolved()) {
        solved = true;
        playing = true;
        uiTone(980, 0.1, 0.035);
      }
    }
  }

  function onUp() {
    if (!dragging || solved || gameDone) {
      dragging = null;
      return;
    }
    const original = clips.find((c) => c.id === dragging.id);
    original.x = dragging.x;
    if (Math.abs(original.x - original.targetX) <= snapTolerancePx) {
      original.x = original.targetX;
      original.locked = true;
      uiTone(560, 0.08, 0.03);
    } else {
      uiTone(380, 0.05, 0.02);
    }
    dragging = null;

    if (checkSolved()) {
      solved = true;
      playing = true;
      uiTone(980, 0.1, 0.035);
    }
  }

  function handleReward() {
    if (rewarded) {
      return;
    }
    rewarded = true;
    const today = todayLondonDate();
    const already = localStorage.getItem(MINI_GAMES.edit.dailyKey) === today;
    rewardAlready = already;
    if (!already) {
      state.flowers += MINI_GAMES.edit.rewardFlowers;
      persistFlowers();
      localStorage.setItem(MINI_GAMES.edit.dailyKey, today);
      addFloater(`+🌹${MINI_GAMES.edit.rewardFlowers}`, state.player.x, state.player.y);
      rewardAmount = MINI_GAMES.edit.rewardFlowers;
    } else {
      rewardAmount = 0;
    }
  }

  let last = performance.now();
  function loop(now) {
    if (closed) {
      return;
    }
    const dt = now - last;
    last = now;
    previewPulse += dt / 1000;

    if (playing) {
      playheadX += dt * 0.09;
      if (playheadX > timeline.x + timeline.w) {
        playheadX = timeline.x;
      }
    }

    if (dragging) {
      const match = clips.find((c) => c.id === dragging.id);
      if (match) {
        dragging.color = match.color;
        dragging.icon = match.icon;
        dragging.label = match.label;
      }
    }

    if (solved && exportMs < 2000) {
      exportMs += dt;
      if (exportMs >= 2000) {
        handleReward();
        playing = false;
        gameDone = true;
      }
    }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  playBtn.addEventListener("click", () => {
    playing = !playing;
    playBtn.textContent = playing ? "Pause" : "Play";
    uiTone(playing ? 660 : 420, 0.06, 0.024);
  });
  canvasScene.addEventListener("mousedown", onDown);
  canvasScene.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  document.addEventListener("keydown", onEsc);
  restartBtn.addEventListener("click", initPuzzle);
  closeBtn.addEventListener("click", close);

  state.closeOverlay = close;
  rafId = requestAnimationFrame(loop);
}

function openEditVideoScene() {
  openVideoEditScene();
}

function openPimpleScene() {
  if (state.isModalOpen) {
    return;
  }

  state.isModalOpen = true;
  uiEl.innerHTML = "";

  const HOLD_TO_POP_MS = 1500;

  const overlay = document.createElement("div");
  overlay.className = "ui-overlay";

  const modal = document.createElement("section");
  modal.className = "ui-modal";

  const title = document.createElement("h2");
  title.className = "ui-modal-title";
  title.textContent = "Forehead Pop";

  const sub = document.createElement("p");
  sub.className = "scene-subtext";
  sub.textContent = "Hold on each forehead pimple for 1.5 seconds to pop it.";

  const canvasScene = document.createElement("canvas");
  canvasScene.className = "scene-canvas";
  canvasScene.width = 520;
  canvasScene.height = 320;
  const sceneCtx = canvasScene.getContext("2d");

  const actions = document.createElement("div");
  actions.className = "ui-modal-actions";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "ui-button";
  closeBtn.textContent = "Close";
  actions.appendChild(closeBtn);

  modal.append(title, sub, canvasScene, actions);
  overlay.appendChild(modal);
  uiEl.appendChild(overlay);

  // Tight crop: forehead + eyes only (little hair at top edge).
  const joeFaceRect = { x: 170, y: 44, w: 242, h: 136 };
  // Skin-only forehead zone (below hairline, above brows).
  const FOREHEAD_HITBOX = { x: joeFaceRect.x + 72, y: joeFaceRect.y + 28, w: 98, h: 36 };
  const FOREHEAD_BUBBLE_Y_OFFSET = 18;
  const charlyRect = { x: 58, y: 124, w: 106, h: 132 };
  let pimples = [];
  let popEffects = [];

  let audioCtx = null;
  let soundOn = true;
  let activeId = null;
  let holding = false;
  let pointerInForehead = false;
  let holdMs = 0;
  let lastMouse = null;
  let moodTier = 0;
  let reactionFlashMs = 0;
  let poppedCount = 0;
  let gameDone = false;

  function initPimples() {
    pimples = Array.from({ length: 5 }, (_, i) => ({
      id: `p-${i}`,
      x: FOREHEAD_HITBOX.x + 10 + Math.random() * (FOREHEAD_HITBOX.w - 20),
      y:
        FOREHEAD_HITBOX.y +
        10 +
        FOREHEAD_BUBBLE_Y_OFFSET +
        Math.random() * Math.max(1, FOREHEAD_HITBOX.h - 20 - FOREHEAD_BUBBLE_Y_OFFSET),
      popped: false
    }));
    poppedCount = 0;
    moodTier = 0;
    gameDone = false;
  }
  initPimples();

  function ensureAudioCtx() {
    if (!soundOn) {
      return null;
    }
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        return null;
      }
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") {
      safeAudioPlay(() => audioCtx.resume());
    }
    return audioCtx;
  }

  function popSound() {
    safeAudioPlay(() => {
      const ctxAudio = ensureAudioCtx();
      if (!ctxAudio) {
        return;
      }
      const now = ctxAudio.currentTime;
      const noise = ctxAudio.createBufferSource();
      const buffer = ctxAudio.createBuffer(1, 2048, ctxAudio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * 0.65;
      }
      noise.buffer = buffer;
      const band = ctxAudio.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 500 + Math.random() * 260;
      band.Q.value = 1.2;
      const gain = ctxAudio.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      noise.connect(band);
      band.connect(gain);
      gain.connect(ctxAudio.destination);
      noise.start(now);
      noise.stop(now + 0.12);

      const plop = ctxAudio.createOscillator();
      const plopGain = ctxAudio.createGain();
      plop.type = "sine";
      plop.frequency.setValueAtTime(130 + Math.random() * 25, now);
      plop.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      plopGain.gain.setValueAtTime(0.0001, now);
      plopGain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
      plopGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      plop.connect(plopGain);
      plopGain.connect(ctxAudio.destination);
      plop.start(now);
      plop.stop(now + 0.11);
    });
  }

  function reactionSound(level) {
    safeAudioPlay(() => {
      const ctxAudio = ensureAudioCtx();
      if (!ctxAudio) {
        return;
      }
      const now = ctxAudio.currentTime;
      const osc = ctxAudio.createOscillator();
      const gain = ctxAudio.createGain();
      osc.type = "triangle";
      osc.frequency.value = level === 1 ? 180 : level === 2 ? 150 : 120;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      osc.connect(gain);
      gain.connect(ctxAudio.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    });
  }

  function updateReactionFromProgress() {
    const nextMood = poppedCount <= 1 ? 0 : poppedCount === 2 ? 1 : poppedCount === 3 ? 2 : 3;
    const old = moodTier;
    moodTier = nextMood;
    if (moodTier > old) {
      reactionFlashMs = 280;
      reactionSound(moodTier);
    }
  }

  function rewardedPop() {
    const today = todayLondonDate();
    const claimDate = localStorage.getItem(PIMPLE_CLAIM_DATE_KEY);
    let todayCount = Number.parseInt(localStorage.getItem(PIMPLE_TODAY_COUNT_KEY) ?? "0", 10);
    if (claimDate !== today) {
      todayCount = 0;
      localStorage.setItem(PIMPLE_CLAIM_DATE_KEY, today);
    }

    if (todayCount < 6) {
      todayCount += 1;
      localStorage.setItem(PIMPLE_TODAY_COUNT_KEY, String(todayCount));
      state.flowers += MINI_GAMES.pimple.rewardFlowers;
      persistFlowers();
      addFloater(`+🌹${MINI_GAMES.pimple.rewardFlowers}`, state.player.x, state.player.y);
    }
  }

  function toLocal(evt) {
    const rect = canvasScene.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) * (canvasScene.width / rect.width),
      y: (evt.clientY - rect.top) * (canvasScene.height / rect.height)
    };
  }

  function inForehead(p) {
    return (
      p.x >= FOREHEAD_HITBOX.x &&
      p.x <= FOREHEAD_HITBOX.x + FOREHEAD_HITBOX.w &&
      p.y >= FOREHEAD_HITBOX.y &&
      p.y <= FOREHEAD_HITBOX.y + FOREHEAD_HITBOX.h
    );
  }

  function onDown(evt) {
    if (gameDone) {
      return;
    }
    const p = toLocal(evt);
    if (!inForehead(p)) {
      return;
    }
    for (const pimple of pimples) {
      if (pimple.popped) {
        continue;
      }
      const d = Math.hypot(p.x - pimple.x, p.y - pimple.y);
      if (d <= 14) {
        activeId = pimple.id;
        holding = true;
        pointerInForehead = true;
        holdMs = 0;
        lastMouse = p;
        return;
      }
    }
  }

  function onMove(evt) {
    if (!holding || gameDone) {
      return;
    }
    const p = toLocal(evt);
    if (!inForehead(p)) {
      pointerInForehead = false;
      lastMouse = p;
      return;
    }
    pointerInForehead = true;
    lastMouse = p;
  }

  function onUp() {
    holding = false;
    activeId = null;
    pointerInForehead = false;
    holdMs = 0;
    lastMouse = null;
  }

  function draw(now) {
    const t = now / 1000;
    sceneCtx.fillStyle = "#2a2430";
    sceneCtx.fillRect(0, 0, 520, 320);
    sceneCtx.fillStyle = "#393145";
    sceneCtx.fillRect(24, 26, 472, 268);
    sceneCtx.fillStyle = "rgba(255, 238, 212, 0.08)";
    sceneCtx.fillRect(34, 28, 452, 88);

    const shake = moodTier >= 2 ? (moodTier === 2 ? 2.2 : 4.2) : 0;
    const sx = shake ? Math.sin(t * 30) * shake : 0;
    const headTurn = (moodTier / 3) * 7 + (reactionFlashMs > 0 ? 3 : 0);
    const headAngle = (-headTurn * Math.PI) / 180;

    // Charly beside Joe using world sprite style if available.
    if (charlySpriteLoaded && charlySpriteSheet && !charlySpriteErrored) {
      const charlyFrame = 0;
      const charlyRow = 2;
      sceneCtx.drawImage(
        charlySpriteSheet,
        charlyFrame * CHARLY_FRAME_W,
        charlyRow * CHARLY_FRAME_H,
        CHARLY_FRAME_W,
        CHARLY_FRAME_H,
        charlyRect.x + Math.sin(t * 2.4) * 1.2,
        charlyRect.y + Math.sin(t * 3.2) * 1.6,
        charlyRect.w,
        charlyRect.h
      );
    } else if (pimpleSceneAssets.charly.loaded && pimpleSceneAssets.charly.image && !pimpleSceneAssets.charly.errored) {
      sceneCtx.drawImage(
        pimpleSceneAssets.charly.image,
        charlyRect.x + Math.sin(t * 2.4) * 1.2,
        charlyRect.y + Math.sin(t * 3.2) * 1.6,
        charlyRect.w,
        charlyRect.h
      );
    } else {
      sceneCtx.fillStyle = "#ea8b93";
      sceneCtx.fillRect(charlyRect.x + 24, charlyRect.y + 24, 52, 64);
    }

    // Joe close-up base with head-turn.
    sceneCtx.save();
    const joeCx = joeFaceRect.x + joeFaceRect.w / 2 + sx;
    const joeCy = joeFaceRect.y + joeFaceRect.h / 2;
    sceneCtx.translate(joeCx, joeCy);
    sceneCtx.rotate(headAngle);
    if (pimpleSceneAssets.joeBase.loaded && pimpleSceneAssets.joeBase.image && !pimpleSceneAssets.joeBase.errored) {
      sceneCtx.drawImage(
        pimpleSceneAssets.joeBase.image,
        -joeFaceRect.w / 2,
        -joeFaceRect.h / 2,
        joeFaceRect.w,
        joeFaceRect.h
      );
    } else {
      sceneCtx.fillStyle = "#d9b59b";
      sceneCtx.fillRect(-joeFaceRect.w / 2, -joeFaceRect.h / 2, joeFaceRect.w, joeFaceRect.h);
      sceneCtx.fillStyle = "#3b2f2c";
      sceneCtx.fillRect(-joeFaceRect.w / 2, -joeFaceRect.h / 2, joeFaceRect.w, 16);
      sceneCtx.fillStyle = "#252331";
      sceneCtx.fillRect(-66, -6, 38, 14);
      sceneCtx.fillRect(28, -6, 38, 14);
      sceneCtx.strokeStyle = "#2f2221";
      sceneCtx.lineWidth = 3;
      sceneCtx.beginPath();
      sceneCtx.moveTo(-72, -18);
      sceneCtx.lineTo(-24, -22);
      sceneCtx.moveTo(24, -22);
      sceneCtx.lineTo(72, -18);
      sceneCtx.stroke();
      sceneCtx.fillStyle = "#3a2a27";
      sceneCtx.fillRect(-30, 34, 60, 5);
    }

    sceneCtx.restore();

    // Forehead interaction-zone hint.
    sceneCtx.fillStyle = "rgba(199, 224, 255, 0.1)";
    sceneCtx.fillRect(FOREHEAD_HITBOX.x, FOREHEAD_HITBOX.y, FOREHEAD_HITBOX.w, FOREHEAD_HITBOX.h);
    sceneCtx.strokeStyle = "rgba(210, 231, 255, 0.3)";
    sceneCtx.strokeRect(FOREHEAD_HITBOX.x, FOREHEAD_HITBOX.y, FOREHEAD_HITBOX.w, FOREHEAD_HITBOX.h);

    for (const pimple of pimples) {
      if (pimple.popped) {
        continue;
      }
      const isActive = holding && activeId === pimple.id;
      const pulse = 1 + Math.sin(t * 5 + pimple.id.length) * 0.06;
      const r = (isActive ? 8.2 : 6.4) * pulse;
      const mainColor = isActive ? "#e6a4ac" : "#efb4bc";
      const shadeColor = isActive ? "#cd8f98" : "#df9ca4";
      sceneCtx.fillStyle = shadeColor;
      sceneCtx.beginPath();
      sceneCtx.arc(pimple.x, pimple.y + 1.2, r, 0, Math.PI * 2);
      sceneCtx.fill();
      sceneCtx.fillStyle = mainColor;
      sceneCtx.beginPath();
      sceneCtx.arc(pimple.x, pimple.y, r * 0.9, 0, Math.PI * 2);
      sceneCtx.fill();
      sceneCtx.fillStyle = "rgba(255, 248, 240, 0.9)";
      sceneCtx.beginPath();
      sceneCtx.arc(pimple.x - r * 0.28, pimple.y - r * 0.28, Math.max(1.2, r * 0.22), 0, Math.PI * 2);
      sceneCtx.fill();
    }

    for (const fx of popEffects) {
      const lifeT = clamp(fx.ageMs / fx.lifeMs, 0, 1);
      const alpha = 1 - lifeT;
      sceneCtx.globalAlpha = alpha;
      if (pimpleSceneAssets.popParticles.loaded && pimpleSceneAssets.popParticles.image && !pimpleSceneAssets.popParticles.errored) {
        const s = 18 + lifeT * 24;
        sceneCtx.drawImage(
          pimpleSceneAssets.popParticles.image,
          fx.x - s / 2,
          fx.y - s / 2,
          s,
          s
        );
      } else {
        const s = 6 + lifeT * 10;
        sceneCtx.strokeStyle = "#f6e2b7";
        sceneCtx.lineWidth = 2;
        sceneCtx.beginPath();
        sceneCtx.arc(fx.x, fx.y, s, 0, Math.PI * 2);
        sceneCtx.stroke();
      }
      sceneCtx.globalAlpha = 1;
    }

    const bubble = ["", "...", "easyyy", "okay chill"][moodTier];
    if (bubble) {
      sceneCtx.fillStyle = "#f5ead8";
      sceneCtx.fillRect(352 + sx, 44, 110, 30);
      sceneCtx.fillStyle = "#2b2b2b";
      sceneCtx.font = "16px Georgia";
      sceneCtx.fillText(bubble, 362 + sx, 64);
    }

    if (moodTier >= 1 && reactionFlashMs > 0) {
      sceneCtx.fillStyle = "rgba(255,120,90,0.14)";
      sceneCtx.fillRect(joeFaceRect.x - 8 + sx, joeFaceRect.y - 6, joeFaceRect.w + 16, joeFaceRect.h + 12);
    }

    sceneCtx.fillStyle = "#f5ead8";
    sceneCtx.font = "13px Georgia";
    sceneCtx.fillText("Hold steady on a pimple for 1.5s", 16, 24);
    sceneCtx.fillText(`Mood: ${moodTier}/3`, 16, 44);
    sceneCtx.fillText(`Popped: ${poppedCount}/5`, 16, 64);
    const holdProgress = holding && activeId && pointerInForehead ? clamp(holdMs / HOLD_TO_POP_MS, 0, 1) : 0;
    sceneCtx.fillStyle = "rgba(245, 234, 216, 0.25)";
    sceneCtx.fillRect(16, 74, 180, 12);
    sceneCtx.fillStyle = "#95c386";
    sceneCtx.fillRect(16, 74, 180 * holdProgress, 12);
    sceneCtx.strokeStyle = "#f5ead8";
    sceneCtx.strokeRect(16, 74, 180, 12);
    sceneCtx.fillStyle = "#f5ead8";
    sceneCtx.font = "11px Georgia";
    sceneCtx.fillText("Current hold", 16, 100);

    if (gameDone) {
      sceneCtx.fillStyle = "rgba(30, 20, 18, 0.55)";
      sceneCtx.fillRect(120, 122, 280, 74);
      sceneCtx.fillStyle = "#fff0d8";
      sceneCtx.font = "18px Georgia";
      sceneCtx.fillText("Forehead clear!", 205, 154);
      sceneCtx.font = "13px Georgia";
      sceneCtx.fillText("All 5 pimples popped.", 196, 176);
    }
  }

  let rafId = 0;
  let last = performance.now();
  let closed = false;

  function close() {
    if (closed) {
      return;
    }
    closed = true;
    cancelAnimationFrame(rafId);
    canvasScene.removeEventListener("mousedown", onDown);
    canvasScene.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    document.removeEventListener("keydown", onEsc);
    if (overlay.parentNode === uiEl) {
      uiEl.removeChild(overlay);
    }
    state.isModalOpen = false;
    state.closeOverlay = null;
  }

  function onEsc(event) {
    if (event.key === "Escape") {
      close();
    }
  }

  function loop(now) {
    if (closed) {
      return;
    }
    const dt = now - last;
    last = now;
    reactionFlashMs = Math.max(0, reactionFlashMs - dt);
    for (const fx of popEffects) {
      fx.ageMs += dt;
    }
    popEffects = popEffects.filter((fx) => fx.ageMs < fx.lifeMs);
    pimples = pimples.filter((pimple) => !pimple.popped);

    if (!gameDone && holding && activeId && pointerInForehead) {
      holdMs += dt;
      const pimple = pimples.find((item) => item.id === activeId);
      if (pimple && !pimple.popped) {
        if (holdMs >= HOLD_TO_POP_MS) {
          pimple.popped = true;
          popSound();
          popEffects.push({ x: pimple.x, y: pimple.y, ageMs: 0, lifeMs: 450 });
          rewardedPop();
          poppedCount += 1;
          updateReactionFromProgress();
          if (poppedCount >= 5) {
            gameDone = true;
          }

          holding = false;
          activeId = null;
          pointerInForehead = false;
          holdMs = 0;
        }
      }
    }

    draw(now);
    rafId = requestAnimationFrame(loop);
  }

  const soundBtn = document.createElement("button");
  soundBtn.type = "button";
  soundBtn.className = "ui-button";
  soundBtn.textContent = "🔈 Sound on";
  actions.insertBefore(soundBtn, closeBtn);
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "🔈 Sound on" : "🔇 Sound off";
  });

  canvasScene.addEventListener("mousedown", onDown);
  canvasScene.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  document.addEventListener("keydown", onEsc);
  closeBtn.addEventListener("click", close);

  state.closeOverlay = close;
  rafId = requestAnimationFrame(loop);
}

function openSkiScene() {
  if (state.isModalOpen) {
    return;
  }

  state.isModalOpen = true;
  uiEl.innerHTML = "";

  const overlay = document.createElement("div");
  overlay.className = "ui-overlay";
  const modal = document.createElement("section");
  modal.className = "ui-modal";

  const title = document.createElement("h2");
  title.className = "ui-modal-title";
  title.textContent = "Ski Slalom";

  const sub = document.createElement("p");
  sub.className = "scene-subtext";
  sub.textContent = "25 seconds. Collect hearts, avoid rocks.";

  const canvasScene = document.createElement("canvas");
  canvasScene.className = "scene-canvas";
  canvasScene.width = 520;
  canvasScene.height = 320;
  const sceneCtx = canvasScene.getContext("2d");

  const actions = document.createElement("div");
  actions.className = "ui-modal-actions";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "ui-button";
  closeBtn.textContent = "Close";
  actions.appendChild(closeBtn);

  modal.append(title, sub, canvasScene, actions);
  overlay.appendChild(modal);
  uiEl.appendChild(overlay);
  const skiSceneFaces = {
    charly: { src: "assets/sprites/characters/charly_slalom_face.png", image: null, loaded: false, errored: false },
    joe: { src: "assets/sprites/characters/joe_slalom_face.png", image: null, loaded: false, errored: false }
  };
  for (const face of Object.values(skiSceneFaces)) {
    face.image = new Image();
    face.image.onload = () => {
      face.loaded = true;
    };
    face.image.onerror = () => {
      face.errored = true;
      face.loaded = false;
    };
    face.image.src = face.src;
  }

  const lanes = [120, 190, 260, 330, 400];
  let playerLane = 2;
  let joeLane = 1;
  let hearts = 0;
  let hits = 0;
  let timeMs = 25000;
  let spawnMs = 0;
  let done = false;
  let reward = 0;
  let resultsLine = "";

  const obstacles = [];
  const heartsItems = [];

  function spawnItem() {
    const lane = Math.floor(Math.random() * lanes.length);
    const isHeart = Math.random() < 0.58;
    const item = {
      lane,
      x: lanes[lane],
      y: -20,
      speed: 120 + Math.random() * 80
    };
    if (isHeart) {
      heartsItems.push(item);
    } else {
      obstacles.push(item);
    }
  }

  function conclude() {
    done = true;
    const finalHearts = Math.max(0, hearts - hits);
    const today = todayLondonDate();
    const already = localStorage.getItem(SKI_LAST_CLAIM_DATE_KEY) === today;
    reward = 0;
    if (!already) {
      if (finalHearts >= 8) {
        reward = 6;
      } else if (finalHearts >= 4) {
        reward = 3;
      } else {
        reward = 1;
      }
      state.flowers += reward;
      persistFlowers();
      localStorage.setItem(SKI_LAST_CLAIM_DATE_KEY, today);
      addFloater(`+🌹${reward}`, state.player.x, state.player.y);
      resultsLine = `Run complete. +${reward} flowers today.`;
    } else {
      resultsLine = "Run complete. Reward already claimed today.";
    }
  }

  function draw(now) {
    const t = now / 1000;
    const skiBg = destinationArtAssets.skiBg;
    if (skiBg.loaded && skiBg.image && !skiBg.errored) {
      sceneCtx.drawImage(skiBg.image, 0, 0, 520, 220);
      sceneCtx.fillStyle = "#dce8ef";
      sceneCtx.fillRect(0, 220, 520, 100);
    } else {
      sceneCtx.fillStyle = "#dce8ef";
      sceneCtx.fillRect(0, 0, 520, 320);
      sceneCtx.fillStyle = "#bfd2de";
      sceneCtx.fillRect(90, 16, 340, 288);
    }

    sceneCtx.strokeStyle = "rgba(80, 98, 112, 0.28)";
    for (const laneX of lanes) {
      sceneCtx.beginPath();
      sceneCtx.moveTo(laneX, 16);
      sceneCtx.lineTo(laneX, 304);
      sceneCtx.stroke();
    }

    for (const rock of obstacles) {
      const gate = destinationArtAssets.slalomGate;
      if (gate.loaded && !gate.errored && (gate.preparedCanvas || gate.image)) {
        const source = gate.preparedCanvas || gate.image;
        if (gate.crop) {
          sceneCtx.drawImage(source, gate.crop.sx, gate.crop.sy, gate.crop.sw, gate.crop.sh, rock.x - 24, rock.y - 24, 48, 48);
        } else {
          sceneCtx.drawImage(source, rock.x - 24, rock.y - 24, 48, 48);
        }
      } else {
        sceneCtx.fillStyle = "#6d6d6f";
        sceneCtx.beginPath();
        sceneCtx.arc(rock.x, rock.y, 12, 0, Math.PI * 2);
        sceneCtx.fill();
      }
    }

    for (const heart of heartsItems) {
      const heartIcon = destinationArtAssets.heartIcon;
      if (heartIcon.loaded && !heartIcon.errored && (heartIcon.preparedCanvas || heartIcon.image)) {
        const source = heartIcon.preparedCanvas || heartIcon.image;
        if (heartIcon.crop) {
          sceneCtx.drawImage(
            source,
            heartIcon.crop.sx,
            heartIcon.crop.sy,
            heartIcon.crop.sw,
            heartIcon.crop.sh,
            heart.x - 16,
            heart.y - 16,
            32,
            32
          );
        } else {
          sceneCtx.drawImage(source, heart.x - 16, heart.y - 16, 32, 32);
        }
      } else {
        sceneCtx.fillStyle = "#c85b7c";
        sceneCtx.beginPath();
        sceneCtx.arc(heart.x - 5, heart.y, 6, 0, Math.PI * 2);
        sceneCtx.arc(heart.x + 5, heart.y, 6, 0, Math.PI * 2);
        sceneCtx.fillRect(heart.x - 10, heart.y, 20, 10);
        sceneCtx.fill();
      }
    }

    const joeY = 90 + Math.sin(t * 4) * 5;
    if (skiSceneFaces.joe.loaded && skiSceneFaces.joe.image && !skiSceneFaces.joe.errored) {
      sceneCtx.drawImage(skiSceneFaces.joe.image, lanes[joeLane] - 16, joeY - 6, 32, 32);
    } else {
      sceneCtx.fillStyle = characters.followNPC.color;
      sceneCtx.fillRect(lanes[joeLane] - 10, joeY, 20, 24);
    }
    sceneCtx.fillStyle = "#1f2c36";
    sceneCtx.font = "12px Georgia";
    sceneCtx.fillText("Joe: I'm already here 😎", lanes[joeLane] - 44, joeY - 8);

    if (skiSceneFaces.charly.loaded && skiSceneFaces.charly.image && !skiSceneFaces.charly.errored) {
      sceneCtx.drawImage(skiSceneFaces.charly.image, lanes[playerLane] - 16, 252, 32, 32);
    } else {
      sceneCtx.fillStyle = characters.player.color;
      sceneCtx.fillRect(lanes[playerLane] - 12, 260, 24, 28);
    }

    sceneCtx.fillStyle = "#1f2c36";
    sceneCtx.font = "14px Georgia";
    if (!done) {
      sceneCtx.fillText(`Time: ${Math.ceil(timeMs / 1000)}s`, 14, 24);
      const heartIcon = destinationArtAssets.heartIcon;
      if (heartIcon.loaded && !heartIcon.errored && (heartIcon.preparedCanvas || heartIcon.image)) {
        const source = heartIcon.preparedCanvas || heartIcon.image;
        if (heartIcon.crop) {
          sceneCtx.drawImage(source, heartIcon.crop.sx, heartIcon.crop.sy, heartIcon.crop.sw, heartIcon.crop.sh, 14, 30, 16, 16);
        } else {
          sceneCtx.drawImage(source, 14, 30, 16, 16);
        }
      }
      sceneCtx.fillText(`Hearts: ${hearts}`, 14, 44);
      sceneCtx.fillText(`Hits: ${hits}`, 14, 64);
    } else {
      const finalHearts = Math.max(0, hearts - hits);
      sceneCtx.fillText(`Hearts collected: ${hearts}`, 14, 24);
      sceneCtx.fillText(`Hits: ${hits}`, 14, 44);
      sceneCtx.fillText(`Final hearts: ${finalHearts}`, 14, 64);
      sceneCtx.fillText(`Flowers won: ${reward}`, 14, 84);
      sceneCtx.fillText(resultsLine, 14, 108);
    }
  }

  function onKeyDown(evt) {
    if (done) {
      return;
    }
    if (evt.key === "ArrowLeft" || evt.key.toLowerCase() === "a") {
      playerLane = clamp(playerLane - 1, 0, lanes.length - 1);
    }
    if (evt.key === "ArrowRight" || evt.key.toLowerCase() === "d") {
      playerLane = clamp(playerLane + 1, 0, lanes.length - 1);
    }
  }

  let rafId = 0;
  let last = performance.now();
  let closed = false;

  function close() {
    if (closed) {
      return;
    }
    closed = true;
    cancelAnimationFrame(rafId);
    document.removeEventListener("keydown", onEsc);
    document.removeEventListener("keydown", onKeyDown);
    if (overlay.parentNode === uiEl) {
      uiEl.removeChild(overlay);
    }
    state.isModalOpen = false;
    state.closeOverlay = null;
  }

  function onEsc(event) {
    if (event.key === "Escape") {
      close();
    }
  }

  function loop(now) {
    if (closed) {
      return;
    }
    const dt = now - last;
    last = now;

    if (!done) {
      timeMs -= dt;
      spawnMs += dt;
      if (spawnMs > 360) {
        spawnMs = 0;
        spawnItem();
      }

      joeLane = clamp(joeLane + (Math.random() < 0.24 ? (Math.random() < 0.5 ? -1 : 1) : 0), 0, lanes.length - 1);

      for (const rock of obstacles) {
        rock.y += (dt / 1000) * rock.speed;
      }
      for (const heart of heartsItems) {
        heart.y += (dt / 1000) * heart.speed;
      }

      for (let i = obstacles.length - 1; i >= 0; i -= 1) {
        const rock = obstacles[i];
        if (Math.abs(rock.x - lanes[playerLane]) < 10 && rock.y > 242 && rock.y < 288) {
          hits += 1;
          obstacles.splice(i, 1);
        } else if (rock.y > 340) {
          obstacles.splice(i, 1);
        }
      }

      for (let i = heartsItems.length - 1; i >= 0; i -= 1) {
        const heart = heartsItems[i];
        if (Math.abs(heart.x - lanes[playerLane]) < 10 && heart.y > 242 && heart.y < 288) {
          hearts += 1;
          heartsItems.splice(i, 1);
        } else if (heart.y > 340) {
          heartsItems.splice(i, 1);
        }
      }

      if (timeMs <= 0) {
        conclude();
      }
    }

    draw(now);
    rafId = requestAnimationFrame(loop);
  }

  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keydown", onEsc);
  state.closeOverlay = close;
  rafId = requestAnimationFrame(loop);
}

function openGlobeScene() {
  if (state.isModalOpen) {
    return;
  }

  state.isModalOpen = true;
  uiEl.innerHTML = "";

  const overlay = document.createElement("div");
  overlay.className = "ui-overlay";
  const modal = document.createElement("section");
  modal.className = "ui-modal globe-modal";

  const title = document.createElement("h2");
  title.className = "ui-modal-title";
  title.textContent = "Our Places";

  const canvasScene = document.createElement("canvas");
  canvasScene.className = "scene-canvas";
  canvasScene.width = 520;
  canvasScene.height = 220;
  const sceneCtx = canvasScene.getContext("2d");
  sceneCtx.imageSmoothingEnabled = false;

  const wrap = document.createElement("div");
  wrap.className = "globe-wrap";

  const left = document.createElement("div");
  const right = document.createElement("div");

  const toggleRow = document.createElement("div");
  toggleRow.className = "restaurant-mode-row";
  const visitedBtn = document.createElement("button");
  visitedBtn.type = "button";
  visitedBtn.className = "ui-button";
  visitedBtn.textContent = "Visited";
  const wishBtn = document.createElement("button");
  wishBtn.type = "button";
  wishBtn.className = "ui-button";
  wishBtn.textContent = "Wishlist";
  toggleRow.append(visitedBtn, wishBtn);

  const destinationList = document.createElement("div");
  destinationList.className = "globe-destination-list";

  const frame = document.createElement("div");
  frame.className = "globe-photo-frame";

  const caption = document.createElement("p");
  caption.className = "scene-hint";

  const carousel = document.createElement("div");
  carousel.className = "carousel-controls";
  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "ui-button";
  prevBtn.textContent = "Prev";
  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "ui-button";
  nextBtn.textContent = "Next";
  carousel.append(prevBtn, nextBtn);

  right.append(toggleRow, destinationList, frame, carousel, caption);
  left.appendChild(canvasScene);
  wrap.append(left, right);

  const actions = document.createElement("div");
  actions.className = "ui-modal-actions";
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "ui-button primary-button";
  backBtn.textContent = "Back to Car";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "ui-button";
  closeBtn.textContent = "Close";
  actions.append(backBtn, closeBtn);

  modal.append(title, wrap, actions);
  overlay.appendChild(modal);
  uiEl.appendChild(overlay);

  const visited = [
    { id: "lebanon", label: "Lebanon", caption: "Home roots and loud laughter.", lon: 35.9, lat: 33.9 },
    { id: "uae", label: "UAE", caption: "Desert lights and late drives.", lon: 54.4, lat: 24.3 },
    { id: "egypt", label: "Egypt", caption: "History and warm evenings.", lon: 30.8, lat: 26.8 },
    { id: "finland", label: "Finland", caption: "Cold air and clean silence.", lon: 25.7, lat: 61.9 },
    { id: "vietnam", label: "Vietnam", caption: "Street food and soft rain.", lon: 108.3, lat: 14.1 },
    { id: "colombia", label: "Colombia", caption: "Colorful streets and rhythm.", lon: -74.3, lat: 4.6 },
    { id: "peru", label: "Peru", caption: "Mountain views and deep breaths.", lon: -75.0, lat: -9.2 },
    { id: "ghana", label: "Ghana", caption: "Sun, music, and family warmth.", lon: -1.0, lat: 7.9 },
    { id: "spain", label: "Spain", caption: "Slow dinners and good light.", lon: -3.7, lat: 40.4 },
    { id: "uk", label: "UK", caption: "City rain and familiar steps.", lon: -1.5, lat: 52.4 }
  ];

  const wishlist = [
    { id: "new-caledonia", label: "New Caledonia", caption: "Turquoise daydream.", lon: 165.6, lat: -21.5 },
    { id: "philippines", label: "Philippines", caption: "Island hopping list.", lon: 121.8, lat: 12.9 },
    { id: "japan", label: "Japan", caption: "Quiet trains and neon nights.", lon: 138.2, lat: 36.2 },
    { id: "chamonix", label: "Chamonix", caption: "Sharp peaks, calm mornings.", lon: 6.9, lat: 45.9 },
    { id: "patagonia", label: "Patagonia", caption: "Wind, sky, and open space.", lon: -72.7, lat: -49.3 }
  ];

  let showingWishlist = false;
  let current = visited[0];
  let photoIndex = 1;
  let globeRotationDeg = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragOriginX = 0;
  let dragOriginY = 0;
  let dragMoved = false;
  const markerScreenPoints = [];
  const GLOBE_CANVAS_W = canvasScene.width;
  const GLOBE_CANVAS_H = canvasScene.height;
  const GLOBE_TARGET_WIDTH = 384;
  const GLOBE_TARGET_HEIGHT = 192;
  const GLOBE_LOWER_Y_OFFSET = 12;
  const DRAG_PX_TO_ROTATION_DEG = 0.72;
  const MARKER_ALIGNMENT_WINDOW_DEG = 26;

  function normalizeDeg(value) {
    let n = value % 360;
    if (n > 180) {
      n -= 360;
    }
    if (n < -180) {
      n += 360;
    }
    return n;
  }

  function getCanvasPoint(event) {
    const rect = canvasScene.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }
    return {
      x: ((event.clientX - rect.left) / rect.width) * GLOBE_CANVAS_W,
      y: ((event.clientY - rect.top) / rect.height) * GLOBE_CANVAS_H
    };
  }

  function getGlobeRect() {
    const globeAsset = destinationArtAssets.airportGlobe;
    let sourceWidth = GLOBE_TARGET_WIDTH;
    let sourceHeight = GLOBE_TARGET_HEIGHT;
    if (globeAsset.loaded && globeAsset.image && !globeAsset.errored) {
      sourceWidth = globeAsset.image.naturalWidth || globeAsset.image.width || sourceWidth;
      sourceHeight = globeAsset.image.naturalHeight || globeAsset.image.height || sourceHeight;
    }
    const safeRatio = sourceHeight > 0 ? sourceWidth / sourceHeight : GLOBE_TARGET_WIDTH / GLOBE_TARGET_HEIGHT;
    const maxW = GLOBE_CANVAS_W - 28;
    const maxH = GLOBE_CANVAS_H - 24;
    let drawW = Math.min(maxW, GLOBE_TARGET_WIDTH);
    let drawH = drawW / safeRatio;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH * safeRatio;
    }
    const drawX = (GLOBE_CANVAS_W - drawW) / 2;
    let drawY = (GLOBE_CANVAS_H - drawH) / 2 + GLOBE_LOWER_Y_OFFSET;
    drawY = clamp(drawY, 8, GLOBE_CANVAS_H - drawH - 8);
    return { x: drawX, y: drawY, w: drawW, h: drawH };
  }

  function refreshDestinations() {
    destinationList.innerHTML = "";
    const source = showingWishlist ? wishlist : visited;
    source.forEach((item) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ui-chip";
      if (item.id === current.id) {
        chip.classList.add("chip-selected");
      }
      chip.textContent = item.label;
      chip.addEventListener("click", () => {
        current = item;
        photoIndex = 1;
        refreshDestinations();
        refreshPhoto();
      });
      destinationList.appendChild(chip);
    });
  }

  function refreshModeButtons() {
    visitedBtn.classList.toggle("chip-selected", !showingWishlist);
    wishBtn.classList.toggle("chip-selected", showingWishlist);
  }

  function refreshPhoto() {
    frame.innerHTML = "";
    const img = document.createElement("img");
    img.className = "globe-photo";
    img.alt = current.label;
    img.src = `assets/photos/${current.id}/${photoIndex}.jpg`;
    img.onerror = () => {
      frame.innerHTML = `<div class=\"globe-photo-placeholder\">${current.label}<br/>Photo ${photoIndex} coming soon</div>`;
    };
    frame.appendChild(img);
    caption.textContent = current.caption;
  }

  function getVisibleMarkerPoint(item, globeRect) {
    const relLon = normalizeDeg(item.lon + globeRotationDeg);
    const lonRad = (relLon * Math.PI) / 180;
    const latRad = ((item.lat || 0) * Math.PI) / 180;
    const depth = Math.cos(lonRad);
    if (depth <= 0.04) {
      return null;
    }
    const cx = globeRect.x + globeRect.w / 2;
    const cy = globeRect.y + globeRect.h / 2;
    const rx = globeRect.w * 0.45;
    const ry = globeRect.h * 0.44;
    const x = cx + Math.sin(lonRad) * rx * Math.cos(latRad);
    const y = cy - Math.sin(latRad) * ry + (1 - depth) * 3.5;
    const glowStrength = Math.max(0, 1 - Math.abs(relLon) / MARKER_ALIGNMENT_WINDOW_DEG);
    return {
      item,
      x,
      y,
      depth,
      glowStrength,
      radius: showingWishlist ? 4.2 : 3.7
    };
  }

  function drawGlobeFallback(globeRect) {
    sceneCtx.fillStyle = "#20343f";
    sceneCtx.fillRect(0, 0, GLOBE_CANVAS_W, GLOBE_CANVAS_H);
    const cx = globeRect.x + globeRect.w / 2;
    const cy = globeRect.y + globeRect.h / 2;
    sceneCtx.fillStyle = "#5f8fa2";
    sceneCtx.beginPath();
    sceneCtx.ellipse(cx, cy, globeRect.w * 0.48, globeRect.h * 0.47, 0, 0, Math.PI * 2);
    sceneCtx.fill();
    sceneCtx.strokeStyle = "rgba(243, 252, 255, 0.4)";
    sceneCtx.lineWidth = 2;
    sceneCtx.beginPath();
    sceneCtx.ellipse(cx, cy, globeRect.w * 0.42, globeRect.h * 0.18, 0, 0, Math.PI * 2);
    sceneCtx.stroke();
  }

  function drawAirportPair() {
    const charlyX = 344;
    const charlyY = 152;
    const charlyW = 54;
    const charlyH = 54;
    const joeX = 394;
    const joeY = 154;
    const joeW = 52;
    const joeH = 52;

    if (charlySpriteLoaded && charlySpriteSheet && !charlySpriteErrored) {
      sceneCtx.drawImage(
        charlySpriteSheet,
        0,
        0,
        CHARLY_FRAME_W,
        CHARLY_FRAME_H,
        charlyX,
        charlyY,
        charlyW,
        charlyH
      );
    } else {
      sceneCtx.fillStyle = characters.player.color;
      sceneCtx.fillRect(charlyX + 14, charlyY + 11, 22, 30);
    }

    if (joeSpriteLoaded && joeSpriteSheet && !joeSpriteErrored) {
      sceneCtx.drawImage(
        joeSpriteSheet,
        0,
        0,
        JOE_FRAME_W,
        JOE_FRAME_H,
        joeX,
        joeY,
        joeW,
        joeH
      );
    } else {
      sceneCtx.fillStyle = characters.followNPC.color;
      sceneCtx.fillRect(joeX + 14, joeY + 12, 20, 28);
    }
  }

  function drawGlobe() {
    markerScreenPoints.length = 0;
    const skyGradient = sceneCtx.createLinearGradient(0, 0, 0, GLOBE_CANVAS_H);
    skyGradient.addColorStop(0, "#2a3c49");
    skyGradient.addColorStop(1, "#1e2d37");
    sceneCtx.fillStyle = skyGradient;
    sceneCtx.fillRect(0, 0, GLOBE_CANVAS_W, GLOBE_CANVAS_H);

    const globeRect = getGlobeRect();
    const globeAsset = destinationArtAssets.airportGlobe;
    if (globeAsset.loaded && globeAsset.image && !globeAsset.errored) {
      sceneCtx.drawImage(globeAsset.image, globeRect.x, globeRect.y, globeRect.w, globeRect.h);
    } else {
      drawGlobeFallback(globeRect);
    }

    const markers = showingWishlist ? wishlist : visited;
    const markerColor = showingWishlist ? "#9fe6ff" : "#ffe3b3";
    const glowColor = showingWishlist ? "rgba(159, 230, 255, 0.95)" : "rgba(255, 210, 156, 0.95)";
    for (const item of markers) {
      const point = getVisibleMarkerPoint(item, globeRect);
      if (!point) {
        continue;
      }
      markerScreenPoints.push(point);
      const selected = point.item.id === current.id;
      sceneCtx.save();
      sceneCtx.shadowBlur = 8 + point.glowStrength * 13 + (selected ? 8 : 0);
      sceneCtx.shadowColor = glowColor;
      sceneCtx.fillStyle = markerColor;
      sceneCtx.beginPath();
      sceneCtx.arc(point.x, point.y, point.radius + (selected ? 1.2 : 0), 0, Math.PI * 2);
      sceneCtx.fill();
      sceneCtx.restore();

      if (selected) {
        sceneCtx.strokeStyle = "rgba(255, 247, 229, 0.95)";
        sceneCtx.lineWidth = 1.3;
        sceneCtx.beginPath();
        sceneCtx.arc(point.x, point.y, point.radius + 3.6, 0, Math.PI * 2);
        sceneCtx.stroke();
      }
    }

    drawAirportPair();

  }

  function close() {
    document.removeEventListener("keydown", onEsc);
    canvasScene.removeEventListener("mousedown", onDown);
    canvasScene.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    if (overlay.parentNode === uiEl) {
      uiEl.removeChild(overlay);
    }
    state.isModalOpen = false;
    state.closeOverlay = null;
  }

  function onEsc(event) {
    if (event.key === "Escape") {
      close();
    }
  }

  function onDown(event) {
    const p = getCanvasPoint(event);
    if (!p) {
      return;
    }
    dragging = true;
    dragMoved = false;
    dragStartX = p.x;
    dragOriginX = p.x;
    dragOriginY = p.y;
  }

  function onMove(event) {
    if (!dragging) {
      return;
    }
    const p = getCanvasPoint(event);
    if (!p) {
      return;
    }
    const dx = p.x - dragStartX;
    const totalDx = p.x - dragOriginX;
    const totalDy = p.y - dragOriginY;
    if (Math.abs(totalDx) + Math.abs(totalDy) > 3) {
      dragMoved = true;
    }
    dragStartX = p.x;
    globeRotationDeg += dx * DRAG_PX_TO_ROTATION_DEG;
    globeRotationDeg = normalizeDeg(globeRotationDeg);
  }

  function onUp(event) {
    const p = getCanvasPoint(event);
    if (p && !dragMoved) {
      let closest = null;
      for (const marker of markerScreenPoints) {
        const hitRadius = marker.radius + 5;
        const dx = p.x - marker.x;
        const dy = p.y - marker.y;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          if (!closest || marker.depth > closest.depth) {
            closest = marker;
          }
        }
      }
      if (closest) {
        current = closest.item;
        photoIndex = 1;
        refreshDestinations();
        refreshPhoto();
      }
    }
    dragging = false;
    dragMoved = false;
  }

  visitedBtn.addEventListener("click", () => {
    showingWishlist = false;
    current = visited[0];
    photoIndex = 1;
    refreshModeButtons();
    refreshDestinations();
    refreshPhoto();
  });

  wishBtn.addEventListener("click", () => {
    showingWishlist = true;
    current = wishlist[0];
    photoIndex = 1;
    refreshModeButtons();
    refreshDestinations();
    refreshPhoto();
  });

  prevBtn.addEventListener("click", () => {
    photoIndex = photoIndex <= 1 ? 4 : photoIndex - 1;
    refreshPhoto();
  });

  nextBtn.addEventListener("click", () => {
    photoIndex = photoIndex >= 4 ? 1 : photoIndex + 1;
    refreshPhoto();
  });

  backBtn.addEventListener("click", () => {
    close();
    setWorld("home", "driveway");
  });
  closeBtn.addEventListener("click", close);

  document.addEventListener("keydown", onEsc);
  canvasScene.addEventListener("mousedown", onDown);
  canvasScene.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);

  state.closeOverlay = close;
  refreshModeButtons();
  refreshDestinations();
  refreshPhoto();

  const tick = () => {
    if (!state.isModalOpen) {
      return;
    }
    drawGlobe();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function openRestaurantScene() {
  if (state.isModalOpen) {
    return;
  }

  state.isModalOpen = true;
  uiEl.innerHTML = "";

  const overlay = document.createElement("div");
  overlay.className = "ui-overlay";
  const modal = document.createElement("section");
  modal.className = "ui-modal";

  const title = document.createElement("h2");
  title.className = "ui-modal-title";
  title.textContent = "Date Night";

  const stepHeader = document.createElement("div");
  stepHeader.className = "step-header";
  const stepText = document.createElement("div");
  stepText.className = "scene-subtext";
  const dots = document.createElement("div");
  dots.className = "progress-dots";
  const dotEls = [0, 1, 2, 3].map(() => {
    const d = document.createElement("div");
    d.className = "progress-dot";
    dots.appendChild(d);
    return d;
  });
  stepHeader.append(stepText, dots);

  const content = document.createElement("div");
  const actions = document.createElement("div");
  actions.className = "ui-modal-actions";

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "ui-button secondary-button";
  backBtn.textContent = "Back";

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "ui-button primary-button";
  nextBtn.textContent = "Next";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "ui-button";
  closeBtn.textContent = "Close";

  actions.append(backBtn, nextBtn, closeBtn);
  modal.append(title, stepHeader, content, actions);
  overlay.appendChild(modal);
  uiEl.appendChild(overlay);

  let page = 0;
  let mood = "Dinner";
  let charlyMeal = "";
  let charlyDrink = "";
  let guessMeal = "";
  let guessDrink = "";
  let resultFlowers = 0;
  let resultLine = "";

  const charlyMeals = [
    "cabbage salad with grilled beef",
    "fried calamari",
    "fufu",
    "sausage",
    "steak"
  ];
  const charlyDrinks = ["margarita", "diet coke"];
  const joeMeals = ["steak", "pasta", "burger"];
  const joeDrinks = ["old fashioned", "negroni", "whisky sour"];

  function renderChips(parent, options, selected, onPick) {
    const row = document.createElement("div");
    row.className = "choice-chips";
    options.forEach((opt) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ui-chip";
      if (selected === opt) {
        chip.classList.add("chip-selected");
      }
      chip.textContent = opt;
      chip.addEventListener("click", () => onPick(opt));
      row.appendChild(chip);
    });
    parent.appendChild(row);
  }

  function goBackHome() {
    close();
    setWorld("home", "driveway");
  }

  function evaluateGuess() {
    const today = todayLondonDate();
    const alreadyWonToday = localStorage.getItem(RESTAURANT_WIN_DATE_KEY) === today;

    if (guessMeal === "steak" && guessDrink === "old fashioned") {
      if (!alreadyWonToday) {
        resultFlowers = 5;
        state.flowers += 5;
        persistFlowers();
        localStorage.setItem(RESTAURANT_WIN_DATE_KEY, today);
        addFloater("+🌹5", state.player.x, state.player.y);
        resultLine = "Nailed it. Joe smiled before saying anything.";
      } else {
        resultFlowers = 0;
        resultLine = "Correct again, but today's reward is already claimed.";
      }
    } else {
      resultFlowers = 0;
      resultLine = "Close. Joe says: still perfect company though.";
    }
  }

  function renderPage() {
    content.innerHTML = "";
    content.style.backgroundImage = "";
    content.style.backgroundSize = "";
    content.style.backgroundPosition = "";
    content.style.backgroundRepeat = "";
    content.style.borderRadius = "";
    content.style.minHeight = "";
    content.style.padding = "";
    dotEls.forEach((dot, idx) => dot.classList.toggle("active", idx === page));

    if (page === 0) {
      stepText.textContent = "1/4 Mood";
      let moodAsset = null;
      if (mood === "Dinner") {
        moodAsset = destinationArtAssets.restaurantMoodCozy;
      } else if (mood === "Drinks") {
        moodAsset = destinationArtAssets.restaurantMoodFancy;
      } else {
        moodAsset = destinationArtAssets.restaurantMoodFun;
      }
      if (moodAsset?.loaded && moodAsset.image && !moodAsset.errored) {
        content.style.backgroundImage = `url("${moodAsset.src}")`;
        content.style.backgroundSize = "cover";
        content.style.backgroundPosition = "center";
        content.style.backgroundRepeat = "no-repeat";
        content.style.borderRadius = "12px";
        content.style.minHeight = "180px";
        content.style.padding = "12px";
      }
      const p = document.createElement("p");
      p.className = "ui-modal-body";
      p.textContent = "Pick the vibe first.";
      content.appendChild(p);

      const row = document.createElement("div");
      row.className = "restaurant-mode-row";

      ["Dinner", "Drinks", "Fun"].forEach((mode) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ui-button";
        btn.textContent = mode;
        if (mood === mode) {
          btn.classList.add("chip-selected");
        }
        btn.addEventListener("click", () => {
          mood = mode;
          renderPage();
        });
        row.appendChild(btn);
      });
      content.appendChild(row);
      if (mood === "Dinner") {
        modal.style.background = "#f5ead8";
      } else if (mood === "Drinks") {
        modal.style.background = "#e9f1f3";
      } else {
        modal.style.background = "#f2e7ef";
      }
    }

    if (page === 1) {
      stepText.textContent = "2/4 Charly picks";
      const p1 = document.createElement("p");
      p1.className = "ui-modal-body";
      p1.textContent = "Charly's meal:";
      content.appendChild(p1);
      renderChips(content, charlyMeals, charlyMeal, (value) => {
        charlyMeal = value;
        renderPage();
      });

      const p2 = document.createElement("p");
      p2.className = "ui-modal-body";
      p2.textContent = "Charly's drink:";
      content.appendChild(p2);
      renderChips(content, charlyDrinks, charlyDrink, (value) => {
        charlyDrink = value;
        renderPage();
      });
    }

    if (page === 2) {
      stepText.textContent = "3/4 Guess Joe's order";
      const p1 = document.createElement("p");
      p1.className = "ui-modal-body";
      p1.textContent = "Joe's meal guess:";
      content.appendChild(p1);
      renderChips(content, joeMeals, guessMeal, (value) => {
        guessMeal = value;
        renderPage();
      });

      const p2 = document.createElement("p");
      p2.className = "ui-modal-body";
      p2.textContent = "Joe's drink guess:";
      content.appendChild(p2);
      renderChips(content, joeDrinks, guessDrink, (value) => {
        guessDrink = value;
        renderPage();
      });
    }

    if (page === 3) {
      stepText.textContent = "4/4 Results";
      const p1 = document.createElement("p");
      p1.className = "ui-modal-body";
      p1.textContent = `Flowers earned: ${resultFlowers}`;
      const p2 = document.createElement("p");
      p2.className = "scene-hint";
      p2.textContent = resultLine || "A small night, a good memory.";
      content.append(p1, p2);

      const homeBtn = document.createElement("button");
      homeBtn.type = "button";
      homeBtn.className = "ui-button primary-button";
      homeBtn.textContent = "Back Home";
      homeBtn.addEventListener("click", goBackHome);
      content.appendChild(homeBtn);
    }

    backBtn.disabled = page === 0;
    nextBtn.disabled =
      (page === 1 && (!charlyMeal || !charlyDrink)) ||
      (page === 2 && (!guessMeal || !guessDrink)) ||
      page === 3;
  }

  function close() {
    document.removeEventListener("keydown", onEsc);
    if (overlay.parentNode === uiEl) {
      uiEl.removeChild(overlay);
    }
    state.isModalOpen = false;
    state.closeOverlay = null;
  }

  function onEsc(event) {
    if (event.key === "Escape") {
      close();
    }
  }

  backBtn.addEventListener("click", () => {
    page = Math.max(0, page - 1);
    renderPage();
  });

  nextBtn.addEventListener("click", () => {
    if (page === 2) {
      evaluateGuess();
    }
    page = Math.min(3, page + 1);
    renderPage();
  });

  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", onEsc);
  state.closeOverlay = close;
  renderPage();
}

function openDestinationOverlay(interactable) {
  state.isModalOpen = true;
  state.closeOverlay = openInteractableOverlay(
    interactable,
    uiEl,
    () => {
      state.isModalOpen = false;
      state.closeOverlay = null;
    },
    (action) => {
      if (action.type === "tv") {
        openMovieScene();
        return;
      }
      if (action.type === "pimple") {
        openPimpleScene();
        return;
      }
      if (action.type === "edit-video") {
        openVideoEditScene();
        return;
      }
      if (action.type === "drive") {
        openDriveScene();
        return;
      }
      if (action.type === "ski") {
        openSkiScene();
        return;
      }
      if (action.type === "globe") {
        openGlobeScene();
        return;
      }
      if (action.type === "restaurant") {
        openRestaurantScene();
        return;
      }
      if (action.type === "back-home") {
        setWorld("home", "driveway");
      }
    },
    { currentWorld: state.currentWorld }
  );
}

function tryMove(dx, dy) {
  const layout = state.activeWorldLayout;
  const next = clampTile({ x: state.player.x + dx, y: state.player.y + dy }, layout);
  if (isBlockedTile(next.x, next.y, layout)) {
    return false;
  }
  state.player = next;
  return true;
}

function handleInput(event) {
  const key = event.key.toLowerCase();

  if (key === "t") {
    state.debug.showTileOverlay = !state.debug.showTileOverlay;
    event.preventDefault();
    return;
  }

  if (key === "l" && !state.isModalOpen) {
    openLetterBook();
    return;
  }

  if (state.isModalOpen) {
    return;
  }

  if (event.key === "Escape") {
    if (state.currentWorld !== "home") {
      openReturnHomeConfirm();
    }
    return;
  }

  if (key === "e") {
    if (tryCollectFlower(state, state.activeWorldLayout)) {
      return;
    }

    if (state.currentWorld === "home" && tryPetInteraction(state, state.pets)) {
      return;
    }

    const interactable = getInteractableNearPlayer(state, state.activeWorldLayout);
    if (interactable) {
      openDestinationOverlay(interactable);
    }
    return;
  }

  let moved = false;
  let moveDx = 0;
  let moveDy = 0;
  if (key === "arrowup" || key === "w") {
    moveDy = -1;
  } else if (key === "arrowdown" || key === "s") {
    moveDy = 1;
  } else if (key === "arrowleft" || key === "a") {
    moveDx = -1;
  } else if (key === "arrowright" || key === "d") {
    moveDx = 1;
  }

  if (moveDx !== 0 || moveDy !== 0) {
    setPlayerFacingFromDirection(moveDx, moveDy);
    moved = tryMove(moveDx, moveDy);
  }

  if (moved) {
    markPlayerMoved();
    tryCollectFlower(state, state.activeWorldLayout);
  }
}

function drawGrid() {
  const layout = state.activeWorldLayout;
  const size = state.tileSize;

  const startX = Math.max(0, Math.floor(state.camera.x / size) - 1);
  const endX = Math.min(layout.width - 1, Math.ceil((state.camera.x + state.viewport.w) / size) + 1);
  const startY = Math.max(0, Math.floor(state.camera.y / size) - 1);
  const endY = Math.min(layout.height - 1, Math.ceil((state.camera.y + state.viewport.h) / size) + 1);

  const bgMap = {
    home: "#fffdf7",
    ski: "#eef5fb",
    airport: "#f3f4f8",
    restaurant: "#f8f2e9"
  };

  ctx.fillStyle = bgMap[state.currentWorld] ?? "#fffdf7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const px = x * size - state.camera.x;
      const py = y * size - state.camera.y;

      if (state.currentWorld === "home" && layout.zones) {
        const { bedroomRegion, outsideRegion, drivewayRegion, poolRegion } = layout.zones;
        const inRect = (rect) =>
          rect &&
          x >= rect.x &&
          x < rect.x + rect.w &&
          y >= rect.y &&
          y < rect.y + rect.h;

        if (inRect(outsideRegion)) {
          const greenA = "#dceecf";
          const greenB = "#d4e7c7";
          const plantTone = "#bfdcaf";
          ctx.fillStyle = (x + y) % 2 === 0 ? greenA : greenB;
          ctx.fillRect(px, py, size, size);
          if ((x * 11 + y * 7) % 9 === 0) {
            ctx.fillStyle = plantTone;
            ctx.fillRect(px + 6, py + 8, 5, 5);
            ctx.fillRect(px + 12, py + 14, 4, 4);
          }
        }
        if (inRect(drivewayRegion)) {
          ctx.fillStyle = (x + y) % 2 === 0 ? "#d9d9dc" : "#ceced1";
          ctx.fillRect(px, py, size, size);
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fillRect(px + 3, py + 3, size - 6, 2);
        }
        if (inRect(poolRegion)) {
          ctx.fillStyle = (x + y) % 2 === 0 ? "#91cde9" : "#84c3e0";
          ctx.fillRect(px, py, size, size);
          ctx.fillStyle = "rgba(235, 248, 255, 0.35)";
          ctx.fillRect(px + 8, py + 10, 20, 2);
          ctx.fillRect(px + 18, py + 20, 12, 2);
        }
        if (inRect(bedroomRegion)) {
          const floorAsset = bedroomArtAssets.floor;
          if (floorAsset.loaded && floorAsset.image && !floorAsset.errored) {
            ctx.drawImage(floorAsset.image, px, py, size, size);
          } else {
            ctx.fillStyle = "#fff7ea";
            ctx.fillRect(px, py, size, size);
          }
        }
      }
    }
  }
}

function drawWalls() {
  const size = state.tileSize;
  const layout = state.activeWorldLayout;
  const wallAsset = bedroomArtAssets.wall;
  const canUseWallArt = wallAsset.loaded && wallAsset.image && !wallAsset.errored;
  ctx.fillStyle = "#837565";

  for (const wall of layout.walls) {
    if (!isTileVisible(wall.x, wall.y)) {
      continue;
    }
    const x = wall.x * size - state.camera.x;
    const y = wall.y * size - state.camera.y;
    if (canUseWallArt) {
      ctx.drawImage(wallAsset.image, x, y, size, size);
    } else {
      ctx.fillRect(x, y, size, size);
    }
  }
}

function drawDestinationDecor() {
  const layout = state.activeWorldLayout;
  const decorItems = layout.decor;
  if (!decorItems || !decorItems.length) {
    return;
  }
  const size = state.tileSize;
  for (const item of decorItems) {
    if (!isTileVisible(item.x, item.y, Math.max(item.w || 1, item.h || 1) - 1)) {
      continue;
    }
    const x = item.x * size - state.camera.x;
    const y = item.y * size - state.camera.y;
    const w = (item.w || 1) * size;
    const h = (item.h || 1) * size;

    if (item.type === "ski-tree") {
      ctx.fillStyle = "#d9edf5";
      ctx.fillRect(x + 4, y + h - 10, w - 8, 6);
      ctx.fillStyle = "#2f6a52";
      ctx.fillRect(x + w / 2 - 6, y + h - 16, 12, 12);
      ctx.fillStyle = "#3e7e63";
      ctx.fillRect(x + w / 2 - 12, y + h - 30, 24, 12);
      ctx.fillRect(x + w / 2 - 16, y + h - 42, 32, 10);
    } else if (item.type === "ski-fence") {
      ctx.fillStyle = "#7d6758";
      for (let i = 0; i < item.w; i += 1) {
        ctx.fillRect(x + i * size + 4, y + h - 18, 4, 18);
      }
      ctx.fillRect(x + 2, y + h - 14, w - 4, 4);
      ctx.fillRect(x + 2, y + h - 7, w - 4, 4);
    } else if (item.type === "snowbank") {
      ctx.fillStyle = "#edf7fc";
      ctx.fillRect(x + 4, y + 8, w - 8, h - 12);
      ctx.fillStyle = "#d7e9f4";
      ctx.fillRect(x + 8, y + 12, w - 16, 6);
    } else if (item.type === "ski-sign") {
      ctx.fillStyle = "#6f5845";
      ctx.fillRect(x + w / 2 - 3, y + 10, 6, h - 10);
      ctx.fillStyle = "#a73e46";
      ctx.fillRect(x + 6, y + 8, w - 12, 16);
      ctx.fillStyle = "#f7e8d2";
      ctx.fillRect(x + 11, y + 14, w - 22, 4);
    } else if (item.type === "airport-bench") {
      ctx.fillStyle = "#66727f";
      ctx.fillRect(x + 6, y + h - 18, w - 12, 8);
      ctx.fillStyle = "#4b5561";
      ctx.fillRect(x + 8, y + h - 10, 6, 10);
      ctx.fillRect(x + w - 14, y + h - 10, 6, 10);
      ctx.fillStyle = "#8d98a3";
      ctx.fillRect(x + 6, y + h - 26, w - 12, 6);
    } else if (item.type === "airport-cart") {
      ctx.fillStyle = "#8ea6bb";
      ctx.fillRect(x + 6, y + 8, w - 12, h - 14);
      ctx.fillStyle = "#2e3944";
      ctx.fillRect(x + 8, y + h - 8, 6, 4);
      ctx.fillRect(x + w - 14, y + h - 8, 6, 4);
    } else if (item.type === "airport-plant") {
      ctx.fillStyle = "#7d6a5b";
      ctx.fillRect(x + w / 2 - 8, y + h - 10, 16, 8);
      ctx.fillStyle = "#4f8868";
      ctx.fillRect(x + w / 2 - 14, y + h - 24, 28, 14);
      ctx.fillStyle = "#67a07f";
      ctx.fillRect(x + w / 2 - 10, y + h - 30, 20, 8);
    } else if (item.type === "airport-barrier") {
      ctx.fillStyle = "#c64557";
      ctx.fillRect(x + 4, y + h / 2 - 3, w - 8, 6);
      ctx.fillStyle = "#59636f";
      ctx.fillRect(x + 6, y + h / 2 - 10, 4, 20);
      ctx.fillRect(x + w - 10, y + h / 2 - 10, 4, 20);
    } else if (item.type === "rest-table") {
      ctx.fillStyle = "#8c6f5a";
      ctx.fillRect(x + 8, y + 8, w - 16, h - 16);
      ctx.fillStyle = "#6d5344";
      ctx.fillRect(x + 12, y + 12, w - 24, h - 24);
      ctx.fillStyle = "#f1ddb8";
      ctx.fillRect(x + w / 2 - 2, y + h / 2 - 2, 4, 4);
    } else if (item.type === "rest-plant") {
      ctx.fillStyle = "#7a6050";
      ctx.fillRect(x + w / 2 - 7, y + h - 10, 14, 8);
      ctx.fillStyle = "#4f7d5f";
      ctx.fillRect(x + w / 2 - 12, y + h - 22, 24, 12);
      ctx.fillStyle = "#6ca280";
      ctx.fillRect(x + w / 2 - 8, y + h - 28, 16, 6);
    } else if (item.type === "rest-candle") {
      ctx.fillStyle = "#efd7b5";
      ctx.fillRect(x + 10, y + 10, w - 20, h - 14);
      ctx.fillStyle = "#f0aa58";
      ctx.fillRect(x + w / 2 - 1, y + 8, 2, 4);
    } else if (item.type === "rest-rug") {
      ctx.fillStyle = "#7b4f58";
      ctx.fillRect(x + 2, y + 4, w - 4, h - 8);
      ctx.fillStyle = "#a8757e";
      ctx.fillRect(x + 8, y + 8, w - 16, h - 16);
    } else if (item.type === "rest-frame") {
      ctx.fillStyle = "#6b5445";
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      ctx.fillStyle = "#d7b88f";
      ctx.fillRect(x + 6, y + 5, w - 12, h - 10);
    }
  }
}

function drawInteractables() {
  const size = state.tileSize;
  const nearbyInteractable = !state.isModalOpen
    ? getInteractableNearPlayer(state, state.activeWorldLayout)
    : null;
  for (const obj of state.activeWorldLayout.interactables) {
    const x = obj.x * size - state.camera.x;
    const y = obj.y * size - state.camera.y;
    const w = obj.w * size;
    const h = obj.h * size;

    let drewSprite = false;
    if (obj.type === "bed") {
      const bedAsset = bedroomArtAssets.bed;
      if (bedAsset.loaded && bedAsset.image && !bedAsset.errored) {
        ctx.drawImage(bedAsset.image, x, y, w, h);
        drewSprite = true;
      }
    } else if (obj.type === "tv") {
      const tvAsset = bedroomArtAssets.tv;
      if (tvAsset.loaded && tvAsset.image && !tvAsset.errored) {
        ctx.drawImage(tvAsset.image, x, y, w, h);
        drewSprite = true;
      }
    } else if (obj.type === "makeup" || obj.type === "desk") {
      const deskAsset = bedroomArtAssets.desk;
      if (deskAsset.loaded && deskAsset.image && !deskAsset.errored) {
        ctx.drawImage(deskAsset.image, x, y, w, h);
        drewSprite = true;
      }
    } else if (obj.type === "couch") {
      const couchAsset = bedroomArtAssets.couch;
      if (couchAsset.loaded && couchAsset.image && !couchAsset.errored) {
        ctx.drawImage(couchAsset.image, x, y, w, h);
        drewSprite = true;
      }
    } else if (obj.type === "car") {
      const carAsset =
        bedroomArtAssets.carBase.loaded && bedroomArtAssets.carBase.image && !bedroomArtAssets.carBase.errored
          ? bedroomArtAssets.carBase
          : bedroomArtAssets.car;
      if (carAsset.loaded && carAsset.image && !carAsset.errored) {
        ctx.drawImage(carAsset.image, x, y, w, h);
        drewSprite = true;
      }
    } else if (obj.type === "telesiege") {
      const skiAsset = destinationArtAssets.skiLiftKiosk;
      if (drawDestinationAsset(skiAsset, x, y, w, h)) {
        drewSprite = true;
      }
    } else if (obj.type === "departures") {
      const airportAsset = destinationArtAssets.airportDeparturesKiosk;
      if (drawDestinationAsset(airportAsset, x, y, w, h)) {
        drewSprite = true;
      }
    } else if (obj.type === "restaurant-door") {
      const restAsset = destinationArtAssets.restaurantEntrance;
      if (drawDestinationAsset(restAsset, x, y, w, h)) {
        drewSprite = true;
      }
    }

    if (!drewSprite) {
      ctx.fillStyle = "#b89f80";
      if (obj.type === "car") {
        ctx.fillStyle = "#9b4f4f";
      } else if (obj.type === "telesiege") {
        ctx.fillStyle = "#8ba0b8";
      } else if (obj.type === "departures") {
        ctx.fillStyle = "#6a809a";
      } else if (obj.type === "restaurant-door") {
        ctx.fillStyle = "#90726a";
      } else if (obj.type === "back-car") {
        ctx.fillStyle = "#7f7f7f";
      }
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#1f1f1f";
      ctx.font = "11px Georgia";
      ctx.fillText(obj.label, x + 4, y + 14);
    }

    if (obj.type === "car") {
      drawCharacterName("the SMART", x + w / 2, y + h + 12, {
        color: "#f1f6ff",
        outline: "rgba(42, 50, 64, 0.88)",
        bold: true
      });
    }

    if (nearbyInteractable && nearbyInteractable.id === obj.id) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 240, 196, 0.95)";
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
      ctx.strokeStyle = "rgba(96, 71, 49, 0.5)";
      ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
    }
  }
}

function drawDecorativeClutter() {
  if (state.currentWorld !== "home") {
    return;
  }
  const size = state.tileSize;
  const bedroomRegion = state.activeWorldLayout.zones?.bedroomRegion;
  if (!bedroomRegion) {
    return;
  }

  for (const pos of BEDROOM_CLUTTER_POSITIONS) {
    const clutterTileX = bedroomRegion.x + pos.x;
    const clutterTileY = bedroomRegion.y + pos.y;
    if (!isTileVisible(clutterTileX, clutterTileY, 1)) {
      continue;
    }
    const x = clutterTileX * size - state.camera.x;
    const y = clutterTileY * size - state.camera.y;
    const w = pos.w * size;
    const h = pos.h * size;
    const clutterAsset = bedroomArtAssets[pos.asset];
    if (clutterAsset?.loaded && clutterAsset.image && !clutterAsset.errored) {
      ctx.drawImage(clutterAsset.image, x, y, w, h);
    } else {
      ctx.fillStyle = "#c9b39a";
      ctx.fillRect(x + 8, y + 8, w - 16, h - 16);
    }
  }
}

function drawFlowers() {
  const size = state.tileSize;
  for (const flower of state.activeWorldLayout.flowerPickups) {
    if (!isTileVisible(flower.x, flower.y)) {
      continue;
    }
    const center = worldToScreen(flower.x * size + size / 2, flower.y * size + size / 2);
    drawRosePickup(center.x, center.y);
  }
}

function drawRosePickup(cx, cy) {
  const roseAsset = destinationArtAssets.rosePickup;
  if (drawDestinationAsset(roseAsset, cx - 24, cy - 24, 48, 48)) {
    return;
  }
  // Tiny stylized rose icon that reads clearly at world scale.
  const petal = "#d86b8f";
  const petalLight = "#eb95b2";
  const center = "#f7d89f";
  const stem = "#5a8a5d";
  const leaf = "#7aa976";

  ctx.fillStyle = stem;
  ctx.fillRect(cx - 1, cy + 2, 2, 10);

  ctx.fillStyle = leaf;
  ctx.fillRect(cx - 6, cy + 6, 4, 2);
  ctx.fillRect(cx + 2, cy + 5, 4, 2);

  ctx.fillStyle = petal;
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 2, 4, 0, Math.PI * 2);
  ctx.arc(cx + 4, cy - 2, 4, 0, Math.PI * 2);
  ctx.arc(cx - 1, cy - 6, 4, 0, Math.PI * 2);
  ctx.arc(cx + 2, cy + 1, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = petalLight;
  ctx.beginPath();
  ctx.arc(cx - 1, cy - 3, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawPets() {
  if (state.currentWorld !== "home") {
    return;
  }
  const size = state.tileSize;
  for (const pet of state.pets) {
    if (!isTileVisible(pet.x, pet.y)) {
      continue;
    }
    const tilePx = pet.x * size - state.camera.x;
    const tilePy = pet.y * size - state.camera.y;
    const anim = ensurePetAnimState(pet);
    const sprite = petSprites[pet.species];
    if (sprite?.loaded && sprite.image && !sprite.errored) {
      const sx = anim.frame * PET_FRAME_W;
      const sy = anim.movingMs > 0 ? PET_FRAME_H : 0;
      ctx.drawImage(
        sprite.image,
        sx,
        sy,
        PET_FRAME_W,
        PET_FRAME_H,
        tilePx,
        tilePy,
        PET_TILE_RENDER_SIZE,
        PET_TILE_RENDER_SIZE
      );
    } else {
      const c = worldToScreen(pet.x * size + size / 2, pet.y * size + size / 2);
      ctx.fillStyle = pet.color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    drawCharacterName(pet.name ?? "Pet", tilePx + size / 2, tilePy + size + 11, {
      color: "#f7efe2",
      outline: "rgba(53, 40, 31, 0.82)",
      bold: false
    });
  }
}

function drawCousins() {
  if (state.currentWorld !== "home") {
    return;
  }
  const poolRegion = state.activeWorldLayout.zones?.poolRegion;
  if (!poolRegion) {
    return;
  }

  const size = state.tileSize;
  const cousins = state.activeWorldLayout.cousins ?? [];
  const nowSec = performance.now() / 1000;
  const frame = Math.floor(performance.now() / (1000 / COUSIN_SWIM_FPS)) % COUSIN_SWIM_FRAMES;
  for (let i = 0; i < cousins.length; i += 1) {
    const cousin = cousins[i];
    const phase = i * 1.7;
    const xOffsetTiles = Math.sin(nowSec * COUSIN_SWAY_SPEED + phase) * COUSIN_SWAY_TILE_RANGE;
    const bobPx = Math.sin(nowSec * COUSIN_BOB_SPEED + phase) * COUSIN_BOB_PX;
    const xTile = clamp(cousin.x + xOffsetTiles, poolRegion.x, poolRegion.x + poolRegion.w - 1);
    const yTile = clamp(cousin.y, poolRegion.y, poolRegion.y + poolRegion.h - 1);
    if (!isTileVisible(xTile, yTile)) {
      continue;
    }

    const tilePx = xTile * size - state.camera.x;
    const tilePy = yTile * size - state.camera.y + bobPx;
    const sprite = cousinSwimSprites[cousin.id];
    if (sprite?.loaded && sprite.image && !sprite.errored) {
      const sx = frame * COUSIN_SWIM_FRAME_W;
      const sy = 0;
      ctx.drawImage(
        sprite.image,
        sx,
        sy,
        COUSIN_SWIM_FRAME_W,
        COUSIN_SWIM_FRAME_H,
        tilePx,
        tilePy,
        COUSIN_SWIM_RENDER_SIZE,
        COUSIN_SWIM_RENDER_SIZE
      );
    } else {
      const c = worldToScreen(xTile * size + size / 2, yTile * size + size / 2 + bobPx);
      ctx.fillStyle = cousin.color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    drawCharacterName(cousin.name ?? "Cousin", tilePx + size / 2, tilePy + size + 11, {
      color: "#e8f4ff",
      outline: "rgba(38, 45, 56, 0.84)",
      bold: false
    });
  }
}

function drawCompanion() {
  const size = state.tileSize;
  const tilePx = state.companion.x * size - state.camera.x;
  const tilePy = state.companion.y * size - state.camera.y;
  if (joeSpriteLoaded && joeSpriteSheet && !joeSpriteErrored) {
    const sx = joeAnim.frame * JOE_FRAME_W;
    const sy = joeAnim.facingRow * JOE_FRAME_H;
    ctx.drawImage(
      joeSpriteSheet,
      sx,
      sy,
      JOE_FRAME_W,
      JOE_FRAME_H,
      tilePx,
      tilePy,
      COMPANION_RENDER_SIZE_PX,
      COMPANION_RENDER_SIZE_PX
    );
  } else {
    const fallbackPx = tilePx + 9;
    const fallbackPy = tilePy + 9;
    ctx.fillStyle = characters.followNPC.color;
    ctx.fillRect(fallbackPx, fallbackPy, size - 18, size - 18);
  }

  drawCharacterName("Joe", tilePx + size / 2, tilePy + size + 12, {
    color: "#fff4e7",
    outline: "rgba(58, 42, 33, 0.85)",
    bold: false
  });
}

function drawPlayer() {
  const size = state.tileSize;
  const tilePx = state.player.x * size - state.camera.x;
  const tilePy = state.player.y * size - state.camera.y;
  if (charlySpriteLoaded && charlySpriteSheet && !charlySpriteErrored) {
    const sx = charlyAnim.frame * CHARLY_FRAME_W;
    const sy = charlyAnim.facingRow * CHARLY_FRAME_H;
    ctx.drawImage(
      charlySpriteSheet,
      sx,
      sy,
      CHARLY_FRAME_W,
      CHARLY_FRAME_H,
      tilePx,
      tilePy,
      PLAYER_RENDER_SIZE_PX,
      PLAYER_RENDER_SIZE_PX
    );
  } else {
    const fallbackPx = tilePx + 4;
    const fallbackPy = tilePy + 4;
    ctx.fillStyle = characters.player.color;
    ctx.fillRect(fallbackPx, fallbackPy, size - 8, size - 8);
  }

  drawCharacterName("Charly", tilePx + size / 2, tilePy + size + 12, {
    color: "#ff4b5f",
    outline: "rgba(90, 23, 34, 0.9)",
    bold: true
  });
}

function drawCharacterName(name, centerX, baselineY, options = {}) {
  const color = options.color ?? "#f8efe2";
  const outline = options.outline ?? "rgba(42, 32, 24, 0.8)";
  const fontWeight = options.bold ? "bold " : "";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${fontWeight}12px "VT323", "Silkscreen", "Trebuchet MS", sans-serif`;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 3;
  ctx.strokeText(name, centerX, baselineY);
  ctx.fillStyle = color;
  ctx.fillText(name, centerX, baselineY);
  ctx.textAlign = "start";
}

function drawFloaters() {
  for (const floater of state.floaters) {
    const t = clamp(floater.age / floater.life, 0, 1);
    const easeOut = 1 - (1 - t) * (1 - t);
    const bounce = Math.sin(t * Math.PI) * FLOATER_BOUNCE_PX;
    const risePx = 28 * easeOut;
    const xPx = floater.startXPx ?? floater.xPx;
    const yPx = (floater.startYPx ?? floater.yPx) - risePx - bounce * 0.25;
    const alpha = clamp(1 - t, 0, 1);
    const p = worldToScreen(xPx, yPx);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(64, 42, 30, 0.55)";
    ctx.lineWidth = 3;
    ctx.font = 'bold 16px "VT323", "Silkscreen", "Trebuchet MS", sans-serif';
    ctx.strokeText(floater.text, p.x, p.y);
    ctx.fillStyle = "#fff2da";
    ctx.fillText(floater.text, p.x, p.y);
    ctx.globalAlpha = 1;
  }
}

function drawHUD() {
  const panelX = 12;
  const panelY = 12;
  const panelW = 348;
  const panelH = 110;
  drawRoundedRect(panelX + 3, panelY + 4, panelW, panelH, 14, "rgba(50, 41, 35, 0.25)");
  drawRoundedRect(panelX, panelY, panelW, panelH, 14, "rgba(246, 237, 223, 0.86)");
  drawRoundedRect(panelX + 8, panelY + 8, 88, 30, 10, "rgba(221, 173, 191, 0.95)");

  ctx.fillStyle = "#2b2420";
  ctx.font = '20px "VT323", "Silkscreen", "Trebuchet MS", sans-serif';
  ctx.strokeStyle = "rgba(60, 45, 34, 0.45)";
  ctx.lineWidth = 2;
  ctx.strokeText(`🌹 ${state.flowers}`, panelX + 20, panelY + 30);
  ctx.fillText(`🌹 ${state.flowers}`, panelX + 20, panelY + 30);
  ctx.font = '16px "VT323", "Silkscreen", "Trebuchet MS", sans-serif';
  ctx.strokeText(`World: ${state.currentWorld}`, panelX + 14, panelY + 56);
  ctx.fillText(`World: ${state.currentWorld}`, panelX + 14, panelY + 56);
  ctx.strokeText("Move: arrows/WASD · Interact: E", panelX + 14, panelY + 78);
  ctx.fillText("Move: arrows/WASD · Interact: E", panelX + 14, panelY + 78);
  ctx.strokeText("Letters: L · Debug Grid: T", panelX + 14, panelY + 98);
  ctx.fillText("Letters: L · Debug Grid: T", panelX + 14, panelY + 98);

  const nextTarget = getNextLetterTarget();
  if (nextTarget === null) {
    ctx.strokeText("All letters unlocked", panelX + 116, panelY + 30);
    ctx.fillText("All letters unlocked", panelX + 116, panelY + 30);
  } else {
    ctx.strokeText(`${state.flowers} / ${nextTarget} for next letter`, panelX + 116, panelY + 30);
    ctx.fillText(`${state.flowers} / ${nextTarget} for next letter`, panelX + 116, panelY + 30);
  }
}

function drawInteractionHint() {
  if (state.isModalOpen) {
    return;
  }
  const interactable = getInteractableNearPlayer(state, state.activeWorldLayout);
  if (!interactable) {
    return;
  }
  const size = state.tileSize;
  const worldX = (interactable.x + interactable.w / 2) * size;
  const worldY = interactable.y * size - 12;
  const hint = worldToScreen(worldX, worldY);
  const text = "Press E";
  ctx.font = '14px "VT323", "Silkscreen", "Trebuchet MS", sans-serif';
  const textW = ctx.measureText(text).width;
  const bubbleW = textW + 18;
  const bubbleH = 20;
  const bx = hint.x - bubbleW / 2;
  const by = hint.y - bubbleH;
  drawRoundedRect(bx + 1, by + 2, bubbleW, bubbleH, 8, "rgba(61, 47, 37, 0.25)");
  drawRoundedRect(bx, by, bubbleW, bubbleH, 8, "rgba(255, 246, 228, 0.92)");
  ctx.fillStyle = "#3e2f24";
  ctx.fillText(text, bx + 9, by + 14);
}

function drawRoundedRect(x, y, w, h, radius, fillStyle) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function drawDebugOverlay() {
  if (!state.debug.showTileOverlay) {
    return;
  }

  const size = state.tileSize;
  const layout = state.activeWorldLayout;
  const startX = Math.max(0, Math.floor(state.camera.x / size) - 1);
  const endX = Math.min(layout.width - 1, Math.ceil((state.camera.x + state.viewport.w) / size) + 1);
  const startY = Math.max(0, Math.floor(state.camera.y / size) - 1);
  const endY = Math.min(layout.height - 1, Math.ceil((state.camera.y + state.viewport.h) / size) + 1);

  ctx.strokeStyle = "rgba(44, 35, 25, 0.24)";
  ctx.lineWidth = 1;
  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const px = x * size - state.camera.x;
      const py = y * size - state.camera.y;
      ctx.strokeRect(px, py, size, size);
    }
  }

  const playerTileX = state.player.x * size - state.camera.x;
  const playerTileY = state.player.y * size - state.camera.y;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#6a2f49";
  ctx.strokeRect(playerTileX, playerTileY, size, size);

  ctx.fillStyle = "rgba(255, 247, 236, 0.92)";
  ctx.fillRect(playerTileX, playerTileY - 20, 150, 16);
  ctx.fillStyle = "#3a2b23";
  ctx.font = '11px "Silkscreen", "Trebuchet MS", sans-serif';
  ctx.fillText(`Tile box: ${size}x${size}`, playerTileX + 4, playerTileY - 8);
}

function getGuideTargets() {
  if (state.currentWorld !== "home") {
    return [];
  }
  const layout = state.activeWorldLayout;
  const targets = [];
  const car = layout.interactables?.find((obj) => obj.type === "car");
  if (car) {
    targets.push({
      id: "car",
      label: "Car",
      x: car.x + car.w / 2,
      y: car.y + car.h / 2
    });
  }

  const pool = layout.zones?.poolRegion;
  if (pool) {
    targets.push({
      id: "pool",
      label: "Pool",
      x: pool.x + pool.w / 2,
      y: pool.y + pool.h / 2
    });
  }

  const bedroom = layout.zones?.bedroomRegion;
  if (bedroom) {
    targets.push({
      id: "room",
      label: "Room",
      // Bedroom doorway center tile at bottom edge.
      x: bedroom.x + Math.floor(bedroom.w / 2),
      y: bedroom.y + bedroom.h - 1
    });
  }

  return targets;
}

function isGuideTargetNearPlayer(target) {
  const tx = Math.round(target.x);
  const ty = Math.round(target.y);
  return Math.abs(state.player.x - tx) + Math.abs(state.player.y - ty) <= GUIDE_TARGET_HIDE_RADIUS_TILES;
}

function isGuideTargetOnScreen(target) {
  const size = state.tileSize;
  const px = target.x * size;
  const py = target.y * size;
  const s = worldToScreen(px, py);
  return s.x >= 0 && s.y >= 0 && s.x <= state.viewport.w && s.y <= state.viewport.h;
}

function drawGuideArrow(x, y, angleRad, label, bouncePx) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleRad);
  ctx.translate(bouncePx, 0);
  ctx.fillStyle = "rgba(56, 43, 34, 0.88)";
  ctx.beginPath();
  ctx.moveTo(-2, 0);
  ctx.lineTo(-16, -10);
  ctx.lineTo(-16, 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 236, 196, 0.98)";
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(-12, -8);
  ctx.lineTo(-12, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const labelOffsetX = Math.cos(angleRad) * 20;
  const labelOffsetY = Math.sin(angleRad) * 20;
  const lx = x - labelOffsetX;
  const ly = y - labelOffsetY;
  ctx.font = '14px "VT323", "Silkscreen", "Trebuchet MS", sans-serif';
  const labelW = ctx.measureText(label).width + 12;
  const labelH = 18;
  drawRoundedRect(lx - labelW / 2 + 1, ly - labelH / 2 + 1, labelW, labelH, 7, "rgba(55, 43, 35, 0.26)");
  drawRoundedRect(lx - labelW / 2, ly - labelH / 2, labelW, labelH, 7, "rgba(255, 244, 224, 0.94)");
  ctx.fillStyle = "#3e3026";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, lx, ly + 1);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawGuideArrows() {
  const candidates = getGuideTargets()
    .filter((target) => !isGuideTargetNearPlayer(target))
    .map((target) => {
      const tx = Math.round(target.x);
      const ty = Math.round(target.y);
      const dist = Math.abs(state.player.x - tx) + Math.abs(state.player.y - ty);
      return { ...target, dist };
    })
    .sort((a, b) => a.dist - b.dist);

  const chosen = [];
  for (const target of candidates) {
    if (chosen.length >= GUIDE_MAX_ARROWS) {
      break;
    }
    if (isGuideTargetOnScreen(target)) {
      continue;
    }
    chosen.push(target);
  }

  if (chosen.length === 0) {
    return;
  }

  const size = state.tileSize;
  const cx = state.viewport.w / 2;
  const cy = state.viewport.h / 2;
  const halfW = state.viewport.w / 2 - GUIDE_EDGE_PADDING_X;
  const halfH = state.viewport.h / 2 - (GUIDE_EDGE_PADDING_TOP + GUIDE_EDGE_PADDING_BOTTOM) / 2;
  const clampCy = (GUIDE_EDGE_PADDING_TOP + (state.viewport.h - GUIDE_EDGE_PADDING_BOTTOM)) / 2;
  const now = performance.now() / 1000;

  for (let i = 0; i < chosen.length; i += 1) {
    const target = chosen[i];
    const targetScreenX = target.x * size - state.camera.x;
    const targetScreenY = target.y * size - state.camera.y;
    const dx = targetScreenX - cx;
    const dy = targetScreenY - clampCy;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const scaleX = absDx > 0.001 ? halfW / absDx : Infinity;
    const scaleY = absDy > 0.001 ? halfH / absDy : Infinity;
    const scale = Math.min(scaleX, scaleY);
    const ax = cx + dx * scale;
    const ay = clampCy + dy * scale;
    const angle = Math.atan2(dy, dx);
    const bounce = Math.sin(now * 4.2 + i * 0.85) * GUIDE_ARROW_BOUNCE_PX;
    drawGuideArrow(ax, ay, angle, target.label, bounce);
  }
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  drawGrid();
  drawWalls();
  drawDestinationDecor();
  drawInteractables();
  drawDecorativeClutter();
  drawFlowers();
  drawPets();
  drawCousins();
  drawCompanion();
  drawPlayer();
  drawInteractionHint();
  drawDebugOverlay();
  drawFloaters();
  drawGuideArrows();
  drawHUD();
}

function gameLoop(timestamp) {
  const deltaTime = lastTimestamp ? timestamp - lastTimestamp : 16.67;
  lastTimestamp = timestamp;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

function start() {
  initCanvas();
  loadCharlySpriteSheet();
  loadJoeSpriteSheet();
  loadPetSprites();
  loadCousinSwimSprites();
  loadBedroomArtAssets();
  loadDestinationArtAssets();
  loadPimpleSceneAssets();
  loadPersistentState();

  setWorld("home", "default");
  state.companion = clampTile({ x: state.player.x - 1, y: state.player.y });
  if (state.companion.x === state.player.x && state.companion.y === state.player.y) {
    placeCompanionNearPlayer();
  }

  document.addEventListener("keydown", handleInput);
  requestAnimationFrame(gameLoop);
}

start();
