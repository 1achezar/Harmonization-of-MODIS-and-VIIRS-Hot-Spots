using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    Console.WriteLine("Ensuring PostgreSQL database exists...");
    context.Database.EnsureCreated();

    string histPath = @"C:\Users\Lache\OneDrive\Документи\NasaSpaceApp\Harmonized_Output.csv";
    string currPath = @"C:\Users\Lache\OneDrive\Документи\NasaSpaceApp\Harmonized_Current.csv";

    Console.WriteLine("Starting data seed...");
    DataSeeder.SeedCsvData(context, histPath);
    DataSeeder.SeedCsvData(context, currPath);
}

app.MapControllerRoute(
    name: "globe",
    pattern: "globe",
    defaults: new { controller = "Home", action = "Globe" });

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();


app.Run();
