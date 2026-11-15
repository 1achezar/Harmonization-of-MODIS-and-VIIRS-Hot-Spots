# Build stage using official .NET 10 SDK
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY ["Harmonization of MODIS and VIIRS Hot Spots/Harmonization of MODIS and VIIRS Hot Spots.csproj", "Harmonization of MODIS and VIIRS Hot Spots/"]
RUN dotnet restore "Harmonization of MODIS and VIIRS Hot Spots/Harmonization of MODIS and VIIRS Hot Spots.csproj"

# Copy remaining source code and publish release build
COPY . .
WORKDIR "/src/Harmonization of MODIS and VIIRS Hot Spots"
RUN dotnet publish "Harmonization of MODIS and VIIRS Hot Spots.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage using lightweight ASP.NET 10 runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Harmonization of MODIS and VIIRS Hot Spots.dll"]
