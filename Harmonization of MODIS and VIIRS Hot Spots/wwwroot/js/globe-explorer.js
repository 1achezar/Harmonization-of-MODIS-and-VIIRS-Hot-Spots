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

// ── Strict Point-In-Polygon (PIP) for Country Boundaries ─────────────────────
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
      if (pointInRing(lng, lat, rings[i])) return false; // In an inner hole
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

// ── Globe initialization & Event Handlers ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();

  populateSelects();
  updateLegendUI();

  const container    = document.getElementById('globe-container');
  const selCountry   = document.getElementById('sel-country');
  const selPalette   = document.getElementById('sel-palette');
  const btnExplore   = document.getElementById('btn-explore');
  const btnClear     = document.getElementById('btn-clear');
  const statusBox    = document.getElementById('status-box');
  const statusLoading= document.getElementById('status-loading');
  const statusResult = document.getElementById('status-result');
  const statusError  = document.getElementById('status-error');
  const resultSummary= document.getElementById('result-summary');
  const legendHex    = document.getElementById('legend-hex');

  let balkanGeoJson = null;
  let activeFires   = [];

  // ── Init Globe.gl ──────────────────────────────────────────────────────────
  const world = Globe()(container)
    .globeTileEngineUrl((x, y, l) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`)
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')

    // Natural Earth Atmosphere (no red outline)
    .atmosphereColor('#38bdf8')
    .atmosphereAltitude(0.12)

    // Seamless Country Border (Surface-Flush)
    .polygonsData([])
    .polygonCapColor(() => 'rgba(56, 189, 248, 0.08)')
    .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
    .polygonStrokeColor(() => '#38bdf8')
    .polygonAltitude(0.00015)

    // 2D Hexagonal Grid: Surface-Flush on Earth
    .hexBinPointsData([])
    .hexBinPointLat(d => d.lat)
    .hexBinPointLng(d => d.lng)
    .hexBinPointWeight(d => d.frp || 1)
    .hexBinResolution(6.4)
    .hexMargin(0.04)
    .hexTopCurvatureResolution(8)                      // Conforms smoothly to sphere
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

  // ── Load Balkan GeoJSON boundaries ─────────────────────────────────────────
  fetch('/data/balkans.geojson')
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      balkanGeoJson = data;
      if (selCountry && selCountry.value) {
        highlightCountry(selCountry.value);
      }
    })
    .catch(err => {
      console.warn('balkans.geojson fetch notice:', err);
    });

  // ── Helper: Outline Country on Globe ───────────────────────────────────────
  function highlightCountry(country) {
    if (!balkanGeoJson || !balkanGeoJson.features) return;
    try {
      const feature = balkanGeoJson.features.find(f => f.properties && f.properties.key === country);
      if (feature) {
        world.polygonsData([feature]);
      } else {
        world.polygonsData([]);
      }
    } catch (e) {
      console.warn('highlightCountry error:', e);
    }
  }

  // ── Helper: Focus on country with closer zoom ──────────────────────────────
  function zoomToCountry(country, duration = 1200) {
    if (COUNTRY_POV[country]) {
      world.pointOfView(COUNTRY_POV[country], duration);
    }
  }

  // ── Palette Change Handler ─────────────────────────────────────────────────
  if (selPalette) {
    selPalette.addEventListener('change', () => {
      currentPaletteKey = selPalette.value;
      updateLegendUI();
      // Re-apply color function to active hexagons immediately
      world.hexTopColor(d => getHexColor(d.points.length));
    });
  }

  // ── Country Dropdown Change: Zoom & Outline Immediately ────────────────────
  selCountry.addEventListener('change', () => {
    const country = selCountry.value;
    if (country) {
      world.hexBinPointsData([]);
      activeFires = [];
      statusBox.classList.add('hidden');
      legendHex.classList.add('hidden');

      zoomToCountry(country, 1200);
      highlightCountry(country);
    }
  });

  // ── Clear Selection and Reset Handler ──────────────────────────────────────
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      // Reset dropdowns
      selCountry.value = '';
      populateSelects();

      // Clear layers
      world.hexBinPointsData([]);
      world.polygonsData([]);
      activeFires = [];

      // Hide results
      statusBox.classList.add('hidden');
      legendHex.classList.add('hidden');

      // Fly camera back to Balkan Overview
      world.pointOfView(BALKAN_OVERVIEW, 1200);
    });
  }

  // ── Show Fires Button Click ───────────────────────────────────────────────
  btnExplore.addEventListener('click', async (e) => {
    e.preventDefault();

    const country   = selCountry.value;
    const yearFrom  = parseInt(document.getElementById('sel-year-from').value, 10);
    const monthFrom = parseInt(document.getElementById('sel-month-from').value, 10);
    const yearTo    = parseInt(document.getElementById('sel-year-to').value, 10);
    const monthTo   = parseInt(document.getElementById('sel-month-to').value, 10);

    if (!country) {
      showError('Please select a country from the dropdown.');
      return;
    }
    if (yearFrom > yearTo || (yearFrom === yearTo && monthFrom > monthTo)) {
      showError('Start date must be before end date.');
      return;
    }

    // UI loading state
    statusBox.classList.remove('hidden');
    statusLoading.classList.remove('hidden');
    statusLoading.style.display = 'flex';
    statusResult.classList.add('hidden');
    statusError.classList.add('hidden');
    legendHex.classList.add('hidden');
    btnExplore.disabled = true;

    // Zoom into close-up perspective and outline
    zoomToCountry(country, 1000);
    highlightCountry(country);

    try {
      const url = `/api/fires?country=${encodeURIComponent(country)}`
                + `&yearFrom=${yearFrom}&monthFrom=${monthFrom}`
                + `&yearTo=${yearTo}&monthTo=${monthTo}`;

      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP error ${res.status}`);
      }

      const fires = await res.json();

      // ── STRICT POINT-IN-POLYGON FILTER: Exclude points outside national border ──
      const countryFeature = balkanGeoJson?.features?.find(f => f.properties && f.properties.key === country);
      let insideFires = fires;
      if (countryFeature && countryFeature.geometry) {
        insideFires = fires.filter(f => isPointInGeometry(f.lng, f.lat, countryFeature.geometry));
      }

      activeFires = insideFires;

      if (!insideFires || insideFires.length === 0) {
        statusLoading.style.display = 'none';
        world.hexBinPointsData([]);
        showStatus(`No fire detections found within ${country} for this period.`);
        return;
      }

      // Render 2D Hexagons flush with surface
      world.hexBinPointsData(insideFires);
      legendHex.classList.remove('hidden');

      // Results summary
      statusLoading.style.display = 'none';
      const truncated = fires.length >= 5000 ? ' (top intensity sample)' : '';
      showStatus(`${insideFires.length.toLocaleString()} fires plotted strictly inside ${country} · ${MONTHS[monthFrom-1]} ${yearFrom} – ${MONTHS[monthTo-1]} ${yearTo}${truncated}`);

    } catch (err) {
      statusLoading.style.display = 'none';
      showError(err.message || 'Failed to fetch fire data.');
    } finally {
      btnExplore.disabled = false;
    }
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  function showStatus(msg) {
    statusResult.classList.remove('hidden');
    resultSummary.textContent = msg;
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
