document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  const container = document.getElementById('globe-container');
  const sensorSelect = document.getElementById('fire-sensor-select');
  const dateInput = document.getElementById('fire-date-input');
  const exportBtn = document.getElementById('export-fires-json');

  
  const world = Globe()(container)
    .globeTileEngineUrl(
      (x, y, l) =>
        `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`
    )
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
    .atmosphereColor('#22d3ee')
    .atmosphereAltitude(0.16);

  
  world.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  world.globeMaterial().bumpScale = 12;

  const controls = world.controls();
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 101.5;
  controls.maxDistance = 450;


  world.pointOfView({ lat: 42.5, lng: 24.8, altitude: 0.45 }, 1000);



  // Resizing
  window.addEventListener('resize', () => {
    world.width(window.innerWidth);
    world.height(window.innerHeight);
  });
});



