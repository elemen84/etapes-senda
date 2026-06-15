const DEFAULT_STAGE_ID = "1";
const STAGE_CONFIGS = {
  "1": {
    id: "1",
    title: "Etapa 1 · Somport - Arlet",
    heading: "ETAPA 1 SOMPORT - ARLET",
    mapLabel: "Mapa de l'etapa 1",
    profileLabel: "Perfil d'altitud de Somport a Arlet",
    startName: "Somport",
    finishName: "Arlet",
    gpxUrl: "gpx/etapa-1-somport-arlet.gpx",
    localTiles: ["tiles/etapa-1/{z}/{x}/{y}.png", "tiles/etapa-1/{z}/{x}/{y}.jpg"],
  },
  "2": {
    id: "2",
    title: "Etapa 2 · Arlet - Selva de Oza",
    heading: "ETAPA 2 ARLET - SELVA DE OZA",
    mapLabel: "Mapa de l'etapa 2",
    profileLabel: "Perfil d'altitud d'Arlet a Selva de Oza",
    startName: "Arlet",
    finishName: "Selva de Oza",
    gpxUrl: "gpx/ETAPA 2 ARLET-SELVA DE OZA TRK.gpx",
    localTiles: ["tiles/etapa-2/{z}/{x}/{y}.png"],
  },
  "3": {
    id: "3",
    title: "Etapa 3 · Selva de Oza - Gabardito",
    heading: "ETAPA 3 SELVA DE OZA - GABARDITO",
    mapLabel: "Mapa de l'etapa 3",
    profileLabel: "Perfil d'altitud de Selva de Oza a Gabardito",
    startName: "Selva de Oza",
    finishName: "Gabardito",
    gpxUrl: "gpx/ETAPA 3 OZA - GABARDITO TRK.gpx",
    localTiles: ["tiles/etapa-3/{z}/{x}/{y}.png"],
  },
  "4": {
    id: "4",
    title: "Etapa 4 · Gabardito - Lizara",
    heading: "ETAPA 4 GABARDITO - LIZARA",
    mapLabel: "Mapa de l'etapa 4",
    profileLabel: "Perfil d'altitud de Gabardito a Lizara",
    startName: "Gabardito",
    finishName: "Lizara",
    gpxUrl: "gpx/ETAPA 4 GABARDITO - LIZARA TRK.gpx",
    localTiles: ["tiles/etapa-4/{z}/{x}/{y}.png"],
  },
  "5": {
    id: "5",
    title: "Etapa 5 · Lizara - Somport",
    heading: "ETAPA 5 LIZARA - SOMPORT",
    mapLabel: "Mapa de l'etapa 5",
    profileLabel: "Perfil d'altitud de Lizara a Somport",
    startName: "Lizara",
    finishName: "Somport",
    gpxUrl: "gpx/ETAPA 5 LIZARA - SOMPORT TRK.gpx",
    localTiles: ["tiles/etapa-5/{z}/{x}/{y}.png"],
  },
};

const TILE_CONFIG = {
  fallback: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  transparentTile: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
};

const ROUTE_COLOR = "#ff850b";
const SELECTED_COLOR = "#3c8528";
const SEGMENT_COLOR = "#173f25";
const PROFILE_PADDING = { top: 8, right: 4, bottom: 14, left: 4 };
const MIN_PROFILE_CHART_HEIGHT = 96;
const RESAMPLE_STEP_KM = 0.05;
const SMOOTHING_WINDOW = 9;
const ENDPOINT_HIT_RADIUS_PX = 18;

let map;
let routeLayer;
let segmentMapLayer;
let selectedMarker;
let userMarker;
let userAccuracy;
let latestUserLatLng = null;
let processedProfile = [];
let selectedIndex = 0;
let profileSvg;
let profileBox = { width: 0, height: 0 };
let profileRedrawFrame = null;
let isProfileExpanded = true;
let statusTimer = null;
let activeTileLayer = null;
let activeMapMode = null;
let tileProbePoints = [];
let activeProfilePointerId = null;
let segmentMeasurement = {
  active: false,
  startIndex: null,
  endIndex: null,
  dragEndpoint: null,
  pointerStartX: 0,
  moved: false,
};

const els = {
  appShell: document.querySelector("#appShell"),
  onlineModeButton: document.querySelector("#onlineModeButton"),
  offlineModeButton: document.querySelector("#offlineModeButton"),
  geoStatus: document.querySelector("#geoStatus"),
  locateButton: document.querySelector("#locateButton"),
  profilePanel: document.querySelector("#profilePanel"),
  sheetHandle: document.querySelector("#sheetHandle"),
  selectedKm: document.querySelector("#selectedKm"),
  selectedElevation: document.querySelector("#selectedElevation"),
  measureButton: document.querySelector("#measureButton"),
  segmentResult: document.querySelector("#segmentResult"),
  cursorKm: document.querySelector("#cursorKm"),
  totalKm: document.querySelector("#totalKm"),
  profileInteraction: document.querySelector("#profileInteraction"),
};
const currentStageId = els.appShell.dataset.stage || DEFAULT_STAGE_ID;
const stageConfig = STAGE_CONFIGS[currentStageId] || STAGE_CONFIGS[DEFAULT_STAGE_ID];
const mapModeStorageKey = `camille-stage-${stageConfig.id}-map-mode`;

init().catch((error) => {
  showStatus("No s'ha pogut carregar la ruta GPX.");
  console.error(error);
});

async function init() {
  applyStageMetadata();
  profileSvg = document.querySelector("#profileSvg");
  map = createMap();

  const routePoints = await loadGpxPoints(stageConfig.gpxUrl);
  processedProfile = buildProcessedProfile(routePoints);
  tileProbePoints = processedProfile;

  drawRoute(routePoints);
  setupMapModeSelector();
  await configureTiles(tileProbePoints);
  fitRoute();
  drawProfile();
  updateSelection(Math.floor(processedProfile.length / 2), { panMap: false });
  setupBottomSheet();
  setupSegmentMeasurementControls();
  setupProfileInteraction();
  setupProfileResizeObserver();
  setupGeolocation();

  window.addEventListener("resize", () => {
    if (!isProfileExpanded) return;
    scheduleProfileRedraw();
  });
}

function applyStageMetadata() {
  document.title = stageConfig.title;
  document.querySelector(".stage-header h1").textContent = stageConfig.heading;
  document.querySelector(".map-wrap").setAttribute("aria-label", stageConfig.mapLabel);
  document.querySelector("#profileSvg").setAttribute("aria-label", stageConfig.profileLabel);
}

function createMap() {
  return L.map("map", {
    zoomControl: true,
    attributionControl: true,
    preferCanvas: true,
  });
}

async function configureTiles(points) {
  const preference = getSavedMapModePreference();
  const onlineAvailable = await detectOnlineTileAvailability(points);

  if (preference === "offline") {
    if (await activateOfflineTiles(points)) return;
    showStatus("Mapa offline no disponible.");
    if (onlineAvailable) {
      activateOnlineTiles();
    } else {
      clearTileLayer();
    }
    return;
  }

  if (preference === "online") {
    if (onlineAvailable) {
      activateOnlineTiles();
      return;
    }
    showStatus("Sense connexió. Mostrant mapa offline.");
    if (!(await activateOfflineTiles(points))) {
      clearTileLayer();
    }
    return;
  }

  if (onlineAvailable) {
    activateOnlineTiles();
    return;
  }

  showStatus("Sense connexió. Mostrant mapa offline.");
  if (!(await activateOfflineTiles(points))) {
    showStatus("Mapa offline no disponible.");
    clearTileLayer();
  }
}

function setupMapModeSelector() {
  els.onlineModeButton.addEventListener("click", () => {
    saveMapModePreference("online");
    configureTiles(tileProbePoints);
  });

  els.offlineModeButton.addEventListener("click", () => {
    saveMapModePreference("offline");
    configureTiles(tileProbePoints);
  });
}

function activateOnlineTiles() {
  setActiveTileLayer(
    L.tileLayer(TILE_CONFIG.fallback, {
      maxZoom: 17,
      attribution: TILE_CONFIG.attribution,
    }),
    "online",
  );
}

async function activateOfflineTiles(points) {
  const localTemplate = await detectLocalTileTemplate(points);
  if (!localTemplate) return false;

  setActiveTileLayer(
    L.tileLayer(localTemplate, {
      maxZoom: 17,
      minZoom: 10,
      minNativeZoom: 12,
      maxNativeZoom: 16,
      bounds: routeLayer ? routeLayer.getBounds().pad(0.12) : undefined,
      attribution: `Tiles locals Etapa ${stageConfig.id}`,
      errorTileUrl: TILE_CONFIG.transparentTile,
    }),
    "offline",
  );
  return true;
}

function setActiveTileLayer(layer, mode) {
  clearTileLayer();
  activeTileLayer = layer.addTo(map);
  activeMapMode = mode;
  updateMapModeSelector();
}

function clearTileLayer() {
  if (activeTileLayer) {
    map.removeLayer(activeTileLayer);
  }
  activeTileLayer = null;
  activeMapMode = null;
  updateMapModeSelector();
}

function updateMapModeSelector() {
  els.onlineModeButton.classList.toggle("is-active", activeMapMode === "online");
  els.offlineModeButton.classList.toggle("is-active", activeMapMode === "offline");
  els.onlineModeButton.setAttribute("aria-pressed", String(activeMapMode === "online"));
  els.offlineModeButton.setAttribute("aria-pressed", String(activeMapMode === "offline"));
}

function getSavedMapModePreference() {
  const value = localStorage.getItem(mapModeStorageKey);
  return value === "online" || value === "offline" ? value : null;
}

function saveMapModePreference(mode) {
  localStorage.setItem(mapModeStorageKey, mode);
}

async function detectOnlineTileAvailability(points) {
  if (!navigator.onLine) return false;

  const center = points[Math.floor(points.length / 2)];
  const probeZoom = 14;
  const tile = latLonToTile(center.lat, center.lon, probeZoom);
  const url = buildTileUrl(TILE_CONFIG.fallback, tile, probeZoom);
  return imageExists(url);
}

async function detectLocalTileTemplate(points) {
  if (!stageConfig.localTiles.length) return null;

  const center = points[Math.floor(points.length / 2)];
  const probeZoom = 14;
  const tile = latLonToTile(center.lat, center.lon, probeZoom);
  const candidates = stageConfig.localTiles;

  for (const template of candidates) {
    const url = template
      .replace("{z}", probeZoom)
      .replace("{x}", tile.x)
      .replace("{y}", tile.y);
    if (await imageExists(url)) {
      return template;
    }
  }

  return null;
}

function buildTileUrl(template, tile, zoom) {
  return template
    .replace("{s}", "a")
    .replace("{z}", zoom)
    .replace("{x}", tile.x)
    .replace("{y}", tile.y);
}

function imageExists(url) {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (exists) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(exists);
    };
    const timeout = window.setTimeout(() => finish(false), 3500);
    image.onload = () => {
      finish(true);
    };
    image.onerror = () => {
      finish(false);
    };
    image.src = `${url}?probe=${Date.now()}`;
  });
}

function latLonToTile(lat, lon, zoom) {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** zoom;
  return {
    x: Math.floor(((lon + 180) / 360) * n),
    y: Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
    ),
  };
}

async function loadGpxPoints(url) {
  const response = await fetch(encodeURI(url));
  if (!response.ok) {
    throw new Error(`GPX fetch failed: ${response.status}`);
  }

  const xml = await response.text();
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const trackPoints = [...doc.querySelectorAll("trkpt")];

  return trackPoints
    .map((point) => ({
      lat: Number(point.getAttribute("lat")),
      lon: Number(point.getAttribute("lon")),
      elevation_m: Number(point.querySelector("ele")?.textContent ?? 0),
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
}

function buildProcessedProfile(points) {
  const withDistance = [];
  let cumulativeKm = 0;

  points.forEach((point, index) => {
    if (index > 0) {
      cumulativeKm += haversineKm(points[index - 1], point);
    }
    withDistance.push({ ...point, distance_km: cumulativeKm });
  });

  const resampled = resampleByDistance(withDistance, RESAMPLE_STEP_KM);
  return smoothElevation(resampled, SMOOTHING_WINDOW);
}

function resampleByDistance(points, stepKm) {
  const totalKm = points[points.length - 1].distance_km;
  const result = [];
  let sourceIndex = 1;

  for (let km = 0; km <= totalKm; km += stepKm) {
    while (sourceIndex < points.length - 1 && points[sourceIndex].distance_km < km) {
      sourceIndex += 1;
    }

    const previous = points[sourceIndex - 1];
    const next = points[sourceIndex];
    const span = Math.max(next.distance_km - previous.distance_km, 0.000001);
    const ratio = (km - previous.distance_km) / span;

    result.push({
      lat: interpolate(previous.lat, next.lat, ratio),
      lon: interpolate(previous.lon, next.lon, ratio),
      distance_km: km,
      elevation_m: interpolate(previous.elevation_m, next.elevation_m, ratio),
    });
  }

  const last = points[points.length - 1];
  result.push({
    lat: last.lat,
    lon: last.lon,
    distance_km: last.distance_km,
    elevation_m: last.elevation_m,
  });

  return result;
}

function smoothElevation(points, windowSize) {
  const half = Math.floor(windowSize / 2);
  return points.map((point, index) => {
    const start = Math.max(0, index - half);
    const end = Math.min(points.length - 1, index + half);
    let total = 0;
    let count = 0;

    for (let i = start; i <= end; i += 1) {
      total += points[i].elevation_m;
      count += 1;
    }

    return {
      ...point,
      smoothed_elevation_m: total / count,
    };
  });
}

function haversineKm(a, b) {
  const radiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(h));
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function interpolate(a, b, ratio) {
  return a + (b - a) * ratio;
}

function drawRoute(points) {
  const latLngs = points.map((point) => [point.lat, point.lon]);

  routeLayer = L.polyline(latLngs, {
    color: ROUTE_COLOR,
    weight: 6,
    opacity: 0.96,
    lineCap: "round",
    lineJoin: "round",
  }).addTo(map);

  const start = points[0];
  const finish = points[points.length - 1];
  L.marker([start.lat, start.lon], {
    icon: L.divIcon({ className: "start-marker", iconSize: [28, 28], iconAnchor: [14, 14] }),
    title: stageConfig.startName,
  }).addTo(map);
  L.marker([finish.lat, finish.lon], {
    icon: L.divIcon({ className: "finish-marker", iconSize: [28, 28], iconAnchor: [14, 14] }),
    title: stageConfig.finishName,
  }).addTo(map);

  selectedMarker = L.marker([start.lat, start.lon], {
    icon: L.divIcon({ className: "selected-marker", iconSize: [18, 18], iconAnchor: [9, 9] }),
    interactive: false,
  }).addTo(map);
}

function fitRoute() {
  map.fitBounds(routeLayer.getBounds(), {
    paddingTopLeft: [24, 24],
    paddingBottomRight: [24, 120],
    maxZoom: 14,
  });
}

function drawProfile() {
  const rect = els.profileInteraction.getBoundingClientRect();
  profileBox = {
    width: Math.max(280, Math.round(rect.width)),
    height: getDrawableProfileHeight(rect.height),
  };

  profileSvg.setAttribute("viewBox", `0 0 ${profileBox.width} ${profileBox.height}`);
  profileSvg.innerHTML = "";

  const minElevation = Math.floor(Math.min(...processedProfile.map((p) => p.smoothed_elevation_m)) / 100) * 100;
  const maxElevation = Math.ceil(Math.max(...processedProfile.map((p) => p.smoothed_elevation_m)) / 100) * 100;
  const areaPath = buildProfilePath(minElevation, maxElevation, true);
  const linePath = buildProfilePath(minElevation, maxElevation, false);

  const defs = svgElement("defs");
  const gradient = svgElement("linearGradient", {
    id: "profileFill",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1",
  });
  gradient.append(
    svgElement("stop", { offset: "0%", "stop-color": ROUTE_COLOR, "stop-opacity": "0.35" }),
    svgElement("stop", { offset: "100%", "stop-color": ROUTE_COLOR, "stop-opacity": "0.03" }),
  );
  defs.append(gradient);

  const grid = svgElement("g", { class: "grid" });
  [0.25, 0.58, 0.92].forEach((ratio) => {
    const y = PROFILE_PADDING.top + ratio * (profileBox.height - PROFILE_PADDING.top - PROFILE_PADDING.bottom);
    grid.append(svgElement("line", {
      x1: PROFILE_PADDING.left,
      y1: y,
      x2: profileBox.width - PROFILE_PADDING.right,
      y2: y,
      stroke: "#d8ddd2",
      "stroke-dasharray": "4 5",
      "stroke-width": "1",
    }));
  });

  profileSvg.append(
    defs,
    grid,
    svgElement("path", { d: areaPath, fill: "url(#profileFill)" }),
    svgElement("path", {
      d: linePath,
      fill: "none",
      stroke: ROUTE_COLOR,
      "stroke-width": "3.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }),
    svgElement("g", { id: "profileSegmentOverlay" }),
    svgElement("circle", {
      id: "profileCursorDot",
      r: "8",
      fill: "#ffffff",
      stroke: SELECTED_COLOR,
      "stroke-width": "4",
    }),
  );
  updateSegmentMeasurementDisplay();
}

function buildProfilePath(minElevation, maxElevation, closeArea) {
  const totalKm = processedProfile[processedProfile.length - 1].distance_km;
  const usableWidth = profileBox.width - PROFILE_PADDING.left - PROFILE_PADDING.right;
  const usableHeight = profileBox.height - PROFILE_PADDING.top - PROFILE_PADDING.bottom;

  const commands = processedProfile.map((point, index) => {
    const x = PROFILE_PADDING.left + (point.distance_km / totalKm) * usableWidth;
    const y =
      PROFILE_PADDING.top +
      (1 - (point.smoothed_elevation_m - minElevation) / (maxElevation - minElevation)) * usableHeight;
    return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  });

  if (closeArea) {
    commands.push(
      `L ${profileBox.width - PROFILE_PADDING.right} ${profileBox.height - PROFILE_PADDING.bottom}`,
      `L ${PROFILE_PADDING.left} ${profileBox.height - PROFILE_PADDING.bottom}`,
      "Z",
    );
  }

  return commands.join(" ");
}

function getDrawableProfileHeight(measuredHeight) {
  const roundedHeight = Math.round(measuredHeight);
  if (roundedHeight >= MIN_PROFILE_CHART_HEIGHT) {
    return roundedHeight;
  }

  if (profileBox.height >= MIN_PROFILE_CHART_HEIGHT) {
    return profileBox.height;
  }

  return MIN_PROFILE_CHART_HEIGHT;
}

function setupProfileResizeObserver() {
  if (!("ResizeObserver" in window)) return;

  const observer = new ResizeObserver(() => {
    if (!isProfileExpanded || !processedProfile.length) return;
    scheduleProfileRedraw();
  });
  observer.observe(els.profileInteraction);
}

function scheduleProfileRedraw() {
  if (profileRedrawFrame !== null) {
    cancelAnimationFrame(profileRedrawFrame);
  }

  profileRedrawFrame = requestAnimationFrame(() => {
    profileRedrawFrame = null;
    if (!isProfileExpanded || !processedProfile.length) return;
    drawProfile();
    updateSelection(selectedIndex, { panMap: false });
  });
}

function setupSegmentMeasurementControls() {
  els.measureButton.addEventListener("click", () => {
    if (segmentMeasurement.active) {
      clearSegmentMeasurement();
      return;
    }

    segmentMeasurement.active = true;
    segmentMeasurement.startIndex = null;
    segmentMeasurement.endIndex = null;
    segmentMeasurement.dragEndpoint = null;
    segmentMeasurement.moved = false;
    updateSegmentMeasurementDisplay();
  });
}

function setupProfileInteraction() {
  els.profileInteraction.addEventListener("pointerdown", (event) => {
    els.profileInteraction.setPointerCapture(event.pointerId);
    activeProfilePointerId = event.pointerId;
    if (segmentMeasurement.active) {
      handleSegmentPointerDown(event);
      return;
    }
    handleProfilePointer(event);
  });
  els.profileInteraction.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activeProfilePointerId) return;
    if (segmentMeasurement.active) {
      handleSegmentPointerMove(event);
      return;
    }
    handleProfilePointer(event);
  });
  els.profileInteraction.addEventListener("pointerup", (event) => {
    if (event.pointerId !== activeProfilePointerId) return;
    activeProfilePointerId = null;
    if (segmentMeasurement.active) {
      handleSegmentPointerUp(event);
    }
  });
  els.profileInteraction.addEventListener("pointercancel", () => {
    activeProfilePointerId = null;
    segmentMeasurement.dragEndpoint = null;
  });
}

function setupBottomSheet() {
  let startY = 0;
  let startX = 0;
  let gestureHandled = false;
  let sheetPointerId = null;

  els.sheetHandle.addEventListener("pointerdown", (event) => {
    sheetPointerId = event.pointerId;
    startY = event.clientY;
    startX = event.clientX;
    gestureHandled = false;
    els.sheetHandle.setPointerCapture(event.pointerId);
  });

  els.sheetHandle.addEventListener("pointermove", (event) => {
    if (event.pointerId !== sheetPointerId) return;

    const deltaY = event.clientY - startY;
    const deltaX = event.clientX - startX;
    if (gestureHandled || Math.abs(deltaY) < 32 || Math.abs(deltaY) < Math.abs(deltaX)) return;

    gestureHandled = true;
    setProfileExpanded(deltaY < 0);
  });

  els.sheetHandle.addEventListener("pointerup", (event) => {
    if (event.pointerId !== sheetPointerId) return;
    sheetPointerId = null;

    if (gestureHandled) return;

    const deltaY = event.clientY - startY;
    const deltaX = event.clientX - startX;

    if (Math.abs(deltaY) < 10 && Math.abs(deltaX) < 10) {
      setProfileExpanded(!isProfileExpanded);
      return;
    }

    if (deltaY > 28) {
      setProfileExpanded(false);
    } else if (deltaY < -28) {
      setProfileExpanded(true);
    }
  });

  els.sheetHandle.addEventListener("pointercancel", (event) => {
    if (event.pointerId !== sheetPointerId) return;
    sheetPointerId = null;
    gestureHandled = false;
  });

  els.profilePanel.addEventListener("transitionend", (event) => {
    if (event.propertyName !== "height" || !isProfileExpanded) return;
    scheduleProfileRedraw();
  });
}

function setProfileExpanded(expanded) {
  if (isProfileExpanded === expanded) return;

  isProfileExpanded = expanded;
  els.appShell.classList.toggle("sheet-collapsed", !expanded);
  els.profilePanel.classList.toggle("is-collapsed", !expanded);
  els.sheetHandle.setAttribute("aria-expanded", String(expanded));

  if (expanded) {
    scheduleProfileRedraw();
  }
}

function handleProfilePointer(event) {
  event.preventDefault();
  updateSelection(getProfileIndexFromPointer(event), { panMap: true });
}

function handleSegmentPointerDown(event) {
  event.preventDefault();
  const index = getProfileIndexFromPointer(event);
  segmentMeasurement.pointerStartX = event.clientX;
  segmentMeasurement.moved = false;

  if (segmentMeasurement.startIndex === null) {
    segmentMeasurement.startIndex = index;
    segmentMeasurement.endIndex = null;
    segmentMeasurement.dragEndpoint = "end";
    updateSelection(index, { panMap: true });
    updateSegmentMeasurementDisplay();
    return;
  }

  if (segmentMeasurement.endIndex === null) {
    segmentMeasurement.endIndex = index;
    segmentMeasurement.dragEndpoint = "end";
    updateSelection(index, { panMap: true });
    updateSegmentMeasurementDisplay();
    return;
  }

  const nearestEndpoint = getNearestSegmentEndpoint(index);
  if (!nearestEndpoint) {
    segmentMeasurement.dragEndpoint = null;
    handleProfilePointer(event);
    return;
  }

  segmentMeasurement.dragEndpoint = nearestEndpoint;
  updateSelection(index, { panMap: true });
  updateSegmentMeasurementDisplay();
}

function handleSegmentPointerMove(event) {
  if (!segmentMeasurement.dragEndpoint) return;
  event.preventDefault();

  const index = getProfileIndexFromPointer(event);
  if (Math.abs(event.clientX - segmentMeasurement.pointerStartX) > 3) {
    segmentMeasurement.moved = true;
  }

  if (segmentMeasurement.dragEndpoint === "start") {
    segmentMeasurement.startIndex = index;
  } else {
    segmentMeasurement.endIndex = index;
  }

  updateSelection(index, { panMap: true });
  updateSegmentMeasurementDisplay();
}

function handleSegmentPointerUp(event) {
  if (!segmentMeasurement.dragEndpoint) return;
  event.preventDefault();

  const index = getProfileIndexFromPointer(event);
  if (segmentMeasurement.dragEndpoint === "end" && segmentMeasurement.endIndex === null && segmentMeasurement.moved) {
    segmentMeasurement.endIndex = index;
  }

  if (segmentMeasurement.endIndex !== null) {
    updateSelection(index, { panMap: true });
  }

  segmentMeasurement.dragEndpoint = null;
  updateSegmentMeasurementDisplay();
}

function getProfileIndexFromPointer(event) {
  const rect = els.profileInteraction.getBoundingClientRect();
  const x = Math.min(Math.max(event.clientX - rect.left, PROFILE_PADDING.left), rect.width - PROFILE_PADDING.right);
  const ratio = (x - PROFILE_PADDING.left) / (rect.width - PROFILE_PADDING.left - PROFILE_PADDING.right);
  return Math.round(ratio * (processedProfile.length - 1));
}

function getNearestSegmentEndpoint(index) {
  const { startIndex, endIndex } = segmentMeasurement;
  if (startIndex === null || endIndex === null) return null;

  const scale = getProfileScale();
  const pointerX = profilePointCoords(processedProfile[index], scale).x;
  const startX = profilePointCoords(processedProfile[startIndex], scale).x;
  const endX = profilePointCoords(processedProfile[endIndex], scale).x;
  const startDistance = Math.abs(pointerX - startX);
  const endDistance = Math.abs(pointerX - endX);

  if (Math.min(startDistance, endDistance) > ENDPOINT_HIT_RADIUS_PX) return null;
  return startDistance <= endDistance ? "start" : "end";
}

function updateSelection(index, options = { panMap: true }) {
  selectedIndex = Math.min(Math.max(index, 0), processedProfile.length - 1);
  const point = processedProfile[selectedIndex];

  els.selectedKm.textContent = formatKm(point.distance_km);
  els.cursorKm.textContent = formatKm(point.distance_km);
  els.selectedElevation.textContent = `${Math.round(point.smoothed_elevation_m).toLocaleString("ca-ES")} m`;
  els.totalKm.textContent = formatKm(processedProfile[processedProfile.length - 1].distance_km);

  selectedMarker.setLatLng([point.lat, point.lon]);
  if (options.panMap) {
    map.panTo([point.lat, point.lon], { animate: true, duration: 0.3 });
  }

  updateProfileCursor(point);
}

function updateProfileCursor(point) {
  const { x, y } = profilePointCoords(point, getProfileScale());

  const dot = profileSvg.querySelector("#profileCursorDot");
  if (!dot) return;
  dot.setAttribute("cx", x);
  dot.setAttribute("cy", y);
}

function updateSegmentMeasurementDisplay() {
  const hasStart = segmentMeasurement.startIndex !== null;
  const hasEnd = segmentMeasurement.endIndex !== null;
  const hasSegment = hasStart && hasEnd;

  els.profilePanel.classList.toggle("is-measuring", segmentMeasurement.active);
  els.measureButton.classList.toggle("is-active", segmentMeasurement.active);
  els.measureButton.setAttribute("aria-pressed", String(segmentMeasurement.active));
  els.segmentResult.hidden = !segmentMeasurement.active;

  if (!segmentMeasurement.active) {
    els.segmentResult.textContent = "";
  } else if (!hasStart) {
    els.segmentResult.textContent = "Tria A";
  } else if (!hasEnd) {
    els.segmentResult.textContent = "Tria B";
  } else {
    const metrics = calculateSegmentMetrics(segmentMeasurement.startIndex, segmentMeasurement.endIndex);
    els.segmentResult.textContent =
      `${formatKm(metrics.distanceKm)} · +${formatMeters(metrics.positiveGainM)} · -${formatMeters(metrics.negativeLossM)} · Balanç ${formatSignedMeters(metrics.netElevationM)}`;
  }

  drawSegmentProfileOverlay();
  drawSegmentMapOverlay(hasSegment);
}

function drawSegmentProfileOverlay() {
  const overlay = profileSvg.querySelector("#profileSegmentOverlay");
  if (!overlay) return;

  overlay.innerHTML = "";
  if (!segmentMeasurement.active || segmentMeasurement.startIndex === null) return;

  const scale = getProfileScale();
  const startIndex = segmentMeasurement.startIndex;
  const endIndex = segmentMeasurement.endIndex ?? segmentMeasurement.startIndex;
  const [rangeStart, rangeEnd] = normalizeIndexRange(startIndex, endIndex);
  const startCoords = profilePointCoords(processedProfile[startIndex], scale);
  const endCoords = profilePointCoords(processedProfile[endIndex], scale);
  const highlightPath = buildProfileLinePathForRange(rangeStart, rangeEnd, scale);
  const rangeLeft = Math.min(startCoords.x, endCoords.x);
  const rangeWidth = Math.max(Math.abs(endCoords.x - startCoords.x), 2);
  const plotTop = PROFILE_PADDING.top;
  const plotBottom = profileBox.height - PROFILE_PADDING.bottom;

  overlay.append(svgElement("rect", {
    x: rangeLeft,
    y: plotTop,
    width: rangeWidth,
    height: plotBottom - plotTop,
    fill: SELECTED_COLOR,
    "fill-opacity": "0.08",
  }));

  if (highlightPath) {
    overlay.append(svgElement("path", {
      d: highlightPath,
      fill: "none",
      stroke: SEGMENT_COLOR,
      "stroke-width": "4.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }));
  }

  appendSegmentMarker(overlay, startCoords, "A", plotTop, plotBottom);
  if (segmentMeasurement.endIndex !== null) {
    appendSegmentMarker(overlay, endCoords, "B", plotTop, plotBottom);
  }
}

function appendSegmentMarker(overlay, coords, label, plotTop, plotBottom) {
  overlay.append(svgElement("line", {
    x1: coords.x,
    y1: plotTop,
    x2: coords.x,
    y2: plotBottom,
    stroke: SEGMENT_COLOR,
    "stroke-width": "1.6",
    "stroke-dasharray": "3 4",
  }));
  overlay.append(svgElement("circle", {
    cx: coords.x,
    cy: coords.y,
    r: "5.5",
    fill: "#ffffff",
    stroke: SEGMENT_COLOR,
    "stroke-width": "2.5",
  }));
  const labelElement = svgElement("text", {
    x: coords.x,
    y: Math.max(12, coords.y - 11),
    fill: SEGMENT_COLOR,
    "font-size": "10",
    "font-weight": "800",
    "text-anchor": "middle",
  });
  labelElement.textContent = label;
  overlay.append(labelElement);
}

function drawSegmentMapOverlay(hasSegment) {
  if (segmentMapLayer) {
    map.removeLayer(segmentMapLayer);
    segmentMapLayer = null;
  }
  if (!hasSegment) return;

  const [start, end] = normalizeIndexRange(segmentMeasurement.startIndex, segmentMeasurement.endIndex);
  if (start === end) return;

  const latLngs = processedProfile.slice(start, end + 1).map((point) => [point.lat, point.lon]);
  segmentMapLayer = L.polyline(latLngs, {
    color: SELECTED_COLOR,
    weight: 8,
    opacity: 0.72,
    lineCap: "round",
    lineJoin: "round",
    interactive: false,
  }).addTo(map);
}

function clearSegmentMeasurement() {
  segmentMeasurement.active = false;
  segmentMeasurement.startIndex = null;
  segmentMeasurement.endIndex = null;
  segmentMeasurement.dragEndpoint = null;
  segmentMeasurement.moved = false;
  updateSegmentMeasurementDisplay();
}

function calculateSegmentMetrics(startIndex, endIndex) {
  const [start, end] = normalizeIndexRange(startIndex, endIndex);
  const distanceKm = processedProfile[end].distance_km - processedProfile[start].distance_km;
  let positiveGainM = 0;
  let negativeLossM = 0;

  for (let i = start + 1; i <= end; i += 1) {
    const difference = processedProfile[i].smoothed_elevation_m - processedProfile[i - 1].smoothed_elevation_m;
    if (difference > 0) {
      positiveGainM += difference;
    } else {
      negativeLossM += Math.abs(difference);
    }
  }

  return {
    distanceKm,
    positiveGainM,
    negativeLossM,
    netElevationM: positiveGainM - negativeLossM,
  };
}

function normalizeIndexRange(startIndex, endIndex) {
  return [
    Math.min(startIndex, endIndex),
    Math.max(startIndex, endIndex),
  ];
}

function buildProfileLinePathForRange(startIndex, endIndex, scale) {
  return processedProfile
    .slice(startIndex, endIndex + 1)
    .map((point, offset) => {
      const { x, y } = profilePointCoords(point, scale);
      return `${offset === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function getProfileScale() {
  const minElevation = Math.floor(Math.min(...processedProfile.map((p) => p.smoothed_elevation_m)) / 100) * 100;
  const maxElevation = Math.ceil(Math.max(...processedProfile.map((p) => p.smoothed_elevation_m)) / 100) * 100;
  return {
    minElevation,
    maxElevation,
    totalKm: processedProfile[processedProfile.length - 1].distance_km,
    usableWidth: profileBox.width - PROFILE_PADDING.left - PROFILE_PADDING.right,
    usableHeight: profileBox.height - PROFILE_PADDING.top - PROFILE_PADDING.bottom,
  };
}

function profilePointCoords(point, scale) {
  return {
    x: PROFILE_PADDING.left + (point.distance_km / scale.totalKm) * scale.usableWidth,
    y:
      PROFILE_PADDING.top +
      (1 - (point.smoothed_elevation_m - scale.minElevation) / (scale.maxElevation - scale.minElevation)) *
        scale.usableHeight,
  };
}

function setupGeolocation() {
  if (!("geolocation" in navigator)) {
    showStatus("Ubicació no disponible");
    return;
  }

  navigator.geolocation.watchPosition(
    (position) => {
      latestUserLatLng = [position.coords.latitude, position.coords.longitude];
      drawUserLocation(latestUserLatLng, position.coords.accuracy);
      hideStatus();
    },
    (error) => {
      const denied = error && error.code === error.PERMISSION_DENIED;
      showStatus(denied ? "Permís d'ubicació denegat" : "Ubicació no disponible");
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 12000,
    },
  );

  els.locateButton.addEventListener("click", () => {
    if (latestUserLatLng) {
      map.setView(latestUserLatLng, Math.max(map.getZoom(), 15), { animate: true });
    } else {
      showStatus("Buscant GPS...");
    }
  });
}

function drawUserLocation(latLng, accuracy) {
  if (!userMarker) {
    userMarker = L.marker(latLng, {
      icon: L.divIcon({ className: "user-dot", iconSize: [22, 22], iconAnchor: [11, 11] }),
      interactive: false,
    }).addTo(map);
    userAccuracy = L.circle(latLng, {
      radius: accuracy || 20,
      color: "#1d9bf0",
      fillColor: "#1d9bf0",
      fillOpacity: 0.12,
      weight: 1,
      interactive: false,
    }).addTo(map);
    return;
  }

  userMarker.setLatLng(latLng);
  userAccuracy.setLatLng(latLng);
  userAccuracy.setRadius(accuracy || 20);
}

function showStatus(message) {
  window.clearTimeout(statusTimer);
  els.geoStatus.textContent = message;
  els.geoStatus.hidden = false;
  statusTimer = window.setTimeout(hideStatus, 2600);
}

function hideStatus() {
  window.clearTimeout(statusTimer);
  els.geoStatus.hidden = true;
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function formatKm(value) {
  return `${value.toLocaleString("ca-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

function formatMeters(value) {
  return `${Math.round(value).toLocaleString("ca-ES")} m`;
}

function formatSignedMeters(value) {
  const roundedValue = Math.round(value);
  const sign = roundedValue >= 0 ? "+" : "-";
  return `${sign}${Math.abs(roundedValue).toLocaleString("ca-ES")} m`;
}
