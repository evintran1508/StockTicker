using Microsoft.AspNetCore.Mvc;
using StockTicker.Api.Services;

namespace StockTicker.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class StocksController : ControllerBase
    {
        private readonly MarketStore _marketStore;
        private readonly RealMarketDataService _marketDataService;

        public StocksController(MarketStore marketStore, RealMarketDataService marketDataService)
        {
            _marketStore = marketStore;
            _marketDataService = marketDataService;
        }

        // Dùng Lambda switch expression để lọc danh mục theo query param
        [HttpGet]
        public IActionResult GetMarketSnapshot([FromQuery] string? type = null, [FromQuery] string? q = null) =>
            type?.ToLower() switch
            {
                "gainers" => Ok(_marketStore.GetGainers()),
                "losers" => Ok(_marketStore.GetLosers()),
                _ when !string.IsNullOrWhiteSpace(q) => Ok(
                    _marketStore.Filter(s => s.Symbol.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                                            s.CompanyName.Contains(q, StringComparison.OrdinalIgnoreCase))),
                _ => Ok(_marketStore.GetAll())
            };

        // Expression-bodied member kết hợp pattern matching
        [HttpGet("{symbol}")]
        public IActionResult GetStockDetail(string symbol) =>
            _marketStore.GetBySymbol(symbol) is { } stock
                ? Ok(stock)
                : NotFound(new { message = $"Không tìm thấy mã {symbol}" });

        // Endpoint nến kỹ thuật
        [HttpGet("{symbol}/candles")]
        public async Task<IActionResult> GetStockCandles(string symbol, [FromQuery] string range = "1mo", [FromQuery] string interval = "1d")
        {
            var (_, candles) = await _marketDataService.GetStockDataAsync(symbol, range, interval);
            return Ok(candles);
        }

        // Endpoint lịch sử 20 lệnh khớp gần nhất từ In-Memory Ring Buffer
        [HttpGet("{symbol}/trades")]
        public IActionResult GetStockTrades(string symbol) =>
            Ok(_marketStore.GetTradeLogs(symbol));
    }
}
