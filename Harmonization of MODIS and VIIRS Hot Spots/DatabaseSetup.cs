using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using CsvHelper;
using Microsoft.EntityFrameworkCore;

public class HarmonizedFireEvent
{
    public int Id { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public double TotalFrp { get; set; }
    public int ModisCount { get; set; }
    public int ViirsCount { get; set; }
    public double HarmonizedCount { get; set; }
}

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<HarmonizedFireEvent> FireEvents { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<HarmonizedFireEvent>()
            .HasIndex(f => new { f.Year, f.Month, f.Latitude, f.Longitude });
    }
}

public class CsvFireRecord
{
    public string GridId { get; set; } = string.Empty;
    public int Year { get; set; }
    public int Month { get; set; }
    public double TotalFrp { get; set; }
    public int ModisCount { get; set; }
    public int ViirsCount { get; set; }
    public double HarmonizedCount { get; set; }
}

public static class DataSeeder
{
    public static void SeedCsvData(AppDbContext context, string filePath)
    {
        if (context.FireEvents.Any()) return;

        var options = new CsvReaderOptions
        {
            HasHeader = true,
            FormatProvider = CultureInfo.InvariantCulture
        };
        using var csv = CsvReader.FromFile(filePath, options);

        var records = csv.GetRecords<CsvFireRecord>();
        context.ChangeTracker.AutoDetectChangesEnabled = false;

        var batch = new List<HarmonizedFireEvent>();
        int count = 0;

        foreach (var record in records)
        {
            var coords = record.GridId.Split('_');
            batch.Add(new HarmonizedFireEvent
            {
                Latitude = double.Parse(coords[0], CultureInfo.InvariantCulture),
                Longitude = double.Parse(coords[1], CultureInfo.InvariantCulture),
                Year = record.Year,
                Month = record.Month,
                TotalFrp = record.TotalFrp,
                ModisCount = record.ModisCount,
                ViirsCount = record.ViirsCount,
                HarmonizedCount = record.HarmonizedCount
            });

            count++;
            if (count % 10000 == 0)
            {
                context.FireEvents.AddRange(batch);
                context.SaveChanges();
                batch.Clear();
                Console.WriteLine($"Inserted {count} rows into Supabase...");
            }
        }

        if (batch.Any())
        {
            context.FireEvents.AddRange(batch);
            context.SaveChanges();
        }

        context.ChangeTracker.AutoDetectChangesEnabled = true;
        Console.WriteLine($"Finished processing {Path.GetFileName(filePath)}");
    }
}