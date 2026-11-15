// ── Country center coordinates & close-up zoom altitude ─────────────────────
const COUNTRY_POV = {
  'Albania':      { lat: 41.15, lng: 20.10, alt: 0.075 },
  'Bosnia':       { lat: 44.00, lng: 17.80, alt: 0.085 },
  'Bulgaria':     { lat: 42.75, lng: 25.40, alt: 0.085 },
  'Croatia':      { lat: 45.10, lng: 15.60, alt: 0.115 },
  'Greece':       { lat: 38.80, lng: 23.00, alt: 0.140 },
  'Kosovo':       { lat: 42.60, lng: 20.90, alt: 0.050 },
  'Montenegro':   { lat: 42.70, lng: 19.30, alt: 0.055 },
  'N. Macedonia': { lat: 41.60, lng: 21.70, alt: 0.055 },
  'Romania':      { lat: 45.90, lng: 24.90, alt: 0.120 },
  'Serbia':       { lat: 44.00, lng: 20.90, alt: 0.095 },
  'Slovenia':     { lat: 46.10, lng: 14.80, alt: 0.055 },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Populate year & month dropdowns ──────────────────────────────────────────
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
    yFrom.add(new Option(y, y, y === 2020, y === 2020));
    yTo.add(new Option(y, y, y === 2026, y === 2026));
  }
  MONTHS.forEach((m, i) => {
    mFrom.add(new Option(m, i + 1, i === 0, i === 0));
    mTo.add(new Option(m, i + 1, i === 11, i === 11));
  });
}

// ── Hexagon Color Scales: Denser/More Fires = Darker Red/Crimson ─────────────
function getHexTopColor(count, sumFrp) {
  if (count >= 100) return 'rgba(69, 10, 10, 0.98)';   // Deepest dark maroon (#450a0a)
  if (count >= 40)  return 'rgba(127, 29, 29, 0.96)';  // Dark blood-red (#7f1d1d)
  if (count >= 15)  return 'rgba(185, 28, 28, 0.92)';  // Dark crimson (#b91c1c)
  if (count >= 5)   return 'rgba(239, 68, 68, 0.88)';  // Vibrant fire red (#ef4444)
  return 'rgba(252, 165, 165, 0.82)';                  // Light coral red (#fca5a5)
}

function getHexSideColor(count, sumFrp) {
  if (count >= 100) return 'rgba(35, 5, 5, 0.95)';
  if (count >= 40)  return 'rgba(75, 12, 12, 0.90)';
  if (count >= 15)  return 'rgba(120, 18, 18, 0.85)';
  if (count >= 5)   return 'rgba(180, 25, 25, 0.80)';
  return 'rgba(230, 120, 120, 0.70)';
}

function frpColor(frp) {
  if (frp >= 150) return '#ef4444';   // High FRP (bright red)
  if (frp >= 50)  return '#f87171';   // Medium FRP (medium red)
  return '#fca5a5';                   // Low FRP (soft red)
}

// ── Globe initialization & Event Handlers ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();

  populateSelects();

  const container    = document.getElementById('globe-container');
  const selCountry   = document.getElementById('sel-country');
  const btnExplore   = document.getElementById('btn-explore');
  const btnModeHex   = document.getElementById('btn-mode-hex');
  const btnModeDots  = document.getElementById('btn-mode-dots');
  const statusBox    = document.getElementById('status-box');
  const statusLoading= document.getElementById('status-loading');
  const statusResult = document.getElementById('status-result');
  const statusError  = document.getElementById('status-error');
  const resultSummary= document.getElementById('result-summary');
  const legendHex    = document.getElementById('legend-hex');
  const legendDots   = document.getElementById('legend-dots');

  let balkanGeoJson = null;
  let currentFires  = [];
  let currentMode   = 'hex'; // 'hex' or 'dots'

  // ── Init Globe.gl ──────────────────────────────────────────────────────────
  const world = Globe()(container)
    .globeTileEngineUrl((x, y, l) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`)
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')

    // ── Natural Earth Atmospheric Glow (Soft sky-blue) ──
    .atmosphereColor('#38bdf8')
    .atmosphereAltitude(0.12)

    // ── Selected Country Outline & Tint (Polygons layer) ──
    .polygonsData([])
    .polygonCapColor(() => 'rgba(56, 189, 248, 0.08)')
    .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
    .polygonStrokeColor(() => '#38bdf8')
    .polygonAltitude(0.005)

    // ── Hexagonal Density Binning Layer ──
    .hexBinPointsData([])
    .hexBinPointLat(d => d.lat)
    .hexBinPointLng(d => d.lng)
    .hexBinPointWeight(d => d.frp || 1)
    .hexBinResolution(6.2)
    .hexMargin(0.12)
    .hexTopCurvatureResolution(2)
    .hexTopColor(d => getHexTopColor(d.points.length, d.sumWeight))
    .hexSideColor(d => getHexSideColor(d.points.length, d.sumWeight))
    .hexAltitude(d => Math.max(0.008, Math.min(0.055, (Math.log(d.points.length + 1) / 4) * 0.045 + 0.005)))
    .hexTransitionDuration(600)
    .hexLabel(d => `
      <div style="
        background: rgba(6, 11, 25, 0.96);
        border: 1px solid rgba(239, 68, 68, 0.6);
        padding: 9px 13px;
        border-radius: 10px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: #cbd5e1;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.8);">
        <div style="font-weight: 700; font-size: 12px; color: #f87171; margin-bottom: 4px;">
          ⬡ Wildfire Cluster
        </div>
        Fires in Hexagon: <span style="color:#fff; font-weight:700;">${d.points.length}</span><br/>
        Total FRP: <span style="color:#f87171; font-weight:700;">${d.sumWeight.toFixed(1)} MW</span><br/>
        Avg FRP: <span style="color:#fff;">${(d.sumWeight / d.points.length).toFixed(1)} MW</span>
      </div>`)

    // ── Hotspot Points Layer (Optional Dots view) ──
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

  // ── Helper: Render Fires in Current Mode ───────────────────────────────────
  function renderFiresData() {
    if (!currentFires || currentFires.length === 0) {
      world.hexBinPointsData([]);
      world.pointsData([]);
      return;
    }

    if (currentMode === 'hex') {
      world.pointsData([]);
      world.hexBinPointsData(currentFires);
      legendHex.classList.remove('hidden');
      legendDots.classList.add('hidden');
    } else {
      world.hexBinPointsData([]);
      const maxFrp = Math.max(...currentFires.map(f => f.frp || 1));
      const points = currentFires.map(f => ({
        lat:    f.lat,
        lng:    f.lng,
        frp:    f.frp,
        year:   f.year,
        month:  f.month,
        color:  frpColor(f.frp),
        alt:    Math.max(0.010, Math.min(0.06, f.frp / (maxFrp * 3))),
        radius: Math.max(0.12, Math.min(0.40, f.frp / (maxFrp * 1.6))),
      }));
      world.pointsData(points);
      legendHex.classList.add('hidden');
      legendDots.classList.remove('hidden');
    }
  }

  // ── Visualization Mode Toggles ─────────────────────────────────────────────
  btnModeHex.addEventListener('click', () => {
    currentMode = 'hex';
    btnModeHex.className = 'py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-red-500/20 text-red-400 border border-red-500/30 transition cursor-pointer';
    btnModeDots.className = 'py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 text-slate-400 hover:text-white transition cursor-pointer';
    renderFiresData();
  });

  btnModeDots.addEventListener('click', () => {
    currentMode = 'dots';
    btnModeDots.className = 'py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-red-500/20 text-red-400 border border-red-500/30 transition cursor-pointer';
    btnModeHex.className = 'py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 text-slate-400 hover:text-white transition cursor-pointer';
    renderFiresData();
  });

  // ── Country Dropdown Change: Zoom & Outline Immediately ────────────────────
  selCountry.addEventListener('change', () => {
    const country = selCountry.value;
    if (country) {
      currentFires = [];
      world.hexBinPointsData([]);
      world.pointsData([]);
      statusBox.classList.add('hidden');
      legendHex.classList.add('hidden');
      legendDots.classList.add('hidden');

      zoomToCountry(country, 1200);
      highlightCountry(country);
    }
  });

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
    legendDots.classList.add('hidden');
    btnExplore.disabled = true;

    // Zoom even closer and ensure country outline
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

      if (!fires || fires.length === 0) {
        statusLoading.style.display = 'none';
        currentFires = [];
        world.hexBinPointsData([]);
        world.pointsData([]);
        showStatus(`No fire detections found for ${country} in this period.`);
        return;
      }

      currentFires = fires;
      renderFiresData();

      // Results summary
      statusLoading.style.display = 'none';
      const truncated = fires.length >= 5000 ? ' (showing top 5,000 by intensity)' : '';
      showStatus(`${fires.length.toLocaleString()} fire events aggregated into density hexagons · ${MONTHS[monthFrom-1]} ${yearFrom} – ${MONTHS[monthTo-1]} ${yearTo}${truncated}`);

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
