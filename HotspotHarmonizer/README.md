# NASA Hotspot Harmonizer Pipeline

This data pipeline harmonizes raw NASA active fire detection records from two disparate satellite sensors:
- **MODIS** (Terra and Aqua satellites, 1 km spatial resolution, ~1,000,000 m² per pixel)
- **VIIRS** (Suomi-NPP and NOAA-20 satellites, 375 m spatial resolution, ~140,625 m² per pixel)

---

## 1. Harmonization Mathematical Model

Because a single MODIS pixel covers approximately 7.1 times the surface area of a VIIRS pixel:

$$\text{Area Ratio} = \frac{1000\text{ m} \times 1000\text{ m}}{375\text{ m} \times 375\text{ m}} = \frac{1{,}000{,}000\text{ m}^2}{140{,}625\text{ m}^2} \approx 7.11$$

The harmonized detection count for any spatial-temporal cell is calculated as:

$$\text{HarmonizedCount} = \text{ModisCount} + \frac{\text{ViirsCount}}{7.1}$$

This normalization formula eliminates the artificial inflation of modern fire counts caused solely by VIIRS's higher resolution and lower thermal detection threshold.

---

## 2. Spatial & Temporal Aggregation

1. **Spatial Grid Snapping**:
   - Detections are snapped to an equal-area $\sim 1.1\text{ km}$ grid by rounding latitude and longitude coordinates to 2 decimal places:
     $$\text{GridId} = \text{Round}(\text{Latitude}, 2) \mathbin{\_} \text{Round}(\text{Longitude}, 2)$$
2. **Temporal Key**:
   - Observations are bucketed by calendar Year and Month:
     $$\text{Key} = \text{GridId} \mathbin{\_} \text{Year} \mathbin{\_} \text{Month}$$
3. **Fire Radiative Power (FRP)**:
   - FRP (in Megawatts) is aggregated additively per cell to quantify total thermal energy output.

---

## 3. How to Run

```bash
cd HotspotHarmonizer
dotnet run
```
