# Stage 1: Build .NET 8 Web API
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy file định nghĩa project và restore layer độc lập để cache tối ưu
COPY ["StockTicker.Api.csproj", "./"]
RUN dotnet restore "StockTicker.Api.csproj"

# Copy toàn bộ mã nguồn và biên dịch Release
COPY . .
RUN dotnet publish "StockTicker.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Runtime siêu nhẹ
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "StockTicker.Api.dll"]
