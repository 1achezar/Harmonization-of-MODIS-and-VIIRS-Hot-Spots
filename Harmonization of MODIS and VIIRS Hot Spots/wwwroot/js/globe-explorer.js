// ── Country center coordinates & close-up zoom altitude ─────────────────────
const COUNTRY_POV = {
  'Albania':      { lat: 41.15, lng: 20.10, alt: 0.035 },
  'Bosnia':       { lat: 44.15, lng: 17.80, alt: 0.040 },
  'Bulgaria':     { lat: 42.75, lng: 25.30, alt: 0.042 },
  'Croatia':      { lat: 45.10, lng: 15.60, alt: 0.058 },
  'Greece':       { lat: 39.00, lng: 22.80, alt: 0.070 },
  'Kosovo':       { lat: 42.60, lng: 20.90, alt: 0.020 },
  'Montenegro':   { lat: 42.70, lng: 19.30, alt: 0.024 },
  'N. Macedonia': { lat: 41.60, lng: 21.70, alt: 0.025 },
  'Romania':      { lat: 45.90, lng: 24.90, alt: 0.065 },
  'Serbia':       { lat: 44.00, lng: 20.90, alt: 0.048 },
  'Slovenia':     { lat: 46.10, lng: 14.80, alt: 0.026 },
};

const BALKAN_OVERVIEW = { lat: 42.5, lng: 21.5, alt: 0.45 };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Color Scales (Darker / deeper hue = denser fire activity) ─────────────────
const COLOR_PALETTES = {
  fire: {
    name: 'Classic Fire',
    ranks: [
      { min: 100, label: 'Mega Cluster (100+)', color: 'rgba(69, 10, 10, 0.96)', hex: '#450a0a', border: '#1c0404' },
      { min: 40,  label: 'Heavy (40–99)',      color: 'rgba(127, 29, 29, 0.94)', hex: '#7f1d1d', border: '#450a0a' },
      { min: 15,  label: 'Medium (15–39)',     color: 'rgba(185, 28, 28, 0.90)', hex: '#b91c1c', border: '#7f1d1d' },
      { min: 5,   label: 'Moderate (5–14)',    color: 'rgba(239, 68, 68, 0.85)', hex: '#ef4444', border: '#b91c1c' },
      { min: 1,   label: 'Low (1–4 fires)',    color: 'rgba(252, 165, 165, 0.80)', hex: '#fca5a5', border: '#ef4444' }
    ]
  },
  cividis: {
    name: 'Cividis (Colorblind Safe)',
    ranks: [
      { min: 100, label: 'Mega Cluster (100+)', color: 'rgba(0, 32, 77, 0.96)',   hex: '#00204d', border: '#001026' },
      { min: 40,  label: 'Heavy (40–99)',      color: 'rgba(62, 92, 122, 0.94)', hex: '#3e5c7a', border: '#00204d' },
      { min: 15,  label: 'Medium (15–39)',     color: 'rgba(123, 127, 128, 0.90)', hex: '#7b7f80', border: '#3e5c7a' },
      { min: 5,   label: 'Moderate (5–14)',    color: 'rgba(212, 177, 58, 0.85)', hex: '#d4b13a', border: '#7b7f80' },
      { min: 1,   label: 'Low (1–4 fires)',    color: 'rgba(255, 232, 56, 0.85)', hex: '#ffe838', border: '#d4b13a' }
    ]
  },
  viridis: {
    name: 'Viridis (High Contrast)',
    ranks: [
      { min: 100, label: 'Mega Cluster (100+)', color: 'rgba(68, 1, 84, 0.96)',   hex: '#440154', border: '#22002b' },
      { min: 40,  label: 'Heavy (40–99)',      color: 'rgba(59, 82, 139, 0.94)', hex: '#3b528b', border: '#440154' },
      { min: 15,  label: 'Medium (15–39)',     color: 'rgba(33, 145, 140, 0.90)', hex: '#21918c', border: '#3b528b' },
      { min: 5,   label: 'Moderate (5–14)',    color: 'rgba(94, 201, 98, 0.85)',  hex: '#5ec962', border: '#21918c' },
      { min: 1,   label: 'Low (1–4 fires)',    color: 'rgba(253, 231, 37, 0.85)', hex: '#fde725', border: '#5ec962' }
    ]
  }
};

let currentPaletteKey = 'fire';

function getHexColor(count) {
  const ranks = COLOR_PALETTES[currentPaletteKey]?.ranks || COLOR_PALETTES.fire.ranks;
  for (const rank of ranks) {
    if (count >= rank.min) return rank.color;
  }
  return ranks[ranks.length - 1].color;
}

// ── Render Legend Swatches ───────────────────────────────────────────────────
function updateLegendUI() {
  const legendItems = document.getElementById('legend-items');
  if (!legendItems) return;
  const ranks = COLOR_PALETTES[currentPaletteKey]?.ranks || COLOR_PALETTES.fire.ranks;

  legendItems.innerHTML = ranks.map(r => `
    <div class="flex items-center gap-2 text-xs text-slate-300">
      <span class="w-3.5 h-3.5 rounded-sm shrink-0" style="background:${r.hex}; border:1px solid ${r.border}"></span>
      <span>${r.label}</span>
    </div>
  `).join('');
}

// ── Populate Year & Month Selects ────────────────────────────────────────────
function populateSelects() {
  const yFrom = document.getElementById('sel-year-from');
  const yTo   = document.getElementById('sel-year-to');
  const mFrom = document.getElementById('sel-month-from');
  const mTo   = document.getElementById('sel-month-to');

  if (!yFrom || !yTo || !mFrom || !mTo) return;

  yFrom.innerHTML = '';
  yTo.innerHTML = '';
  mFrom.innerHTML = '';
  mTo.innerHTML = '';

  for (let y = 2000; y <= 2026; y++) {
    yFrom.add(new Option(y, y, y === 2024, y === 2024));
    yTo.add(new Option(y, y, y === 2026, y === 2026));
  }
  MONTHS.forEach((m, i) => {
    mFrom.add(new Option(m, i + 1, i === 0, i === 0));
    mTo.add(new Option(m, i + 1, i === 11, i === 11));
  });
}

// ── Strict Point-In-Polygon (PIP) for Custom Polygon ─────────────────────────
function isPointInCustomPolygon(lng, lat, points) {
  if (!points || points.length < 3) return true;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].lng, yi = points[i].lat;
    const xj = points[j].lng, yj = points[j].lat;
    const intersect = ((yi > lat) !== (yj > lat)) &&
                      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// ── Strict Point-In-Polygon for GeoJSON MultiPolygon (Country Presets) ────────
function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
                      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInGeometry(lng, lat, geom) {
  if (!geom) return true;
  if (geom.type === 'Polygon') {
    const rings = geom.coordinates;
    if (!pointInRing(lng, lat, rings[0])) return false;
    for (let i = 1; i < rings.length; i++) {
      if (pointInRing(lng, lat, rings[i])) return false;
    }
    return true;
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      if (pointInRing(lng, lat, poly[0])) {
        let inHole = false;
        for (let i = 1; i < poly.length; i++) {
          if (pointInRing(lng, lat, poly[i])) { inHole = true; break; }
        }
        if (!inHole) return true;
      }
    }
    return false;
  }
  return true;
}

// ── Main Initialization ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();

  populateSelects();
  updateLegendUI();

  const container        = document.getElementById('globe-container');
  const selCountry       = document.getElementById('sel-country');
  const selPalette       = document.getElementById('sel-palette');
  const btnExplore       = document.getElementById('btn-explore');
  const btnClear         = document.getElementById('btn-clear');
  const statusBox        = document.getElementById('status-box');
  const statusLoading    = document.getElementById('status-loading');
  const statusResult     = document.getElementById('status-result');
  const statusError      = document.getElementById('status-error');
  const resultSummary    = document.getElementById('result-summary');
  const legendHex        = document.getElementById('legend-hex');

  // Drawing UI elements
  const tabCustom        = document.getElementById('tab-custom');
  const tabCountry       = document.getElementById('tab-country');
  const sectionCustomDraw= document.getElementById('section-custom-draw');
  const sectionCountry   = document.getElementById('section-country');
  const btnDrawMode      = document.getElementById('btn-draw-mode');
  const btnDrawModeText  = document.getElementById('btn-draw-mode-text');
  const btnFinishDraw    = document.getElementById('btn-finish-draw');
  const btnUndoDraw      = document.getElementById('btn-undo-draw');
  const btnClearDraw     = document.getElementById('btn-clear-draw');
  const badgePointCount  = document.getElementById('badge-point-count');
  const drawingBanner    = document.getElementById('drawing-banner');
  const bannerPointCount = document.getElementById('banner-point-count');
  const bannerBtnFinish  = document.getElementById('banner-btn-finish');
  const bannerBtnUndo    = document.getElementById('banner-btn-undo');
  const bannerBtnCancel  = document.getElementById('banner-btn-cancel');

  let balkanGeoJson      = null;
  let activeMode         = 'custom'; // 'custom' | 'country'
  let isDrawing          = false;
  let polygonPoints      = [];       // Array of { lat, lng }
  let isPolygonFinished  = false;
  let draggedVertexIndex = null;

  // ── Init Globe.gl ──────────────────────────────────────────────────────────
  const world = Globe()(container)
    .globeTileEngineUrl((x, y, l) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`)
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')

    // Atmosphere
    .atmosphereColor('#38bdf8')
    .atmosphereAltitude(0.12)

    // Polygons layer: Semi-transparent fill + boundary stroke
    .polygonsData([])
    .polygonCapColor(() => 'rgba(56, 189, 248, 0.22)')
    .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
    .polygonStrokeColor(() => '#38bdf8')
    .polygonAltitude(0.0002)

    // Paths layer: Visible lines connecting points while drawing & boundary outline
    .pathsData([])
    .pathPoints(d => d)
    .pathPointLat(p => p.lat)
    .pathPointLng(p => p.lng)
    .pathColor(() => '#38bdf8')
    .pathStroke(2.8)
    .pathPointAlt(() => 0.00028)

    // HTML Elements layer: Draggable vertex handles at each polygon point
    .htmlElementsData([])
    .htmlLat(d => d.lat)
    .htmlLng(d => d.lng)
    .htmlAltitude(0.00035)
    .htmlElement(d => createVertexElement(d))

    // 2D Hexagonal Grid: Surface-Flush on Earth
    .hexBinPointsData([])
    .hexBinPointLat(d => d.lat)
    .hexBinPointLng(d => d.lng)
    .hexBinPointWeight(d => d.frp || 1)
    .hexBinResolution(6.4)
    .hexMargin(0.04)
    .hexTopCurvatureResolution(8)                      // Smoothly curves over sphere
    .hexTopColor(d => getHexColor(d.points.length))    // Dynamic color ramp
    .hexSideColor(() => 'rgba(0, 0, 0, 0)')             // 0 sides = pure flat 2D skin
    .hexAltitude(0.0002)                               // Exact same level as earth surface
    .hexTransitionDuration(400)
    .hexLabel(d => `
      <div style="
        background: rgba(6, 11, 25, 0.95);
        border: 1px solid rgba(239, 68, 68, 0.5);
        padding: 9px 13px;
        border-radius: 10px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: #cbd5e1;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.85);">
        <div style="font-weight: 700; font-size: 12px; color: #f87171; margin-bottom: 4px;">
          ⬡ Wildfire Surface Cluster
        </div>
        Fires in Cell: <span style="color:#fff; font-weight:700;">${d.points.length.toLocaleString()}</span><br/>
        Total FRP: <span style="color:#f87171; font-weight:700;">${d.sumWeight.toFixed(1)} MW</span><br/>
        Mean FRP: <span style="color:#fff;">${(d.sumWeight / d.points.length).toFixed(1)} MW</span>
      </div>`);

  world.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if (world.globeMaterial()) {
    world.globeMaterial().bumpScale = 1.0;
  }

  const controls = world.controls();
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance   = 100.05;
  controls.maxDistance   = 500;

  // Initial view centered over the Balkans
  world.pointOfView(BALKAN_OVERVIEW, 0);

  window.addEventListener('resize', () => {
    world.width(window.innerWidth);
    world.height(window.innerHeight);
  });

  // ── Screen coordinate to Geographic Lat/Lng converter ──────────────────────
  function screenToLatLong(clientX, clientY) {
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (typeof world.toGlobeCoords === 'function') {
      const c = world.toGlobeCoords(x, y);
      if (c && !isNaN(c.lat) && !isNaN(c.lng)) return c;
    }

    // Mathematical Raycaster Fallback on Earth Sphere of radius 100
    try {
      if (typeof THREE !== 'undefined' && world.camera) {
        const camera = world.camera();
        const mouse = new THREE.Vector2(
          (x / rect.width) * 2 - 1,
          -(y / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 100);
        const target = new THREE.Vector3();
        if (raycaster.ray.intersectSphere(sphere, target)) {
          return world.toGeoCoords(target);
        }
      }
    } catch (e) {
      console.warn('Raycaster calculation notice:', e);
    }
    return null;
  }

  // ── Create Interactive Vertex DOM Marker ───────────────────────────────────
  function createVertexElement(d) {
    const el = document.createElement('div');
    el.className = 'vertex-handle' + (d.index === 0 ? ' vertex-start' : '');
    el.dataset.index = d.index;
    el.title = (d.index === 0 && isDrawing && polygonPoints.length >= 3)
      ? 'Click to close polygon'
      : `Point ${d.index + 1} (Drag to move)`;

    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();

      // Clicking first vertex while drawing closes the polygon
      if (isDrawing && d.index === 0 && polygonPoints.length >= 3) {
        finishSelection();
        return;
      }

      // Otherwise start dragging this vertex
      startDraggingVertex(d.index, e);
    });

    return el;
  }

  // ── Vertex Dragging Logic ──────────────────────────────────────────────────
  function startDraggingVertex(index, e) {
    draggedVertexIndex = index;
    controls.enabled = false; // Disable globe orbit while dragging vertex

    function onPointerMove(moveEvent) {
      if (draggedVertexIndex === null) return;
      const coords = screenToLatLong(moveEvent.clientX, moveEvent.clientY);
      if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) {
        polygonPoints[draggedVertexIndex].lat = Number(coords.lat.toFixed(4));
        polygonPoints[draggedVertexIndex].lng = Number(coords.lng.toFixed(4));
        renderPolygonLayers(false); // fast re-render while dragging
      }
    }

    function onPointerUp() {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      draggedVertexIndex = null;
      controls.enabled = true; // Re-enable globe orbit

      renderPolygonLayers(true); // full update

      // If polygon was already completed, re-query/filter fires dynamically!
      if (isPolygonFinished && polygonPoints.length >= 3) {
        queryFiresForArea();
      }
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  // ── Render Polygon, Paths, and Vertex Markers ──────────────────────────────
  function renderPolygonLayers(updateVertices = true) {
    if (polygonPoints.length === 0) {
      world.pathsData([]);
      world.polygonsData([]);
      if (updateVertices) world.htmlElementsData([]);
      return;
    }

    // Paths: connecting lines
    if (isPolygonFinished && polygonPoints.length >= 3) {
      // Closed loop line
      world.pathsData([[...polygonPoints, polygonPoints[0]]]);

      // Semi-transparent GeoJSON polygon fill
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[...polygonPoints.map(p => [p.lng, p.lat]), [polygonPoints[0].lng, polygonPoints[0].lat]]]
        }
      };
      world.polygonsData([feature]);
    } else {
      // Open drawing path
      world.pathsData([polygonPoints]);
      world.polygonsData([]);
    }

    // Vertex handles
    if (updateVertices) {
      world.htmlElementsData(polygonPoints.map((p, i) => ({ lat: p.lat, lng: p.lng, index: i })));
    }
  }

  // ── Update Drawing UI States & Badges ──────────────────────────────────────
  function updateDrawUI() {
    const count = polygonPoints.length;
    badgePointCount.textContent  = `${count} point${count === 1 ? '' : 's'}`;
    bannerPointCount.textContent = `${count}`;

    btnFinishDraw.disabled   = count < 3;
    bannerBtnFinish.disabled = count < 3;
    btnUndoDraw.disabled     = count === 0;
    bannerBtnUndo.disabled   = count === 0;
    btnClearDraw.disabled    = count === 0;

    if (isDrawing) {
      btnDrawMode.classList.remove('from-sky-600', 'to-cyan-600');
      btnDrawMode.classList.add('from-amber-600', 'to-orange-600');
      btnDrawModeText.textContent = 'Drawing Active (Click Map)';
      drawingBanner.classList.remove('hidden');
    } else {
      btnDrawMode.classList.remove('from-amber-600', 'to-orange-600');
      btnDrawMode.classList.add('from-sky-600', 'to-cyan-600');
      btnDrawModeText.textContent = isPolygonFinished ? 'Redraw Custom Area' : 'Start Drawing on Map';
      drawingBanner.classList.add('hidden');
    }
  }

  // ── Finish Selection ───────────────────────────────────────────────────────
  function finishSelection() {
    if (polygonPoints.length < 3) {
      showError('Please click at least 3 points on the map to define a closed geographic area.');
      return;
    }
    isDrawing = false;
    isPolygonFinished = true;
    renderPolygonLayers(true);
    updateDrawUI();

    // Dynamically query and filter fires immediately for the selected polygon!
    queryFiresForArea();
  }

  // ── Undo Last Point ────────────────────────────────────────────────────────
  function undoPoint() {
    if (polygonPoints.length === 0) return;
    polygonPoints.pop();
    isPolygonFinished = false;
    renderPolygonLayers(true);
    updateDrawUI();
    if (polygonPoints.length < 3) {
      world.hexBinPointsData([]);
    }
  }

  // ── Clear Custom Area ──────────────────────────────────────────────────────
  function clearCustomArea() {
    polygonPoints = [];
    isPolygonFinished = false;
    isDrawing = false;
    renderPolygonLayers(true);
    world.hexBinPointsData([]);
    updateDrawUI();
    statusBox.classList.add('hidden');
    legendHex.classList.add('hidden');
  }

  // ── Toggle Drawing Mode ────────────────────────────────────────────────────
  function toggleDrawMode() {
    isDrawing = !isDrawing;
    if (isDrawing) {
      activeMode = 'custom';
      // If was previously finished and starting anew:
      if (isPolygonFinished) {
        polygonPoints = [];
        isPolygonFinished = false;
        renderPolygonLayers(true);
        world.hexBinPointsData([]);
      }
    }
    updateDrawUI();
  }

  // ── Globe Click Handler: Add Vertex Points ─────────────────────────────────
  world.onGlobeClick(({ lat, lng }, event) => {
    if (!isDrawing || isPolygonFinished) return;
    if (draggedVertexIndex !== null) return;

    // If clicked near starting point when >= 3 points, close polygon!
    if (polygonPoints.length >= 3) {
      const p0 = polygonPoints[0];
      const dLat = Math.abs(lat - p0.lat);
      const dLng = Math.abs(lng - p0.lng);
      if (dLat < 0.35 && dLng < 0.35) {
        finishSelection();
        return;
      }
    }

    // Add new point (lat/lng geographic coordinates)
    polygonPoints.push({
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4))
    });

    renderPolygonLayers(true);
    updateDrawUI();
  });

  // ── Tab Switchers: Custom Area vs Country Preset ───────────────────────────
  tabCustom.addEventListener('click', () => {
    activeMode = 'custom';
    tabCustom.classList.add('bg-sky-500/20', 'text-sky-300', 'border', 'border-sky-500/40');
    tabCustom.classList.remove('text-slate-400');
    tabCountry.classList.remove('bg-sky-500/20', 'text-sky-300', 'border', 'border-sky-500/40');
    tabCountry.classList.add('text-slate-400');

    sectionCustomDraw.classList.remove('hidden');
    sectionCountry.classList.add('hidden');

    // Restore custom area layers
    renderPolygonLayers(true);
  });

  tabCountry.addEventListener('click', () => {
    activeMode = 'country';
    tabCountry.classList.add('bg-sky-500/20', 'text-sky-300', 'border', 'border-sky-500/40');
    tabCountry.classList.remove('text-slate-400');
    tabCustom.classList.remove('bg-sky-500/20', 'text-sky-300', 'border', 'border-sky-500/40');
    tabCustom.classList.add('text-slate-400');

    sectionCountry.classList.remove('hidden');
    sectionCustomDraw.classList.add('hidden');

    // Exit drawing mode if open
    if (isDrawing) {
      isDrawing = false;
      updateDrawUI();
    }
  });

  // ── Drawing Control Event Listeners ────────────────────────────────────────
  btnDrawMode.addEventListener('click', toggleDrawMode);
  btnFinishDraw.addEventListener('click', finishSelection);
  bannerBtnFinish.addEventListener('click', finishSelection);
  btnUndoDraw.addEventListener('click', undoPoint);
  bannerBtnUndo.addEventListener('click', undoPoint);
  btnClearDraw.addEventListener('click', clearCustomArea);
  bannerBtnCancel.addEventListener('click', () => {
    isDrawing = false;
    updateDrawUI();
  });

  // ── Palette Change Handler ─────────────────────────────────────────────────
  selPalette.addEventListener('change', () => {
    currentPaletteKey = selPalette.value;
    updateLegendUI();
    world.hexTopColor(d => getHexColor(d.points.length));
  });

  // ── Load Balkan GeoJSON boundaries (for Country mode) ──────────────────────
  fetch('/data/balkans.geojson')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      balkanGeoJson = data;
    })
    .catch(err => {
      console.warn('balkans.geojson notice:', err);
    });

  // ── Country Dropdown Change ────────────────────────────────────────────────
  selCountry.addEventListener('change', () => {
    const country = selCountry.value;
    if (country) {
      world.hexBinPointsData([]);
      world.pathsData([]);
      statusBox.classList.add('hidden');
      legendHex.classList.add('hidden');

      if (COUNTRY_POV[country]) {
        world.pointOfView(COUNTRY_POV[country], 1200);
      }

      if (balkanGeoJson && balkanGeoJson.features) {
        const feature = balkanGeoJson.features.find(f => f.properties && f.properties.key === country);
        if (feature) world.polygonsData([feature]);
      }
    }
  });

  // ── Clear Selection and Reset Handler ──────────────────────────────────────
  btnClear.addEventListener('click', () => {
    clearCustomArea();
    selCountry.value = '';
    populateSelects();

    world.hexBinPointsData([]);
    world.polygonsData([]);
    world.pathsData([]);
    world.htmlElementsData([]);

    statusBox.classList.add('hidden');
    legendHex.classList.add('hidden');

    world.pointOfView(BALKAN_OVERVIEW, 1200);
  });

  // ── Query & Filter Fires for Active Mode ───────────────────────────────────
  async function queryFiresForArea() {
    const yearFrom  = parseInt(document.getElementById('sel-year-from').value, 10);
    const monthFrom = parseInt(document.getElementById('sel-month-from').value, 10);
    const yearTo    = parseInt(document.getElementById('sel-year-to').value, 10);
    const monthTo   = parseInt(document.getElementById('sel-month-to').value, 10);

    if (yearFrom > yearTo || (yearFrom === yearTo && monthFrom > monthTo)) {
      showError('Start date must be before end date.');
      return;
    }

    let url = `/api/fires?yearFrom=${yearFrom}&monthFrom=${monthFrom}&yearTo=${yearTo}&monthTo=${monthTo}`;

    if (activeMode === 'custom') {
      if (polygonPoints.length < 3) {
        showError('Please draw and finish a polygon area on the map first.');
        return;
      }
      // Calculate geographic bounding box of custom polygon
      const lats = polygonPoints.map(p => p.lat);
      const lngs = polygonPoints.map(p => p.lng);
      const latMin = Math.min(...lats);
      const latMax = Math.max(...lats);
      const lngMin = Math.min(...lngs);
      const lngMax = Math.max(...lngs);

      url += `&latMin=${latMin}&latMax=${latMax}&lngMin=${lngMin}&lngMax=${lngMax}`;
    } else {
      const country = selCountry.value;
      if (!country) {
        showError('Please select a country from the dropdown or switch to Draw Area mode.');
        return;
      }
      url += `&country=${encodeURIComponent(country)}`;
    }

    // UI loading state
    statusBox.classList.remove('hidden');
    statusLoading.classList.remove('hidden');
    statusLoading.style.display = 'flex';
    statusResult.classList.add('hidden');
    statusError.classList.add('hidden');
    legendHex.classList.add('hidden');
    btnExplore.disabled = true;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
      }

      const fires = await res.json();
      let insideFires = fires;

      // ── STRICT POINT-IN-POLYGON (PIP) FILTERING ────────────────────────────
      if (activeMode === 'custom') {
        insideFires = fires.filter(f => isPointInCustomPolygon(f.lng, f.lat, polygonPoints));
      } else {
        const country = selCountry.value;
        const countryFeature = balkanGeoJson?.features?.find(f => f.properties && f.properties.key === country);
        if (countryFeature && countryFeature.geometry) {
          insideFires = fires.filter(f => isPointInGeometry(f.lng, f.lat, countryFeature.geometry));
        }
      }

      statusLoading.style.display = 'none';

      if (!insideFires || insideFires.length === 0) {
        world.hexBinPointsData([]);
        showStatus(`No fire detections found within the selected ${activeMode === 'custom' ? 'custom area' : selCountry.value} for this period.`);
        return;
      }

      // Render 2D Hexagonal outerlayer strictly within selection
      world.hexBinPointsData(insideFires);
      legendHex.classList.remove('hidden');

      // Statistics calculations
      const totalFires = insideFires.length;
      const totalFRP = insideFires.reduce((sum, f) => sum + (f.frp || 0), 0);
      const avgFRP = totalFRP / totalFires;

      const areaDesc = activeMode === 'custom'
        ? `Custom Boundary (${polygonPoints.length} vertices)`
        : selCountry.value;

      showStatus(`
        <div class="space-y-1">
          <div class="font-bold text-white flex items-center justify-between">
            <span>🔥 ${totalFires.toLocaleString()} Fires Detected</span>
            <span class="text-sky-400 font-mono text-[10px]">${areaDesc}</span>
          </div>
          <div class="text-[11px] text-slate-400">
            Total FRP: <span class="text-rose-400 font-semibold">${totalFRP.toFixed(1)} MW</span> · 
            Avg FRP: <span class="text-white">${avgFRP.toFixed(1)} MW</span>
          </div>
          <div class="text-[10px] text-slate-500">
            ${MONTHS[monthFrom-1]} ${yearFrom} – ${MONTHS[monthTo-1]} ${yearTo}
          </div>
        </div>
      `);

    } catch (err) {
      statusLoading.style.display = 'none';
      showError(err.message || 'Failed to query fire data.');
    } finally {
      btnExplore.disabled = false;
    }
  }

  // Explore button triggers query
  btnExplore.addEventListener('click', (e) => {
    e.preventDefault();
    queryFiresForArea();
  });

  // ── Status Helpers ─────────────────────────────────────────────────────────
  function showStatus(html) {
    statusResult.classList.remove('hidden');
    resultSummary.innerHTML = html;
    statusError.classList.add('hidden');
  }

  function showError(msg) {
    statusBox.classList.remove('hidden');
    statusError.classList.remove('hidden');
    statusError.textContent = '⚠ ' + msg;
    statusResult.classList.add('hidden');
    statusLoading.style.display = 'none';
  }
});
