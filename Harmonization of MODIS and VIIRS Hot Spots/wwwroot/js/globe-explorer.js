// ── Close-up POV coordinates per Balkan country ──────────────────────────────
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

const BALKAN_OVERVIEW = { lat: 42.5, lng: 21.5, alt: 0.42 };
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
    yFrom.add(new Option(y, y, y === 2024, y === 2024));
    yTo.add(new Option(y, y, y === 2026, y === 2026));
  }
  MONTHS.forEach((m, i) => {
    mFrom.add(new Option(m, i + 1, i === 0, i === 0));
    mTo.add(new Option(m, i + 1, i === 11, i === 11));
  });
}

// ── 2D Hexagon Color Scale: Denser fires = Darker red / maroon ──────────────
function getHex2DColor(count) {
  if (count >= 100) return 'rgba(59, 8, 8, 0.96)';     // Mega Cluster (#3b0808)
  if (count >= 40)  return 'rgba(127, 29, 29, 0.94)';  // Heavy (#7f1d1d)
  if (count >= 15)  return 'rgba(185, 28, 28, 0.90)';  // Medium (#b91c1c)
  if (count >= 5)   return 'rgba(239, 68, 68, 0.85)';  // Moderate (#ef4444)
  return 'rgba(252, 165, 165, 0.80)';                  // Low (#fca5a5)
}

// ── Main Initialization ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();

  populateSelects();

  const container    = document.getElementById('globe-container');
  const selCountry   = document.getElementById('sel-country');
  const btnExplore   = document.getElementById('btn-explore');
  const btnResetView = document.getElementById('btn-reset-view');
  const btnToggle    = document.getElementById('btn-toggle-panel');
  const panelBody    = document.getElementById('panel-body');
  const toggleIcon   = document.getElementById('toggle-icon');
  const statusBox    = document.getElementById('status-box');
  const statusLoading= document.getElementById('status-loading');
  const statusResult = document.getElementById('status-result');
  const statusError  = document.getElementById('status-error');
  const resultSummary= document.getElementById('result-summary');
  const legendHex    = document.getElementById('legend-hex');
  const presetButtons= document.querySelectorAll('.btn-preset');

  let balkanGeoJson = null;

  // ── Init Globe.gl ──────────────────────────────────────────────────────────
  const world = Globe()(container)
    .globeTileEngineUrl((x, y, l) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`)
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')

    // Natural Earth Blue Atmosphere (No red outline)
    .atmosphereColor('#38bdf8')
    .atmosphereAltitude(0.12)

    // Country Boundary Polygon: Flush on Earth surface
    .polygonsData([])
    .polygonCapColor(() => 'rgba(56, 189, 248, 0.08)')
    .polygonSideColor(() => 'rgba(0, 0, 0, 0)')
    .polygonStrokeColor(() => '#38bdf8')
    .polygonAltitude(0.00015)

    // 2D Hexagonal Grid: Surface-Flush (0.00015 altitude, high spherical curvature)
    .hexBinPointsData([])
    .hexBinPointLat(d => d.lat)
    .hexBinPointLng(d => d.lng)
    .hexBinPointWeight(d => d.frp || 1)
    .hexBinResolution(6.4)
    .hexMargin(0.04)
    .hexTopCurvatureResolution(8)                      // Smoothly curves over sphere
    .hexTopColor(d => getHex2DColor(d.points.length))  // Darker = denser fires
    .hexSideColor(() => 'rgba(0, 0, 0, 0)')             // 0 sides = pure 2D surface skin
    .hexAltitude(0.0002)                               // Exact same level as earth surface
    .hexTransitionDuration(400)
    .hexLabel(d => `
      <div style="
        background: rgba(3, 7, 18, 0.95);
        border: 1px solid rgba(244, 63, 94, 0.5);
        padding: 9px 13px;
        border-radius: 10px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: #cbd5e1;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.85);">
        <div style="font-weight: 700; font-size: 12px; color: #f43f5e; margin-bottom: 4px;">
          ⬡ Wildfire Surface Cluster
        </div>
        Fires in Cell: <span style="color:#fff; font-weight:700;">${d.points.length.toLocaleString()}</span><br/>
        Total FRP: <span style="color:#f43f5e; font-weight:700;">${d.sumWeight.toFixed(1)} MW</span><br/>
        Mean FRP: <span style="color:#fff;">${(d.sumWeight / d.points.length).toFixed(1)} MW</span>
      </div>`);

  // Sharp rendering & natural terrain
  world.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if (world.globeMaterial()) {
    world.globeMaterial().bumpScale = 1.0; // Clean, natural surface without jagged displacement
  }

  const controls = world.controls();
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance   = 100.05; // Close-up camera inspection without sphere clipping
  controls.maxDistance   = 500;

  // Initial Balkan overview perspective
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
      console.warn('balkans.geojson notice:', err);
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

  // ── Helper: Zoom to country closer perspective ─────────────────────────────
  function zoomToCountry(country, duration = 1200) {
    if (COUNTRY_POV[country]) {
      world.pointOfView(COUNTRY_POV[country], duration);
    }
  }

  // ── Country Dropdown: Zoom and outline immediately ─────────────────────────
  selCountry.addEventListener('change', () => {
    const country = selCountry.value;
    if (country) {
      world.hexBinPointsData([]);
      statusBox.classList.add('hidden');
      legendHex.classList.add('hidden');

      zoomToCountry(country, 1200);
      highlightCountry(country);
    }
  });

  // ── Reset View Button ──────────────────────────────────────────────────────
  if (btnResetView) {
    btnResetView.addEventListener('click', () => {
      world.pointOfView(BALKAN_OVERVIEW, 1000);
    });
  }

  // ── Minimize / Expand Panel Button ─────────────────────────────────────────
  if (btnToggle && panelBody && toggleIcon) {
    let collapsed = false;
    btnToggle.addEventListener('click', () => {
      collapsed = !collapsed;
      if (collapsed) {
        panelBody.classList.add('hidden');
        toggleIcon.style.transform = 'rotate(180deg)';
      } else {
        panelBody.classList.remove('hidden');
        toggleIcon.style.transform = 'rotate(0deg)';
      }
    });
  }

  // ── Quick Presets ──────────────────────────────────────────────────────────
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      const yFrom = document.getElementById('sel-year-from');
      const yTo   = document.getElementById('sel-year-to');
      const mFrom = document.getElementById('sel-month-from');
      const mTo   = document.getElementById('sel-month-to');

      presetButtons.forEach(b => {
        b.classList.remove('bg-rose-500/20', 'border-rose-500/40', 'text-rose-300');
        b.classList.add('bg-surface-850', 'text-slate-300');
      });
      btn.classList.add('bg-rose-500/20', 'border-rose-500/40', 'text-rose-300');
      btn.classList.remove('bg-surface-850', 'text-slate-300');

      if (preset === 'recent') {
        yFrom.value = '2024';
        mFrom.value = '1';
        yTo.value   = '2026';
        mTo.value   = '12';
      } else if (preset === 'peak') {
        yFrom.value = '2024';
        mFrom.value = '6';  // June
        yTo.value   = '2024';
        mTo.value   = '9';  // September
      } else if (preset === 'all') {
        yFrom.value = '2000';
        mFrom.value = '1';
        yTo.value   = '2026';
        mTo.value   = '12';
      }
    });
  });

  // ── Action Button Click: Query and Display Fires ───────────────────────────
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

    // Zoom into close-up perspective
    zoomToCountry(country, 900);
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
        world.hexBinPointsData([]);
        showStatus(`No fire detections found for ${country} in this date range.`);
        return;
      }

      // Render 2D Hexagonal outerlayer flush with Earth surface
      world.hexBinPointsData(fires);
      legendHex.classList.remove('hidden');

      // Results summary
      statusLoading.style.display = 'none';
      const truncated = fires.length >= 5000 ? ' (top 5,000 intensity records)' : '';
      showStatus(`${fires.length.toLocaleString()} fires plotted on surface 2D grid · ${MONTHS[monthFrom-1]} ${yearFrom} – ${MONTHS[monthTo-1]} ${yearTo}${truncated}`);

    } catch (err) {
      statusLoading.style.display = 'none';
      showError(err.message || 'Failed to fetch fire data.');
    } finally {
      btnExplore.disabled = false;
    }
  });

  // ── Status Helpers ─────────────────────────────────────────────────────────
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
