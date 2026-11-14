using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Harmonization_of_MODIS_and_VIIRS_Hot_Spots.Controllers
{
    [ApiController]
    [Route("api/fires")]
    public class FiresController : ControllerBase
    {
        private readonly AppDbContext _db;

        // Bounding boxes (latMin, latMax, lngMin, lngMax) for each Balkan country
        private static readonly Dictionary<string, (double LatMin, double LatMax, double LngMin, double LngMax)> Bounds = new()
        {
            ["Bulgaria"]      = (41.2, 44.2, 22.3, 28.6),
            ["Greece"]        = (34.8, 42.0, 19.4, 28.3),
            ["Romania"]       = (43.6, 48.3, 20.2, 29.7),
            ["Serbia"]        = (42.2, 46.2, 18.8, 23.0),
            ["Croatia"]       = (42.4, 46.6, 13.5, 19.5),
            ["Bosnia"]        = (42.5, 45.3, 15.7, 19.6),
            ["Montenegro"]    = (41.8, 43.6, 18.4, 20.4),
            ["N. Macedonia"]  = (40.8, 42.4, 20.4, 23.0),
            ["Albania"]       = (39.6, 42.7, 19.3, 21.1),
            ["Slovenia"]      = (45.4, 46.9, 13.4, 16.6),
            ["Kosovo"]        = (41.9, 43.3, 20.0, 21.8),
        };

        public FiresController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] string country,
            [FromQuery] int yearFrom,
            [FromQuery] int monthFrom,
            [FromQuery] int yearTo,
            [FromQuery] int monthTo)
        {
            if (!Bounds.TryGetValue(country, out var b))
                return BadRequest(new { error = $"Unknown country: {country}" });

            if (yearFrom > yearTo || (yearFrom == yearTo && monthFrom > monthTo))
                return BadRequest(new { error = "Invalid date range." });

            var fires = await _db.FireEvents
                .Where(f =>
                    f.Latitude  >= b.LatMin && f.Latitude  <= b.LatMax &&
                    f.Longitude >= b.LngMin && f.Longitude <= b.LngMax &&
                    (f.Year > yearFrom || (f.Year == yearFrom && f.Month >= monthFrom)) &&
                    (f.Year < yearTo   || (f.Year == yearTo   && f.Month <= monthTo)))
                .OrderByDescending(f => f.TotalFrp)
                .Take(5000)
                .Select(f => new
                {
                    lat  = f.Latitude,
                    lng  = f.Longitude,
                    frp  = f.TotalFrp,
                    year = f.Year,
                    month = f.Month
                })
                .ToListAsync();

            return Ok(fires);
        }

        [HttpGet("countries")]
        public IActionResult Countries() => Ok(Bounds.Keys.OrderBy(k => k));
    }
}
