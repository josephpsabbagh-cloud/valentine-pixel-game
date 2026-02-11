// world.js
// Multi-world layouts: home + separate destination worlds.

function makeWallSet() {
  return new Set();
}

function key(x, y) {
  return `${x},${y}`;
}

function addWall(walls, wallSet, x, y, width, height) {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }
  const k = key(x, y);
  if (wallSet.has(k)) {
    return;
  }
  wallSet.add(k);
  walls.push({ x, y });
}

function addWorldEdges(walls, wallSet, width, height) {
  for (let x = 0; x < width; x += 1) {
    addWall(walls, wallSet, x, 0, width, height);
    addWall(walls, wallSet, x, height - 1, width, height);
  }
  for (let y = 1; y < height - 1; y += 1) {
    addWall(walls, wallSet, 0, y, width, height);
    addWall(walls, wallSet, width - 1, y, width, height);
  }
}

function addPerimeter(walls, wallSet, width, height, rect, gapSide = null) {
  const left = rect.x;
  const right = rect.x + rect.w - 1;
  const top = rect.y;
  const bottom = rect.y + rect.h - 1;
  const gapX = Math.floor((left + right) / 2);
  const gapY = Math.floor((top + bottom) / 2);

  for (let x = left; x <= right; x += 1) {
    if (!(gapSide === "top" && x === gapX)) {
      addWall(walls, wallSet, x, top, width, height);
    }
    if (!(gapSide === "bottom" && x === gapX)) {
      addWall(walls, wallSet, x, bottom, width, height);
    }
  }

  for (let y = top; y <= bottom; y += 1) {
    if (!(gapSide === "left" && y === gapY)) {
      addWall(walls, wallSet, left, y, width, height);
    }
    if (!(gapSide === "right" && y === gapY)) {
      addWall(walls, wallSet, right, y, width, height);
    }
  }
}

const SKI_DECOR_ITEMS = [
  { id: "ski-tree-1", type: "ski-tree", x: 6, y: 6, w: 2, h: 2 },
  { id: "ski-tree-2", type: "ski-tree", x: 29, y: 6, w: 2, h: 2 },
  { id: "ski-tree-3", type: "ski-tree", x: 31, y: 10, w: 2, h: 2 },
  { id: "ski-tree-4", type: "ski-tree", x: 5, y: 12, w: 2, h: 2 },
  { id: "ski-fence-1", type: "ski-fence", x: 11, y: 22, w: 5, h: 1 },
  { id: "ski-fence-2", type: "ski-fence", x: 20, y: 22, w: 5, h: 1 },
  { id: "ski-bank-1", type: "snowbank", x: 12, y: 7, w: 3, h: 2 },
  { id: "ski-bank-2", type: "snowbank", x: 23, y: 15, w: 3, h: 2 },
  { id: "ski-sign-1", type: "ski-sign", x: 16, y: 21, w: 2, h: 2 },
  // Emphasized placements near lift and snowbanks for visibility.
  { id: "ski-rock-1", type: "ski-rock", x: 10, y: 18, w: 2, h: 2 },
  { id: "ski-rock-2", type: "ski-rock", x: 22, y: 16, w: 2, h: 2 },
  { id: "ski-flag-1", type: "ski-flag", x: 12, y: 18, w: 1, h: 2 },
  { id: "ski-flag-2", type: "ski-flag", x: 8, y: 19, w: 1, h: 2 },
  { id: "ski-flag-3", type: "ski-flag", x: 20, y: 15, w: 1, h: 2 },
  { id: "ski-flag-4", type: "ski-flag", x: 24, y: 15, w: 1, h: 2 }
];

const AIRPORT_DECOR_ITEMS = [
  { id: "air-bench-1", type: "airport-bench", x: 7, y: 8, w: 4, h: 2 },
  { id: "air-bench-2", type: "airport-bench", x: 22, y: 8, w: 4, h: 2 },
  { id: "air-bench-3", type: "airport-bench", x: 9, y: 14, w: 4, h: 2 },
  { id: "air-cart-1", type: "airport-cart", x: 12, y: 12, w: 2, h: 2 },
  { id: "air-cart-2", type: "airport-cart", x: 20, y: 13, w: 2, h: 2 },
  { id: "air-plant-1", type: "airport-plant", x: 6, y: 6, w: 2, h: 2 },
  { id: "air-plant-2", type: "airport-plant", x: 28, y: 6, w: 2, h: 2 },
  { id: "air-barrier-1", type: "airport-barrier", x: 14, y: 12, w: 5, h: 1 },
  { id: "air-barrier-2", type: "airport-barrier", x: 14, y: 15, w: 5, h: 1 },
  // Queue/luggage grouped around departures kiosk and central walkway.
  { id: "air-rope-1", type: "airport-queue-rope", x: 11, y: 12, w: 2, h: 1 },
  { id: "air-rope-2", type: "airport-queue-rope", x: 14, y: 12, w: 2, h: 1 },
  { id: "air-luggage-1", type: "airport-luggage", x: 16, y: 10, w: 2, h: 1 },
  { id: "air-luggage-2", type: "airport-luggage", x: 19, y: 12, w: 2, h: 1 },
  { id: "air-plant-kiosk-1", type: "airport-kiosk-plant", x: 7, y: 12, w: 2, h: 2 }
];

const RESTAURANT_DECOR_ITEMS = [
  { id: "rest-table-1", type: "rest-table", x: 7, y: 7, w: 3, h: 3 },
  { id: "rest-table-2", type: "rest-table", x: 22, y: 7, w: 3, h: 3 },
  { id: "rest-table-3", type: "rest-table", x: 10, y: 12, w: 3, h: 3 },
  { id: "rest-table-4", type: "rest-table", x: 19, y: 12, w: 3, h: 3 },
  { id: "rest-plant-1", type: "rest-plant", x: 6, y: 5, w: 2, h: 2 },
  { id: "rest-plant-2", type: "rest-plant", x: 25, y: 5, w: 2, h: 2 },
  { id: "rest-candle-1", type: "rest-candle", x: 15, y: 12, w: 1, h: 1 },
  { id: "rest-rug-1", type: "rest-rug", x: 12, y: 9, w: 8, h: 2 },
  { id: "rest-frame-1", type: "rest-frame", x: 13, y: 5, w: 3, h: 1 },
  // Keep props large and central enough to be obvious.
  { id: "rest-menu-1", type: "rest-menu-board", x: 23, y: 8, w: 2, h: 1 },
  { id: "rest-window-1", type: "rest-window", x: 13, y: 4, w: 2, h: 1 },
  { id: "rest-candle-table-1", type: "rest-candle-table", x: 16, y: 13, w: 2, h: 1 }
];

function buildHomeLayout() {
  const width = 60;
  const height = 40;
  const walls = [];
  const wallSet = makeWallSet();

  const bedroomRegion = { x: 6, y: 6, w: 20, h: 15 };
  const outsideRegion = { x: 2, y: 20, w: 56, h: 19 };
  const drivewayRegion = { x: 34, y: 22, w: 12, h: 8 };
  const poolRegion = { x: 46, y: 23, w: 10, h: 8 };

  addWorldEdges(walls, wallSet, width, height);

  // Bedroom shell with a doorway at the bottom center.
  const doorGapStart = bedroomRegion.x + 9;
  const doorGapEnd = bedroomRegion.x + 11;
  for (let x = bedroomRegion.x; x < bedroomRegion.x + bedroomRegion.w; x += 1) {
    addWall(walls, wallSet, x, bedroomRegion.y, width, height);
    if (x < doorGapStart || x > doorGapEnd) {
      addWall(walls, wallSet, x, bedroomRegion.y + bedroomRegion.h - 1, width, height);
    }
  }
  for (let y = bedroomRegion.y + 1; y < bedroomRegion.y + bedroomRegion.h - 1; y += 1) {
    addWall(walls, wallSet, bedroomRegion.x, y, width, height);
    addWall(walls, wallSet, bedroomRegion.x + bedroomRegion.w - 1, y, width, height);
  }

  // Light structure for driveway + pool so outside remains open and walkable.
  for (let x = drivewayRegion.x; x < drivewayRegion.x + drivewayRegion.w; x += 1) {
    addWall(walls, wallSet, x, drivewayRegion.y, width, height);
  }
  for (let y = poolRegion.y; y < poolRegion.y + poolRegion.h; y += 1) {
    addWall(walls, wallSet, poolRegion.x, y, width, height);
  }

  const interactables = [
    { id: "bed", x: bedroomRegion.x + 4, y: bedroomRegion.y + 8, w: 6, h: 4, label: "Big Bed", type: "bed" },
    { id: "tv", x: bedroomRegion.x + 9, y: bedroomRegion.y + 1, w: 3, h: 2, label: "TV", type: "tv" },
    { id: "couch", x: bedroomRegion.x + 3, y: bedroomRegion.y + 4, w: 5, h: 3, label: "Small Couch", type: "couch" },
    { id: "makeup", x: bedroomRegion.x + 14, y: bedroomRegion.y + 5, w: 4, h: 3, label: "Makeup / Work Station", type: "makeup" },
    { id: "car", x: 38, y: 23, w: 4, h: 7, label: "the SMART", type: "car" }
  ];

  const cousins = [
    { id: "cousin-1", name: "Jonah", x: 48, y: 26, color: "#8aa5c8" },
    { id: "cousin-2", name: "Millie", x: 51, y: 26, color: "#c89393" },
    { id: "cousin-3", name: "Benji", x: 54, y: 27, color: "#9abf8f" }
  ];

  const flowerPickups = [
    { id: "flower-home-1", x: bedroomRegion.x + 3, y: bedroomRegion.y + 4 },
    { id: "flower-home-2", x: bedroomRegion.x + 11, y: bedroomRegion.y + 2 },
    { id: "flower-home-3", x: 37, y: 24 },
    { id: "flower-home-4", x: 49, y: 25 }
  ];

  return {
    name: "home",
    width,
    height,
    walls,
    interactables,
    flowerPickups,
    cousins,
    zones: {
      bedroomRegion,
      outsideRegion,
      drivewayRegion,
      poolRegion
    },
    outsideRegion,
    spawnPoints: {
      default: { x: bedroomRegion.x + 10, y: bedroomRegion.y + 7 },
      driveway: { x: 37, y: 27 }
    }
  };
}

function buildDriveLayout() {
  const width = 20;
  const height = 15;
  const walls = [];
  const wallSet = makeWallSet();
  addWorldEdges(walls, wallSet, width, height);
  return {
    name: "drive",
    width,
    height,
    walls,
    interactables: [],
    flowerPickups: [],
    spawnPoints: {
      default: { x: 10, y: 7 }
    }
  };
}

function buildSkiLayout() {
  const width = 38;
  const height = 28;
  const walls = [];
  const wallSet = makeWallSet();
  addWorldEdges(walls, wallSet, width, height);

  const slopeRegion = { x: 4, y: 4, w: 30, h: 20 };
  addPerimeter(walls, wallSet, width, height, slopeRegion, "bottom");

  const interactables = [
    { id: "telesiege", x: 8, y: 20, w: 5, h: 4, label: "Telesiege", type: "telesiege" },
    { id: "ski-back-car", x: 30, y: 22, w: 4, h: 2, label: "Back to Car", type: "back-car" }
  ];
  const decor = SKI_DECOR_ITEMS;

  const flowerPickups = [
    { id: "flower-ski-1", x: 8, y: 8 },
    { id: "flower-ski-2", x: 13, y: 10 },
    { id: "flower-ski-3", x: 18, y: 12 },
    { id: "flower-ski-4", x: 24, y: 11 },
    { id: "flower-ski-5", x: 28, y: 15 },
    { id: "flower-ski-6", x: 22, y: 18 },
    { id: "flower-ski-7", x: 14, y: 19 },
    { id: "flower-ski-8", x: 9, y: 16 }
  ];

  return {
    name: "ski",
    width,
    height,
    walls,
    interactables,
    decor,
    flowerPickups,
    zones: { slopeRegion },
    spawnPoints: {
      default: { x: 10, y: 24 },
      fromCar: { x: 10, y: 24 }
    }
  };
}

function buildAirportLayout() {
  const width = 36;
  const height = 24;
  const walls = [];
  const wallSet = makeWallSet();
  addWorldEdges(walls, wallSet, width, height);

  const terminalRegion = { x: 4, y: 4, w: 28, h: 16 };
  addPerimeter(walls, wallSet, width, height, terminalRegion, "bottom");

  const interactables = [
    { id: "departures", x: 8, y: 13, w: 5, h: 4, label: "Departures", type: "departures" },
    { id: "airport-back-car", x: 26, y: 17, w: 5, h: 2, label: "Back to Car", type: "back-car" }
  ];
  const decor = AIRPORT_DECOR_ITEMS;

  return {
    name: "airport",
    width,
    height,
    walls,
    interactables,
    decor,
    flowerPickups: [],
    zones: { terminalRegion },
    spawnPoints: {
      default: { x: 9, y: 18 },
      fromCar: { x: 9, y: 18 }
    }
  };
}

function buildRestaurantLayout() {
  const width = 34;
  const height = 22;
  const walls = [];
  const wallSet = makeWallSet();
  addWorldEdges(walls, wallSet, width, height);

  const diningRegion = { x: 4, y: 4, w: 26, h: 14 };
  addPerimeter(walls, wallSet, width, height, diningRegion, "bottom");

  const interactables = [
    { id: "restaurant-door", x: 9, y: 12, w: 5, h: 4, label: "Restaurant", type: "restaurant-door" },
    { id: "restaurant-back-car", x: 24, y: 16, w: 5, h: 2, label: "Back to Car", type: "back-car" }
  ];
  const decor = RESTAURANT_DECOR_ITEMS;

  const flowerPickups = [
    { id: "flower-rest-1", x: 8, y: 9 },
    { id: "flower-rest-2", x: 22, y: 10 },
    { id: "flower-rest-3", x: 12, y: 14 },
    { id: "flower-rest-4", x: 18, y: 15 }
  ];

  return {
    name: "restaurant",
    width,
    height,
    walls,
    interactables,
    decor,
    flowerPickups,
    zones: { diningRegion },
    spawnPoints: {
      default: { x: 9, y: 17 },
      fromCar: { x: 9, y: 17 }
    }
  };
}

const homeLayout = buildHomeLayout();
const driveLayout = buildDriveLayout();
const skiLayout = buildSkiLayout();
const airportLayout = buildAirportLayout();
const restaurantLayout = buildRestaurantLayout();

export const worldLayouts = {
  home: homeLayout,
  drive: driveLayout,
  ski: skiLayout,
  airport: airportLayout,
  restaurant: restaurantLayout
};

export function getWorldLayout(worldName) {
  return worldLayouts[worldName] ?? worldLayouts.home;
}

// Backward compatibility exports.
export const worldLayout = homeLayout;
export const zones = {
  bedroomRegion: homeLayout.zones.bedroomRegion,
  outsideRegion: homeLayout.zones.outsideRegion,
  drivewayRegion: homeLayout.zones.drivewayRegion,
  poolRegion: homeLayout.zones.poolRegion,
  skiRegion: skiLayout.zones.slopeRegion,
  airportRegion: airportLayout.zones.terminalRegion,
  restaurantRegion: restaurantLayout.zones.diningRegion
};
export const outsideRegion = homeLayout.outsideRegion;
