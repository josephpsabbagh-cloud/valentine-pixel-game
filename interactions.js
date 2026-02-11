// interactions.js

const TOTAL_FLOWERS_KEY = "olw_totalFlowers";
const COLLECTED_FLOWER_IDS_KEY = "olw_collectedFlowerIds";
const PETTED_PET_IDS_KEY = "olw_pettedPetIds";

export function loadJsonArray(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => typeof item === "string");
  } catch {
    return [];
  }
}

export function saveJsonArray(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

export function isPointInRect(px, py, rect) {
  return px >= rect.x && px < rect.x + rect.w && py >= rect.y && py < rect.y + rect.h;
}

function pointRectDistance(px, py, rect) {
  const minX = rect.x;
  const maxX = rect.x + rect.w - 1;
  const minY = rect.y;
  const maxY = rect.y + rect.h - 1;
  const dx = px < minX ? minX - px : px > maxX ? px - maxX : 0;
  const dy = py < minY ? minY - py : py > maxY ? py - maxY : 0;
  return dx + dy;
}

export function getInteractableNearPlayer(state, layout) {
  if (!layout || !Array.isArray(layout.interactables)) {
    return null;
  }

  let best = null;
  let bestDistance = Infinity;
  for (const interactable of layout.interactables) {
    const distance = pointRectDistance(state.player.x, state.player.y, interactable);
    if (distance === 1 && distance < bestDistance) {
      best = interactable;
      bestDistance = distance;
    }
  }
  return best;
}

function makeModalContent(interactable, options) {
  const isHomeWorld = options.currentWorld === "home";

  const map = {
    bed: {
      title: "Big Bed",
      body: "Movie nights and pimple-pop sessions happen here.",
      actions: [{ label: "Movie Night", type: "tv" }, { label: "Pimple Pop", type: "pimple" }]
    },
    tv: {
      title: "TV",
      body: "Charly sits down, smiles... then dozes off quickly.",
      actions: [{ label: "Play Movie", type: "tv" }]
    },
    couch: {
      title: "Small Couch",
      body: "A cozy little reset corner.",
      actions: []
    },
    makeup: {
      title: "Makeup / Work Station",
      body: "Charly edits brand content here.",
      actions: [{ label: "Edit Video", type: "edit-video" }]
    },
    car: {
      title: "the SMART",
      body: "Pick a destination and start the ride.",
      actions: [{ label: "Open Car Ride", type: "drive" }]
    },
    telesiege: {
      title: "Telesiege",
      body: "Ready for a slalom run?",
      actions: [{ label: "Start Slalom", type: "ski" }]
    },
    departures: {
      title: "Departures",
      body: "Open the globe and revisit your places.",
      actions: [{ label: "Open Globe", type: "globe" }]
    },
    "restaurant-door": {
      title: "Restaurant",
      body: "Date night is set.",
      actions: [{ label: "Sit Down", type: "restaurant" }]
    },
    "back-car": {
      title: "Back",
      body: isHomeWorld ? "You're already home." : "Return to home by car.",
      actions: isHomeWorld ? [] : [{ label: "Back Home", type: "back-home" }]
    }
  };

  return (
    map[interactable.type] ?? {
      title: interactable.label,
      body: "A familiar spot.",
      actions: []
    }
  );
}

export function openInteractableOverlay(interactable, uiEl, onClose, onAction, options = {}) {
  if (!uiEl) {
    return () => {};
  }

  const content = makeModalContent(interactable, options);

  uiEl.innerHTML = "";

  const overlay = document.createElement("div");
  overlay.className = "ui-overlay";

  const modal = document.createElement("section");
  modal.className = "ui-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  const title = document.createElement("h2");
  title.className = "ui-modal-title";
  title.textContent = content.title;

  const body = document.createElement("p");
  body.className = "ui-modal-body";
  body.textContent = content.body;

  const actions = document.createElement("div");
  actions.className = "ui-modal-actions";

  for (const action of content.actions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ui-button";
    button.textContent = action.label;
    button.disabled = Boolean(action.disabled);
    if (!action.disabled && typeof onAction === "function") {
      button.addEventListener("click", () => {
        close();
        onAction({
          type: action.type,
          id: interactable.id,
          destination: action.destination
        });
      });
    }
    actions.appendChild(button);
  }

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "ui-button";
  closeButton.textContent = "Close";
  actions.appendChild(closeButton);

  modal.appendChild(title);
  modal.appendChild(body);
  modal.appendChild(actions);
  overlay.appendChild(modal);
  uiEl.appendChild(overlay);

  let closed = false;
  const close = () => {
    if (closed) {
      return;
    }
    closed = true;
    document.removeEventListener("keydown", onEscKey);
    if (overlay.parentNode === uiEl) {
      uiEl.removeChild(overlay);
    }
    if (typeof onClose === "function") {
      onClose();
    }
  };

  const onEscKey = (event) => {
    if (event.key === "Escape") {
      close();
    }
  };

  closeButton.addEventListener("click", close);
  document.addEventListener("keydown", onEscKey);

  return close;
}

export function tryCollectFlower(state, layout) {
  if (!layout || !Array.isArray(layout.flowerPickups)) {
    return false;
  }

  const index = layout.flowerPickups.findIndex(
    (flower) => flower.x === state.player.x && flower.y === state.player.y
  );

  if (index === -1) {
    return false;
  }

  const [flower] = layout.flowerPickups.splice(index, 1);
  state.flowers += 1;

  if (!Array.isArray(state.collectedFlowerIds)) {
    state.collectedFlowerIds = [];
  }
  if (!state.collectedFlowerIds.includes(flower.id)) {
    state.collectedFlowerIds.push(flower.id);
  }

  if (!Array.isArray(state.floaters)) {
    state.floaters = [];
  }
  const tileSize = state.tileSize ?? 40;
  state.floaters.push({
    text: "+🌹1",
    xPx: flower.x * tileSize + tileSize / 2,
    yPx: flower.y * tileSize + tileSize / 2 - 8,
    life: 900,
    age: 0
  });

  localStorage.setItem(TOTAL_FLOWERS_KEY, String(state.flowers));
  saveJsonArray(COLLECTED_FLOWER_IDS_KEY, state.collectedFlowerIds);

  return true;
}

export function tryPetInteraction(state, pets) {
  if (!Array.isArray(pets) || pets.length === 0) {
    return false;
  }

  const adjacentPet = pets.find((pet) => {
    const distance = Math.abs(state.player.x - pet.x) + Math.abs(state.player.y - pet.y);
    return distance === 1;
  });

  if (!adjacentPet) {
    return false;
  }

  if (!Array.isArray(state.pettedPetIds)) {
    state.pettedPetIds = [];
  }
  if (state.pettedPetIds.includes(adjacentPet.id)) {
    return false;
  }

  state.pettedPetIds.push(adjacentPet.id);
  state.flowers += 2;

  if (!Array.isArray(state.floaters)) {
    state.floaters = [];
  }
  const tileSize = state.tileSize ?? 40;
  state.floaters.push({
    text: "+🌹2",
    xPx: adjacentPet.x * tileSize + tileSize / 2,
    yPx: adjacentPet.y * tileSize + tileSize / 2 - 8,
    life: 900,
    age: 0
  });

  localStorage.setItem(TOTAL_FLOWERS_KEY, String(state.flowers));
  saveJsonArray(PETTED_PET_IDS_KEY, state.pettedPetIds);

  return true;
}
