function inRect(rect, x, y) {
  return !!rect && x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

export function getBackgroundTileId(world, x, y, layout) {
  if (world === "home") {
    const zones = layout?.zones;
    if (!zones) {
      return null;
    }
    if (inRect(zones.drivewayRegion, x, y)) {
      return "path";
    }
    if (inRect(zones.poolRegion, x, y)) {
      return "water";
    }
    if (inRect(zones.bedroomRegion, x, y)) {
      return "bedroom-floor";
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
