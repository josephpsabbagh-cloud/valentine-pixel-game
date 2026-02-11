function inRect(rect, x, y) {
  return !!rect && x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

function isPoolEdgeTile(poolRegion, x, y) {
  if (!poolRegion) {
    return false;
  }
  const withinRing =
    x >= poolRegion.x - 1 &&
    x <= poolRegion.x + poolRegion.w &&
    y >= poolRegion.y - 1 &&
    y <= poolRegion.y + poolRegion.h;
  return withinRing && !inRect(poolRegion, x, y);
}

export function getBackgroundTileId(world, x, y, layout) {
  if (world === "home") {
    const zones = layout?.zones;
    if (!zones) {
      return null;
    }
    if (inRect(zones.drivewayRegion, x, y)) {
      return "stone-path";
    }
    // Keep bedroom interior rendering exactly as existing floor/wall art path.
    if (inRect(zones.bedroomRegion, x, y)) {
      return null;
    }
    if (inRect(zones.outsideRegion, x, y) && isPoolEdgeTile(zones.poolRegion, x, y)) {
      return "patio";
    }
    if (inRect(zones.outsideRegion, x, y)) {
      return "grass";
    }
    return null;
  }

  if (world === "ski") {
    return "snow";
  }

  if (world === "airport") {
    return "airport-stone";
  }

  if (world === "restaurant") {
    return "restaurant-floor";
  }

  return null;
}
