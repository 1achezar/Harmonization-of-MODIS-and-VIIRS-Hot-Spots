document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  const STORAGE_KEY = 'pyrosync_balkan_wildfires_v1';
  let isPlaceMode = true;

  // High-Resolution Satellite & Terrain Tile Providers
  const TILE_LAYERS = {
    satellite: (x, y, l) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`,
    dark: (x, y, l) =>
      `https://basemaps.cartocdn.com/dark_all/${l}/${x}/${y}@2x.png`,
    topo: (x, y, l) =>
      `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${l}/${y}/${x}`
  };

  // Initial Balkan baseline detections if localStorage is empty
  const DEFAULT_WILDFIRES = [
    {
      id: 'wf-1',
      label: 'Strandzha Forest Thermal Anomaly',
      lat: 42.08,
      lng: 27.48,
      frp: 110,
      sensor: 'VIIRS (375m)',
      date: '2026-08-14'
    },
    {
      id: 'wf-2',
      label: 'Dadia-Lefkimi-Soufli Reserve',
      lat: 41.13,
      lng: 26.21,
      frp: 185,
      sensor: 'Harmonized',
      date: '2026-08-19'
    },
    {
      id: 'wf-3',
      label: 'Sakar Foothills Brushfire',
      lat: 41.95,
      lng: 26.32,
      frp: 75,
      sensor: 'MODIS (1km)',
      date: '2026-07-28'
    }
  ];

  // Load saved wildfires or initialize defaults
  let wildfires = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || [...DEFAULT_WILDFIRES];

  function saveWildfires() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wildfires));
  }

  // UI Element References
  const container = document.getElementById('globe-container');
  if (!container) return;

  const togglePlaceBtn = document.getElementById('toggle-place-mode');
  const placeModeLabel = document.getElementById('place-mode-label');
  const labelInput = document.getElementById('fire-label-input');
  const sensorSelect = document.getElementById('fire-sensor-select');
  const dateInput = document.getElementById('fire-date-input');
  const intensitySlider = document.getElementById('fire-intensity-slider');
  const frpDisplay = document.getElementById('frp-value-display');
  const firesListEl = document.getElementById('placed-fires-list');
  const countBadge = document.getElementById('fire-count-badge');
  const coordsHud = document.getElementById('cursor-coords');
  const layerSelect = document.getElementById('map-layer-select');

  // Update FRP slider label
  intensitySlider.addEventListener('input', () => {
    frpDisplay.textContent = `${intensitySlider.value} MW`;
  });

  // Toggle Place Mode ON / OFF
  togglePlaceBtn.addEventListener('click', () => {
    isPlaceMode = !isPlaceMode;
    if (isPlaceMode) {
      togglePlaceBtn.classList.remove('bg-slate-800', 'text-slate-200');
      togglePlaceBtn.classList.add('bg-orange-500', 'text-slate-950');
      placeModeLabel.textContent = 'Place Mode: ON (Click Globe)';
    } else {
      togglePlaceBtn.classList.remove('bg-orange-500', 'text-slate-950');
      togglePlaceBtn.classList.add('bg-slate-800', 'text-slate-200');
      placeModeLabel.textContent = 'Place Mode: OFF (Inspect Only)';
    }
  });

  // Initialize High-Resolution Google Earth-Style 3D Globe
  const world = Globe()(container)
    .globeTileEngineUrl(TILE_LAYERS.satellite)
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
    .atmosphereColor('#22d3ee')
    .atmosphereAltitude(0.16)
    // 3D Thermal Columns (Points Layer)
    .pointLat('lat')
    .pointLng('lng')
    .pointColor((d) => (d.frp >= 150 ? '#ef4444' : d.frp >= 80 ? '#f97316' : '#facc15'))
    .pointAltitude((d) => Math.min(0.22, d.frp / 950))
    .pointRadius((d) => Math.max(0.18, d.frp / 380))
    .pointResolution(24)
    .pointLabel((d) => `
      <div style="background: rgba(6, 11, 25, 0.94); border: 1px solid rgba(34, 211, 238, 0.5); padding: 10px 12px; border-radius: 10px; font-family: 'Inter', sans-serif; color: #f8fafc; min-width: 195px; box-shadow: 0 10px 25px rgba(0,0,0,0.6);">
        <div style="font-weight: 700; font-size: 13px; color: #fb923c; margin-bottom: 4px;">${d.label}</div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #94a3b8;">
          Coords: ${d.lat.toFixed(4)}°N, ${d.lng.toFixed(4)}°E<br/>
          Sensor: <span style="color: #22d3ee;">${d.sensor}</span><br/>
          Intensity: <span style="color: #f8fafc;">${d.frp} MW</span><br/>
          Date: ${d.date}
        </div>
      </div>
    `)
    // Pulsing Ground Shockwave Rings (Rings Layer)
    .ringLat('lat')
    .ringLng('lng')
    .ringColor((d) => (t) => `rgba(249, 115, 22, ${1 - t})`)
    .ringMaxRadius((d) => Math.max(1.2, d.frp / 75))
    .ringPropagationSpeed(2.0)
    .ringRepeatPeriod(1100);

  // Force crisp Retina / 4K device pixel ratio & enhanced terrain relief
  const renderer = world.renderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const globeMaterial = world.globeMaterial();
  globeMaterial.bumpScale = 12;

  // Smooth zoom damping & closer minimum zoom distance for regional inspection
  const controls = world.controls();
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 101.5;
  controls.maxDistance = 450;

  // Switch tile imagery layer if dropdown is present in globe.html
  if (layerSelect) {
    layerSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (TILE_LAYERS[selected]) {
        world.globeTileEngineUrl(TILE_LAYERS[selected]);
      }
    });
  }

  // Focus camera directly on the Balkan Peninsula on load
  world.pointOfView({ lat: 42.5, lng: 24.8, altitude: 0.45 }, 1200);

  // Handle clicking on the globe surface to place a new wildfire
  world.onGlobeClick(({ lat, lng }) => {
    coordsHud.textContent = `Selected: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;

    if (!isPlaceMode) return;

    const customLabel = labelInput.value.trim();
    const newFire = {
      id: `wf-${Date.now()}`,
      label: customLabel || `Balkan Hotspot #${wildfires.length + 1}`,
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
      frp: Number(intensitySlider.value),
      sensor: sensorSelect.value,
      date: dateInput.value || '2026-08-14'
    };

    wildfires.push(newFire);
    saveWildfires();
    syncGlobeAndUI();
    labelInput.value = '';
  });

  // Sync Globe 3D layers & Sidebar List
  function syncGlobeAndUI() {
    world.pointsData([...wildfires]);
    world.ringsData([...wildfires]);

    countBadge.textContent = `${wildfires.length} Active`;

    if (wildfires.length === 0) {
      firesListEl.innerHTML = `<div class="text-xs text-slate-500 italic py-2">No wildfires placed. Click on the globe to add one.</div>`;
      return;
    }

    firesListEl.innerHTML = wildfires
      .slice()
      .reverse()
      .map(
        (fire) => `
        <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-space-900/90 border border-slate-800 hover:border-slate-700 transition group">
          <button type="button" data-zoom-id="${fire.id}" class="text-left flex-1 min-w-0">
            <div class="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-400 transition">${fire.label}</div>
            <div class="text-[10px] font-mono text-slate-400">${fire.lat.toFixed(2)}°N, ${fire.lng.toFixed(2)}°E • ${fire.frp}MW</div>
          </button>
          <button type="button" data-delete-id="${fire.id}" title="Remove hotspot" class="p-1 text-slate-500 hover:text-rose-400 transition">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `
      )
      .join('');

    // Zoom to clicked hotspot in list
    firesListEl.querySelectorAll('[data-zoom-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = wildfires.find((f) => f.id === btn.getAttribute('data-zoom-id'));
        if (target) {
          world.pointOfView({ lat: target.lat, lng: target.lng, altitude: 0.16 }, 900);
        }
      });
    });

    // Delete single hotspot
    firesListEl.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idToRemove = btn.getAttribute('data-delete-id');
        wildfires = wildfires.filter((f) => f.id !== idToRemove);
        saveWildfires();
        syncGlobeAndUI();
      });
    });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Regional Fly-To Header Presets
  document.querySelectorAll('.fly-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [lat, lng, altitude] = btn.getAttribute('data-fly').split(',').map(Number);
      world.pointOfView({ lat, lng, altitude }, 1000);
    });
  });

  // Clear all hotspots
  document.getElementById('clear-fires-btn').addEventListener('click', () => {
    wildfires = [];
    saveWildfires();
    syncGlobeAndUI();
  });

  // Export placed hotspots as JSON
  document.getElementById('export-fires-json').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(wildfires, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'balkan_wildfire_hotspots.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Handle window resize smoothly
  window.addEventListener('resize', () => {
    world.width(window.innerWidth);
    world.height(window.innerHeight);
  });

  // Initial render
  syncGlobeAndUI();
});