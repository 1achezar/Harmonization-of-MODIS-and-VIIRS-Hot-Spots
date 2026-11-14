document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // ── only run globe logic if the globe-container is present ──
  const container = document.getElementById('globe-container');
  if (!container) return;

  const STORAGE_KEY = 'pyrosync_balkan_wildfires_v1';
  let isPlaceMode = true;

  const TILE_LAYERS = {
    satellite: (x, y, l) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`,
    dark: (x, y, l) =>
      `https://basemaps.cartocdn.com/dark_all/${l}/${x}/${y}@2x.png`,
    topo: (x, y, l) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${l}/${y}/${x}`
  };

  const DEFAULT_WILDFIRES = [
    { id: 'wf-1', label: 'Strandzha Forest Thermal Anomaly', lat: 42.08, lng: 27.48, frp: 110, sensor: 'VIIRS (375m)', date: '2026-08-14' },
    { id: 'wf-2', label: 'Dadia-Lefkimi-Soufli Reserve',     lat: 41.13, lng: 26.21, frp: 185, sensor: 'Harmonized',    date: '2026-08-19' },
    { id: 'wf-3', label: 'Sakar Foothills Brushfire',         lat: 41.95, lng: 26.32, frp:  75, sensor: 'MODIS (1km)',   date: '2026-07-28' }
  ];

  let wildfires = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || [...DEFAULT_WILDFIRES];
  function saveWildfires() { localStorage.setItem(STORAGE_KEY, JSON.stringify(wildfires)); }

  // ── UI refs (all optional — guarded before use) ──
  const togglePlaceBtn  = document.getElementById('toggle-place-mode');
  const placeModeLabel  = document.getElementById('place-mode-label');
  const labelInput      = document.getElementById('fire-label-input');
  const sensorSelect    = document.getElementById('fire-sensor-select');
  const dateInput       = document.getElementById('fire-date-input');
  const intensitySlider = document.getElementById('fire-intensity-slider');
  const frpDisplay      = document.getElementById('frp-value-display');
  const firesListEl     = document.getElementById('placed-fires-list');
  const countBadge      = document.getElementById('fire-count-badge');
  const coordsHud       = document.getElementById('cursor-coords');
  const layerSelect     = document.getElementById('map-layer-select');

  // ── FRP slider live label ──
  if (intensitySlider && frpDisplay) {
    intensitySlider.addEventListener('input', () => {
      frpDisplay.textContent = `${intensitySlider.value} MW`;
    });
  }

  // ── Place Mode toggle ──
  if (togglePlaceBtn) {
    togglePlaceBtn.addEventListener('click', () => {
      isPlaceMode = !isPlaceMode;
      if (isPlaceMode) {
        togglePlaceBtn.textContent = 'ON';
        togglePlaceBtn.className = togglePlaceBtn.className
          .replace('bg-slate-700', 'bg-orange-500')
          .replace('text-slate-200', 'text-slate-950');
        if (placeModeLabel) placeModeLabel.textContent = 'Place Mode: ON (Click Globe)';
      } else {
        togglePlaceBtn.textContent = 'OFF';
        togglePlaceBtn.className = togglePlaceBtn.className
          .replace('bg-orange-500', 'bg-slate-700')
          .replace('text-slate-950', 'text-slate-200');
        if (placeModeLabel) placeModeLabel.textContent = 'Place Mode: OFF (Inspect Only)';
      }
    });
  }

  // ── 3D Globe init ──
  const world = Globe()(container)
    .globeTileEngineUrl(TILE_LAYERS.satellite)
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
    .atmosphereColor('#22d3ee')
    .atmosphereAltitude(0.16)
    .pointLat('lat')
    .pointLng('lng')
    .pointColor(d => d.frp >= 150 ? '#ef4444' : d.frp >= 80 ? '#f97316' : '#facc15')
    .pointAltitude(d => Math.min(0.22, d.frp / 950))
    .pointRadius(d => Math.max(0.18, d.frp / 380))
    .pointResolution(24)
    .pointLabel(d => `
      <div style="background:rgba(6,11,25,.94);border:1px solid rgba(34,211,238,.5);
                  padding:10px 12px;border-radius:10px;font-family:'Inter',sans-serif;
                  color:#f8fafc;min-width:195px;box-shadow:0 10px 25px rgba(0,0,0,.6)">
        <div style="font-weight:700;font-size:13px;color:#fb923c;margin-bottom:4px">${d.label}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#94a3b8">
          Coords: ${d.lat.toFixed(4)}°N, ${d.lng.toFixed(4)}°E<br/>
          Sensor: <span style="color:#22d3ee">${d.sensor}</span><br/>
          Intensity: <span style="color:#f8fafc">${d.frp} MW</span><br/>
          Date: ${d.date}
        </div>
      </div>`)
    .ringLat('lat')
    .ringLng('lng')
    .ringColor(() => t => `rgba(249,115,22,${1 - t})`)
    .ringMaxRadius(d => Math.max(1.2, d.frp / 75))
    .ringPropagationSpeed(2.0)
    .ringRepeatPeriod(1100);

  world.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  world.globeMaterial().bumpScale = 12;

  const controls = world.controls();
  controls.enableDamping  = true;
  controls.dampingFactor  = 0.08;
  controls.minDistance    = 101.5;
  controls.maxDistance    = 450;

  if (layerSelect) {
    layerSelect.addEventListener('change', e => {
      if (TILE_LAYERS[e.target.value]) world.globeTileEngineUrl(TILE_LAYERS[e.target.value]);
    });
  }

  world.pointOfView({ lat: 42.5, lng: 24.8, altitude: 0.45 }, 1200);

  // ── Globe click ──
  world.onGlobeClick(({ lat, lng }) => {
    if (coordsHud) {
      coordsHud.classList.remove('hidden');
      coordsHud.textContent = `Selected: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
    }
    if (!isPlaceMode) return;

    const newFire = {
      id:     `wf-${Date.now()}`,
      label:  (labelInput && labelInput.value.trim()) || `Balkan Hotspot #${wildfires.length + 1}`,
      lat:    Number(lat.toFixed(4)),
      lng:    Number(lng.toFixed(4)),
      frp:    intensitySlider ? Number(intensitySlider.value) : 100,
      sensor: sensorSelect ? sensorSelect.value : 'VIIRS (375m)',
      date:   (dateInput && dateInput.value) || '2026-08-14'
    };

    wildfires.push(newFire);
    saveWildfires();
    syncGlobeAndUI();
    if (labelInput) labelInput.value = '';
  });

  // ── Sync UI list ──
  function syncGlobeAndUI() {
    world.pointsData([...wildfires]);
    world.ringsData([...wildfires]);

    if (countBadge) countBadge.textContent = `${wildfires.length} Active`;

    if (!firesListEl) return;

    if (wildfires.length === 0) {
      firesListEl.innerHTML = `<div class="text-xs text-slate-600 italic py-2">No hotspots placed.</div>`;
      return;
    }

    firesListEl.innerHTML = wildfires
      .slice().reverse()
      .map(fire => `
        <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-space-900/90 border border-slate-800 hover:border-slate-700 transition group">
          <button type="button" data-zoom-id="${fire.id}" class="text-left flex-1 min-w-0">
            <div class="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-400 transition">${fire.label}</div>
            <div class="text-[10px] font-mono text-slate-500">${fire.lat.toFixed(2)}°N, ${fire.lng.toFixed(2)}°E · ${fire.frp} MW</div>
          </button>
          <button type="button" data-delete-id="${fire.id}" title="Remove" class="p-1 text-slate-600 hover:text-rose-400 transition shrink-0">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>`)
      .join('');

    firesListEl.querySelectorAll('[data-zoom-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = wildfires.find(f => f.id === btn.dataset.zoomId);
        if (t) world.pointOfView({ lat: t.lat, lng: t.lng, altitude: 0.16 }, 900);
      });
    });

    firesListEl.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        wildfires = wildfires.filter(f => f.id !== btn.dataset.deleteId);
        saveWildfires();
        syncGlobeAndUI();
      });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // ── Fly-to presets ──
  document.querySelectorAll('.fly-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const [lat, lng, altitude] = btn.dataset.fly.split(',').map(Number);
      world.pointOfView({ lat, lng, altitude }, 1000);
    });
  });

  // ── Clear all ──
  const clearBtn = document.getElementById('clear-fires-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      wildfires = [];
      saveWildfires();
      syncGlobeAndUI();
    });
  }

  // ── Export JSON ──
  const exportBtn = document.getElementById('export-fires-json');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(wildfires, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'balkan_wildfire_hotspots.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ── Resize ──
  window.addEventListener('resize', () => {
    world.width(window.innerWidth);
    world.height(window.innerHeight);
  });

  // ── Initial render ──
  syncGlobeAndUI();
});
