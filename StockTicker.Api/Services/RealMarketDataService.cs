using StockTicker.Api.Models;
using System.Text.Json;

namespace StockTicker.Api.Services
{
    public class RealMarketDataService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<RealMarketDataService> _logger;

        public RealMarketDataService(HttpClient httpClient, ILogger<RealMarketDataService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        }

        public async Task<(StockPriceDto? Quote, List<StockCandleDto> Candles)> GetStockDataAsync(string symbol, string range = "1mo", string interval = "1d")
        {
            var ticker = symbol.EndsWith(".VN", StringComparison.OrdinalIgnoreCase) ? symbol.ToUpper() : $"{symbol.ToUpper()}.VN";
            var cleanSymbol = symbol.Replace(".VN", "", StringComparison.OrdinalIgnoreCase).ToUpper();

            if (range == "1d" && interval == "1d")
            {
                interval = "15m";
            }

            try
            {
                var url = $"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval={interval}&range={range}";
                var response = await _httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Yahoo Finance trả về mã {StatusCode} cho {Symbol}", response.StatusCode, cleanSymbol);
                    return (null, new List<StockCandleDto>());
                }

                var jsonString = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonString);

                var chart = doc.RootElement.GetProperty("chart");
                if (!chart.TryGetProperty("result", out var resultArr) || resultArr.ValueKind != JsonValueKind.Array || resultArr.GetArrayLength() == 0)
                {
                    return (null, new List<StockCandleDto>());
                }

                var resultObj = resultArr[0];
                var meta = resultObj.GetProperty("meta");

                var regularPrice = meta.TryGetProperty("regularMarketPrice", out var regP) && regP.ValueKind == JsonValueKind.Number ? regP.GetDecimal() : 0;
                var prevClose = meta.TryGetProperty("chartPreviousClose", out var prevC) && prevC.ValueKind == JsonValueKind.Number ? prevC.GetDecimal() : regularPrice;
                var longName = meta.TryGetProperty("longName", out var lName) ? lName.GetString() : cleanSymbol;
                var rawDayHigh = meta.TryGetProperty("regularMarketDayHigh", out var dHigh) && dHigh.ValueKind == JsonValueKind.Number ? dHigh.GetDecimal() : regularPrice;
                var rawDayLow = meta.TryGetProperty("regularMarketDayLow", out var dLow) && dLow.ValueKind == JsonValueKind.Number ? dLow.GetDecimal() : regularPrice;
                var volume = meta.TryGetProperty("regularMarketVolume", out var dVol) && dVol.ValueKind == JsonValueKind.Number ? dVol.GetInt64() : 0;

                // Chuẩn hóa sang nghìn VND (ví dụ: 66400đ -> 66.4)
                decimal scale = regularPrice > 1000 ? 1000m : 1m;

                // ÁP DỤNG QUY CHUẨN SÀN HOSE 100%
                decimal refPrice = HoseRuleHelper.RoundToTick(prevClose / scale);
                decimal ceilingPrice = HoseRuleHelper.CalculateCeilingPrice(refPrice);
                decimal floorPrice = HoseRuleHelper.CalculateFloorPrice(refPrice);

                decimal currentPrice = HoseRuleHelper.ClampPrice(regularPrice / scale, floorPrice, ceilingPrice);
                decimal dayHigh = HoseRuleHelper.ClampDayHigh(rawDayHigh / scale, currentPrice, ceilingPrice);
                decimal dayLow = HoseRuleHelper.ClampDayLow(rawDayLow / scale, currentPrice, floorPrice);

                decimal change = currentPrice - refPrice;
                double percentChange = refPrice > 0 ? (double)Math.Round((change / refPrice) * 100, 2) : 0;

                var quote = new StockPriceDto
                {
                    Symbol = cleanSymbol,
                    CompanyName = longName ?? cleanSymbol,
                    CurrentPrice = currentPrice,
                    ReferencePrice = refPrice,
                    CeilingPrice = ceilingPrice,
                    FloorPrice = floorPrice,
                    Change = change,
                    PercentChange = percentChange,
                    DayHigh = dayHigh,
                    DayLow = dayLow,
                    Volume = volume,
                    UpdatedAt = DateTime.Now.ToString("HH:mm:ss")
                };

                // Trích xuất nến lịch sử thực tế
                var candlesDict = new Dictionary<string, StockCandleDto>();

                if (resultObj.TryGetProperty("timestamp", out var timestamps) &&
                    resultObj.TryGetProperty("indicators", out var indicators) &&
                    indicators.TryGetProperty("quote", out var quoteArr) &&
                    quoteArr.GetArrayLength() > 0)
                {
                    var quoteData = quoteArr[0];
                    var opens = quoteData.GetProperty("open");
                    var highs = quoteData.GetProperty("high");
                    var lows = quoteData.GetProperty("low");
                    var closes = quoteData.GetProperty("close");
                    var volumes = quoteData.GetProperty("volume");

                    int count = timestamps.GetArrayLength();
                    for (int i = 0; i < count; i++)
                    {
                        if (opens[i].ValueKind != JsonValueKind.Number ||
                            highs[i].ValueKind != JsonValueKind.Number ||
                            lows[i].ValueKind != JsonValueKind.Number ||
                            closes[i].ValueKind != JsonValueKind.Number)
                        {
                            continue;
                        }

                        long unixTime = timestamps[i].GetInt64();
                        string timeKey = unixTime.ToString();

                        decimal o = HoseRuleHelper.RoundToTick(opens[i].GetDecimal() / scale);
                        decimal h = HoseRuleHelper.RoundToTick(highs[i].GetDecimal() / scale);
                        decimal l = HoseRuleHelper.RoundToTick(lows[i].GetDecimal() / scale);
                        decimal c = HoseRuleHelper.RoundToTick(closes[i].GetDecimal() / scale);
                        long v = volumes[i].ValueKind == JsonValueKind.Number ? volumes[i].GetInt64() : 0;

                        candlesDict[timeKey] = new StockCandleDto
                        {
                            Time = timeKey,
                            Open = o,
                            High = h,
                            Low = l,
                            Close = c,
                            Volume = v
                        };
                    }
                }

                return (quote, candlesDict.Values.ToList());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy dữ liệu thật từ Yahoo Finance cho {Symbol}", cleanSymbol);
                return (null, new List<StockCandleDto>());
            }
        }
    }
}
