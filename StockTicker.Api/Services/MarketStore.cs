using StockTicker.Api.Models;
using System.Collections.Concurrent;

namespace StockTicker.Api.Services
{
    public class MarketStore
    {
        private readonly ConcurrentDictionary<string, StockPriceDto> _stocks = new();
        private readonly ConcurrentDictionary<string, List<StockCandleDto>> _candles = new();

        public static readonly string[] MonitoredSymbols = new[]
        {
            "FPT", "HPG", "VNM", "MWG", "VIC", "VCB", "TCB", "SSI", "MSN", "VHM"
        };

        // Expression-bodied member với Lambda
        public IEnumerable<StockPriceDto> GetAll() => _stocks.Values;

        public StockPriceDto? GetBySymbol(string symbol) => _stocks.GetValueOrDefault(symbol.ToUpper());

        // Sử dụng Lambda trong AddOrUpdate để đảm bảo thread-safe
        public void UpdatePrice(StockPriceDto stock) =>
            _stocks.AddOrUpdate(stock.Symbol.ToUpper(), stock, (key, oldStock) => stock);

        public void SetCandles(string symbol, List<StockCandleDto> candles) =>
            _candles.AddOrUpdate(symbol.ToUpper(), candles, (key, oldCandles) => candles);

        public List<StockCandleDto> GetCandles(string symbol) =>
            _candles.GetValueOrDefault(symbol.ToUpper()) ?? new List<StockCandleDto>();

        // LINQ Lambda: Lọc top cổ phiếu tăng giá mạnh nhất (Gainers)
        public IEnumerable<StockPriceDto> GetGainers(int limit = 5) =>
            _stocks.Values
                .Where(s => s.Change > 0)
                .OrderByDescending(s => s.PercentChange)
                .Take(limit);

        // LINQ Lambda: Lọc top cổ phiếu giảm giá nhiều nhất (Losers)
        public IEnumerable<StockPriceDto> GetLosers(int limit = 5) =>
            _stocks.Values
                .Where(s => s.Change < 0)
                .OrderBy(s => s.PercentChange)
                .Take(limit);

        // Higher-order function: Tìm kiếm theo điều kiện động qua Lambda predicate
        public IEnumerable<StockPriceDto> Filter(Func<StockPriceDto, bool> predicate) =>
            _stocks.Values.Where(predicate);

        // In-Memory Ring Buffer lưu lịch sử 25 bước khớp gần nhất cho từng mã (Thread-safe)
        private readonly ConcurrentDictionary<string, ConcurrentQueue<StockTradeLogDto>> _tradeHistories = new();
        private const int MaxHistorySize = 25;

        public void AddTradeLog(string symbol, StockTradeLogDto log)
        {
            var queue = _tradeHistories.GetOrAdd(symbol.ToUpper(), _ => new ConcurrentQueue<StockTradeLogDto>());
            queue.Enqueue(log);
            while (queue.Count > MaxHistorySize && queue.TryDequeue(out _)) { }
        }

        public IEnumerable<StockTradeLogDto> GetTradeLogs(string symbol) =>
            _tradeHistories.TryGetValue(symbol.ToUpper(), out var queue)
                ? queue.Reverse().ToList()
                : Enumerable.Empty<StockTradeLogDto>();

        // Tự động khởi tạo lịch sử ban đầu từ dữ liệu thực tế nếu hàng đợi còn trống
        public void SeedInitialTradeLogs(StockPriceDto stock)
        {
            var sym = stock.Symbol.ToUpper();
            if (_tradeHistories.TryGetValue(sym, out var existingQueue) && !existingQueue.IsEmpty) return;

            var queue = _tradeHistories.GetOrAdd(sym, _ => new ConcurrentQueue<StockTradeLogDto>());
            var refP = stock.ReferencePrice;
            var currP = stock.CurrentPrice;

            int steps = 8;
            decimal stepDiff = (currP - refP) / steps;
            var now = DateTime.Now;

            for (int i = 0; i <= steps; i++)
            {
                var estPrice = HoseRuleHelper.RoundToTick(refP + stepDiff * i);
                estPrice = HoseRuleHelper.ClampPrice(estPrice, stock.FloorPrice, stock.CeilingPrice);
                var chg = estPrice - refP;
                var pct = refP > 0 ? (double)(chg / refP * 100m) : 0;
                var timeStr = now.AddSeconds(-((steps - i) * 35)).ToString("HH:mm:ss");

                queue.Enqueue(new StockTradeLogDto
                {
                    Symbol = sym,
                    CurrentPrice = estPrice,
                    Change = chg,
                    PercentChange = pct,
                    Volume = Math.Max(100, (stock.Volume / (steps + 1))),
                    UpdatedAt = timeStr
                });
            }
        }

        // Lambda Aggregate: Tính tổng khối lượng giao dịch toàn rổ
        public long GetTotalVolume() =>
            _stocks.Values.Aggregate(0L, (sum, stock) => sum + stock.Volume);
    }
}
