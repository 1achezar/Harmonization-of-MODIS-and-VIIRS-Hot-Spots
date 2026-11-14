// ── Country center coordinates & zoom altitude ──────────────────────────────
const COUNTRY_POV = {
  'Albania':     { lat: 41.15, lng: 20.17, alt: 0.30 },
  'Bosnia':      { lat: 43.92, lng: 17.68, alt: 0.28 },
  'Bulgaria':    { lat: 42.73, lng: 25.49, alt: 0.28 },
  'Croatia':     { lat: 45.10, lng: 15.20, alt: 0.30 },
  'Greece':      { lat: 39.07, lng: 22.00, alt: 0.35 },
  'Kosovo':      { lat: 42.60, lng: 20.90, alt: 0.20 },
  'Montenegro':  { lat: 42.73, lng: 19.37, alt: 0.22 },
  'N. Macedonia':{ lat: 41.61, lng: 21.75, alt: 0.22 },
  'Romania':     { lat: 45.94, lng: 24.97, alt: 0.35 },
  'Serbia':      { lat: 44.02, lng: 20.91, alt: 0.30 },
  'Slovenia':    { lat: 46.12, lng: 14.80, alt: 0.22 },
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Populate year & month selects ────────────────────────────────────────────
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

// ── Globe setup ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();

  populateSelects();

  const container = document.getElementById('globe-container');
  const btnExplore   = document.getElementById('btn-explore');
  const statusBox    = document.getElementById('status-box');
  const statusLoading= document.getElementById('status-loading');
  const statusResult = document.getElementById('status-result');
  const statusError  = document.getElementById('status-error');
  const resultSummary= document.getElementById('result-summary');
  const legend       = document.getElementById('legend');

  // ── Init globe ──────────────────────────────────────────────────────────
  const world = Globe()(container)
    .globeTileEngineUrl((x, y, l) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`)
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
    .atmosphereColor('#ff4444')
    .atmosphereAltitude(0.14)
    // ── Points layer ──
    .pointsData([])
    .pointLat('lat')
    .pointLng('lng')
    .pointColor('color')
    .pointAltitude('alt')
    .pointRadius('radius')
    .pointResolution(12)
    .pointLabel(d => `
      <div style="
        background:rgba(6,11,25,.95);
        border:1px solid rgba(239,68,68,.45);
        padding:9px 12px;
        border-radius:10px;
        font-family:'JetBrains Mono',monospace;
        font-size:11px;
        color:#cbd5e1;
        min-width:175px;
        box-shadow:0 8px 24px rgba(0,0,0,.7);">
        <div style="font-weight:700;font-size:12px;color:#f87171;margin-bottom:5px">
          🔥 Wildfire Detection
        </div>
        Coords: ${d.lat.toFixed(3)}°N, ${d.lng.toFixed(3)}°E<br/>
        FRP: <span style="color:#fff">${d.frp.toFixed(1)} MW</span><br/>
        Period: <span style="color:#fff">${MONTHS[d.month - 1]} ${d.year}</span>
      </div>`);

  // Quality rendering
  world.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  world.globeMaterial().bumpScale = 10;

  const controls = world.controls();
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance   = 101;
  controls.maxDistance   = 500;

  // Start centered on the Balkans
  world.pointOfView({ lat: 42.5, lng: 23.0, altitude: 0.60 }, 0);

  window.addEventListener('resize', () => {
    world.width(window.innerWidth);
    world.height(window.innerHeight);
  });

  // ── Explore button ───────────────────────────────────────────────────────
  btnExplore.addEventListener('click', async () => {
    const country   = document.getElementById('sel-country').value;
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
    world.pointsData([]);   // clear previous dots

    // Fly to country immediately while data loads
    if (COUNTRY_POV[country]) {
      world.pointOfView(COUNTRY_POV[country], 1400);
    }

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
        showStatus(`No fire detections found for ${country} in this period.`);
        return;
      }

      // Map to globe point objects
      const maxFrp = Math.max(...fires.map(f => f.frp));
      const points = fires.map(f => ({
        lat:    f.lat,
        lng:    f.lng,
        frp:    f.frp,
        year:   f.year,
        month:  f.month,
        // All red, but intensity drives opacity & size
        color:  frpColor(f.frp),
        alt:    Math.max(0.005, Math.min(0.08, f.frp / (maxFrp * 4))),
        radius: Math.max(0.12, Math.min(0.55, f.frp / (maxFrp * 1.8))),
      }));

      world.pointsData(points);

      // Show results
      statusLoading.style.display = 'none';
      const truncated = fires.length >= 5000 ? ' (showing top 5,000 by intensity)' : '';
      showStatus(`${fires.length.toLocaleString()} fire events found in ${country} · ${MONTHS[monthFrom-1]} ${yearFrom} – ${MONTHS[monthTo-1]} ${yearTo}${truncated}`);
      legend.classList.remove('hidden');

    } catch (err) {
      statusLoading.style.display = 'none';
      showError(err.message || 'Failed to fetch data.');
    } finally {
      btnExplore.disabled = false;
    }
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  function frpColor(frp) {
    // All red family, brighter = higher FRP
    if (frp >= 150) return '#ef4444';   // bright red
    if (frp >= 50)  return '#f87171';   // medium red
    return '#fca5a5';                    // soft red/pink
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
