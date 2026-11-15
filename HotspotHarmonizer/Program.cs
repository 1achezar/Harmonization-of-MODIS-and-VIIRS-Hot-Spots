using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using CsvHelper;
using CsvHelper.Configuration;
using CsvHelper.Configuration.Attributes;

namespace HotspotHarmonizer
{
    // 1. Define the raw input structure coming from the NASA CSV
    public class RawFirePixel
    {
        [Name("latitude")]
        public double Latitude { get; set; }

        [Name("longitude")]
        public double Longitude { get; set; }

        [Name("acq_date")]
        public DateTime Acq_Date { get; set; }

        [Name("frp")]
        public double Frp { get; set; }
    }

    // 2. Define the aggregated output structure for the database
    public class HarmonizedGridCell
    {
        public string GridId { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public double TotalFrp { get; set; }
        public int ModisCount { get; set; }
        public int ViirsCount { get; set; }
        public double HarmonizedCount { get; set; }
    }

    class Program
    {
        static void Main(string[] args)
        {
            string[] inputFiles = {
                @"C:\Users\Lache\OneDrive\Документи\NasaSpaceApp\fire_nrt_M-C61_847575.csv",
                @"C:\Users\Lache\OneDrive\Документи\NasaSpaceApp\fire_nrt_SV-C2_847576.csv"
            };

            
            string outputFile = @"C:\Users\Lache\OneDrive\Документи\NasaSpaceApp\Harmonized_Current.csv";

            var grid = new Dictionary<string, HarmonizedGridCell>();
            var csvConfig = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true,
                MissingFieldFound = null,
                HeaderValidated = null
            };

            Console.WriteLine("Starting NRT data pipeline...");

            // 3. Stream and Hash the data
            foreach (var file in inputFiles)
            {
                Console.WriteLine($"Processing {Path.GetFileName(file)}...");

                // Determine satellite based on the file name instead of the CSV columns
                bool isModisFile = file.Contains("M-C61");
                bool isViirsFile = file.Contains("SV-C2");

                // Use StreamReader to process files line-by-line without loading them entirely into memory
                using var reader = new StreamReader(file);
                using var csv = new CsvReader(reader, csvConfig);

                var records = csv.GetRecords<RawFirePixel>();

                foreach (var row in records)
                {
                    // Snap to ~1.1km grid by rounding latitude and longitude to 2 decimal places
                    string gridId = $"{Math.Round(row.Latitude, 2)}_{Math.Round(row.Longitude, 2)}";

                    // Create a unique dictionary key combining the location and the time (Year + Month)
                    string dictKey = $"{gridId}_{row.Acq_Date.Year}_{row.Acq_Date.Month}";

                    // If this specific grid cell + month combo doesn't exist yet, create it
                    if (!grid.TryGetValue(dictKey, out var cell))
                    {
                        cell = new HarmonizedGridCell
                        {
                            GridId = gridId,
                            Year = row.Acq_Date.Year,
                            Month = row.Acq_Date.Month,
                            TotalFrp = 0,
                            ModisCount = 0,
                            ViirsCount = 0
                        };
                        grid[dictKey] = cell;
                    }

                    // Add the fire's heat energy to the total
                    cell.TotalFrp += row.Frp;

                    // Increment the correct counter based on the file name we checked earlier
                    if (isModisFile) cell.ModisCount++;
                    else if (isViirsFile) cell.ViirsCount++;
                }
            }

            Console.WriteLine("Calculating Harmonized Counts...");

            // 4. Apply Harmonization Math
            foreach (var cell in grid.Values)
            {
                // 1 MODIS pixel covers roughly the same area as 7.1 VIIRS pixels
                cell.HarmonizedCount = cell.ModisCount + (cell.ViirsCount / 7.1);
            }

            Console.WriteLine($"Writing {grid.Count} aggregated cells to current output...");

            // 5. Export the clean data
            using var writer = new StreamWriter(outputFile);
            using var csvWriter = new CsvWriter(writer, CultureInfo.InvariantCulture);

            // Write all the processed dictionary values to the final Harmonized_Current.csv file
            csvWriter.WriteRecords(grid.Values);

            Console.WriteLine("Pipeline complete. Both datasets are ready for database seeding.");
        }
    }
}