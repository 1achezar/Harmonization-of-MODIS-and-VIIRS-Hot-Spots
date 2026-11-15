// ── Country center coordinates & close-up zoom altitude ─────────────────────
const COUNTRY_POV = {
  'Albania':      { lat: 41.15, lng: 20.10, alt: 0.11 },
  'Bosnia':       { lat: 44.00, lng: 17.80, alt: 0.12 },
  'Bulgaria':     { lat: 42.75, lng: 25.40, alt: 0.13 },
  'Croatia':      { lat: 45.10, lng: 15.60, alt: 0.16 },
  'Greece':       { lat: 38.80, lng: 23.00, alt: 0.20 },
  'Kosovo':       { lat: 42.60, lng: 20.90, alt: 0.07 },
  'Montenegro':   { lat: 42.70, lng: 19.30, alt: 0.08 },
  'N. Macedonia': { lat: 41.60, lng: 21.70, alt: 0.08 },
  'Romania':      { lat: 45.90, lng: 24.90, alt: 0.18 },
  'Serbia':       { lat: 44.00, lng: 20.90, alt: 0.14 },
  'Slovenia':     { lat: 46.10, lng: 14.80, alt: 0.08 },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Populate year & month dropdowns ──────────────────────────────────────────
function populateSelects() {
  const yFrom = document.getElementById('sel-year-from');
  const yTo   = document.getElementById('sel-year-to');
  const mFrom = document.getElementById('sel-month-from');
  const mTo   = document.getElementById('sel-month-to');

  for (let y = 2000; y <= 2026; y++) {
    yFrom.add(new Option(y, y, y === 2020, y === 2020));
    yTo.add(new Option(y, y, y === 2026, y === 2026));
  }
  MONTHS.forEach((m, i) => {
    mFrom.add(new Option(m, i + 1, i === 0, i === 0));
    mTo.add(new Option(m, i + 1, i === 11, i === 11));
  });
}

// ── Extract rings for seamless path lines ───────────────────────────────────
function extractBoundaryPaths(feature) {
  if (!feature || !feature.geometry) return [];
  const geom = feature.geometry;
  const paths = [];

  if (geom.type === 'Polygon') {
    geom.coordinates.forEach(ring => {
      // Globe.gl path expects array of [lat, lng]
      paths.push(ring.map(([lng, lat]) => [lat, lng]));
    });
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach(poly => {
      poly.forEach(ring => {
        paths.push(ring.map(([lng, lat]) => [lat, lng]));
      });
    });
  }
  return paths;
}

// ── Globe initialization & Event Handlers ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();

  populateSelects();

  const container    = document.getElementById('globe-container');
  const selCountry   = document.getElementById('sel-country');
  const btnExplore   = document.getElementById('btn-explore');
  const statusBox    = document.getElementById('status-box');
  const statusLoading= document.getElementById('status-loading');
  const statusResult = document.getElementById('status-result');
  const statusError  = document.getElementById('status-error');
  const resultSummary= document.getElementById('result-summary');
  const legend       = document.getElementById('legend');

  let balkanGeoJson = null;

  // ── Init Globe.gl ──────────────────────────────────────────────────────────
  const world = Globe()(container)
    .globeTileEngineUrl((x, y, l) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`)
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')

    // ── Natural Earth Atmospheric Glow (soft realistic sky-blue, NOT red) ──
    .atmosphereColor('#38bdf8')
    .atmosphereAltitude(0.12)

    // ── Selected Country Translucent Fill (polygons layer) ──
    .polygonsData([])
    .polygonGeoJsonGeometry(d => d.geometry)
    .polygonCapColor(() => 'rgba(56, 189, 248, 0.07)')
    .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
    .polygonStrokeColor(() => 'rgba(0, 0, 0, 0)')
    .polygonAltitude(0.005)

    // ── Selected Country Seamless Border Line (paths layer) ──
    .pathsData([])
    .pathPoints(d => d)
    .pathColor(() => '#38bdf8')
    .pathStroke(2.0)
    .pathAltitude(0.008)

    // ── Wildfire Thermal Points Layer (red dots) ──
    .pointsData([])
    .pointLat('lat')
    .pointLng('lng')
    .pointColor('color')
    .pointAltitude('alt')
    .pointRadius('radius')
    .pointResolution(14)
    .pointLabel(d => `
      <div style="
        background: rgba(6, 11, 25, 0.96);
        border: 1px solid rgba(239, 68, 68, 0.6);
        padding: 9px 12px;
        border-radius: 10px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: #cbd5e1;
        min-width: 175px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.8);">
        <div style="font-weight: 700; font-size: 12px; color: #f87171; margin-bottom: 5px;">
          🔥 Wildfire Detection
        </div>
        Coords: ${d.lat.toFixed(3)}°N, ${d.lng.toFixed(3)}°E<br/>
        FRP: <span style="color:#fff; font-weight:600;">${d.frp.toFixed(1)} MW</span><br/>
        Period: <span style="color:#fff;">${MONTHS[d.month - 1]} ${d.year}</span>
      </div>`);

  // Crisp Retina / High-DPI rendering
  world.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  world.globeMaterial().bumpScale = 10;

  const controls = world.controls();
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance   = 101;
  controls.maxDistance   = 500;

  // Initial view centered over the Balkans
  world.pointOfView({ lat: 42.5, lng: 23.0, altitude: 0.55 }, 0);

  window.addEventListener('resize', () => {
    world.width(window.innerWidth);
    world.height(window.innerHeight);
  });

  // ── Load Balkan GeoJSON boundaries ─────────────────────────────────────────
  fetch('/data/balkans.geojson')
    .then(res => res.json())
    .then(data => {
      balkanGeoJson = data;
    })
    .catch(err => {
      console.warn('Failed to load balkans.geojson:', err);
    });

  // ── Helper: Focus on country & outline it ──────────────────────────────────
  function selectAndHighlightCountry(country, duration = 1200) {
    if (!country) return;

    // 1. Zoom into a dramatic close-up view of the country
    if (COUNTRY_POV[country]) {
      world.pointOfView(COUNTRY_POV[country], duration);
    }

    // 2. Outline country with a seamless border and translucent cap
    if (balkanGeoJson && balkanGeoJson.features) {
      const feature = balkanGeoJson.features.find(f => f.properties.key === country);
      if (feature) {
        world.polygonsData([feature]);
        const paths = extractBoundaryPaths(feature);
        world.pathsData(paths);
      } else {
        world.polygonsData([]);
        world.pathsData([]);
      }
    }
  }

  // ── Country Dropdown Change: Zoom & Outline Immediately ────────────────────
  selCountry.addEventListener('change', () => {
    const country = selCountry.value;
    if (country) {
      // Clear previous fire points and status
      world.pointsData([]);
      statusBox.classList.add('hidden');
      legend.classList.add('hidden');

      selectAndHighlightCountry(country, 1300);
    }
  });

  // ── Show Fires Button Click ───────────────────────────────────────────────
  btnExplore.addEventListener('click', async () => {
    const country   = selCountry.value;
    const yearFrom  = parseInt(document.getElementById('sel-year-from').value);
    const monthFrom = parseInt(document.getElementById('sel-month-from').value);
    const yearTo    = parseInt(document.getElementById('sel-year-to').value);
    const monthTo   = parseInt(document.getElementById('sel-month-to').value);

    if (!country) {
      showError('Please select a country.');
      return;
    }
    if (yearFrom > yearTo || (yearFrom === yearTo && monthFrom > monthTo)) {
      showError('Start date must be before end date.');
      return;
    }

    // Show loading state
    statusBox.classList.remove('hidden');
    statusLoading.classList.remove('hidden');
    statusLoading.style.display = 'flex';
    statusResult.classList.add('hidden');
    statusError.classList.add('hidden');
    legend.classList.add('hidden');
    btnExplore.disabled = true;

    // Ensure country is highlighted & zoomed
    selectAndHighlightCountry(country, 1000);

    try {
      const url = `/api/fires?country=${encodeURIComponent(country)}`
                + `&yearFrom=${yearFrom}&monthFrom=${monthFrom}`
                + `&yearTo=${yearTo}&monthTo=${monthTo}`;

      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const fires = await res.json();

      if (fires.length === 0) {
        statusLoading.style.display = 'none';
        world.pointsData([]);
        showStatus(`No fire detections found for ${country} in this period.`);
        return;
      }

      // Map fire data to red 3D thermal dots
      const maxFrp = Math.max(...fires.map(f => f.frp));
      const points = fires.map(f => ({
        lat:    f.lat,
        lng:    f.lng,
        frp:    f.frp,
        year:   f.year,
        month:  f.month,
        color:  frpColor(f.frp),
        alt:    Math.max(0.010, Math.min(0.06, f.frp / (maxFrp * 3))),
        radius: Math.max(0.12, Math.min(0.42, f.frp / (maxFrp * 1.6))),
      }));

      world.pointsData(points);

      // Show results
      statusLoading.style.display = 'none';
      const truncated = fires.length >= 5000 ? ' (showing top 5,000 by intensity)' : '';
      showStatus(`${fires.length.toLocaleString()} fire events found in ${country} · ${MONTHS[monthFrom-1]} ${yearFrom} – ${MONTHS[monthTo-1]} ${yearTo}${truncated}`);
      legend.classList.remove('hidden');

    } catch (err) {
      statusLoading.style.display = 'none';
      showError(err.message || 'Failed to fetch fire data.');
    } finally {
      btnExplore.disabled = false;
    }
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  function frpColor(frp) {
    if (frp >= 150) return '#ef4444';   // Intense bright red
    if (frp >= 50)  return '#f87171';   // Medium vibrant red
    return '#fca5a5';                   // Soft warm red
  }

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
