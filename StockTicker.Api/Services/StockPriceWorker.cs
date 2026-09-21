using Microsoft.AspNetCore.SignalR;
using StockTicker.Api.Hubs;
using StockTicker.Api.Models;

namespace StockTicker.Api.Services
{
    public class StockPriceWorker : BackgroundService
    {
        private readonly IHubContext<StockHub> _hubContext;
        private readonly MarketStore _marketStore;
        private readonly RealMarketDataService _marketDataService;
        private readonly ILogger<StockPriceWorker> _logger;

        public StockPriceWorker(
            IHubContext<StockHub> hubContext,
            MarketStore marketStore,
            RealMarketDataService marketDataService,
            ILogger<StockPriceWorker> logger)
        {
            _hubContext = hubContext;
            _marketStore = marketStore;
            _marketDataService = marketDataService;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Khởi động StockPriceWorker - 100% Real Data...");

            // BƯỚC 1: Đồng bộ song song tất cả mã VN30 dùng LINQ Lambda + Task.WhenAll
            var syncTasks = MarketStore.MonitoredSymbols.Select(async symbol =>
            {
                try
                {
                    var (quote, candles) = await _marketDataService.GetStockDataAsync(symbol, "3mo", "1d");
                    if (quote != null)
                    {
                        _marketStore.UpdatePrice(quote);
                        _marketStore.SeedInitialTradeLogs(quote);
                    }
                    if (candles != null && candles.Count > 0) _marketStore.SetCandles(symbol, candles);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Không thể nạp dữ liệu cho {Symbol}: {Message}", symbol, ex.Message);
                }
            });

            await Task.WhenAll(syncTasks);
            _logger.LogInformation("Đã đồng bộ xong dữ liệu thực tế và Ring Buffer. Bắt đầu luồng cập nhật...");

            // BƯỚC 2: Luồng polling cập nhật liên tục từ sàn
            int index = 0;
            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(3000, stoppingToken);

                var symbols = MarketStore.MonitoredSymbols;
                if (symbols.Length == 0) continue;

                var symbol = symbols[index % symbols.Length];
                index++;

                try
                {
                    var (realQuote, _) = await _marketDataService.GetStockDataAsync(symbol, "1d", "15m");
                    if (realQuote != null)
                    {
                        _marketStore.UpdatePrice(realQuote);

                        var tradeLog = new StockTradeLogDto
                        {
                            Symbol = realQuote.Symbol,
                            CurrentPrice = realQuote.CurrentPrice,
                            Change = realQuote.Change,
                            PercentChange = realQuote.PercentChange,
                            Volume = realQuote.Volume,
                            UpdatedAt = realQuote.UpdatedAt
                        };
                        _marketStore.AddTradeLog(realQuote.Symbol, tradeLog);

                        // Broadcast SignalR song song dùng Task.WhenAll + Lambda
                        await Task.WhenAll(
                            _hubContext.Clients.All.SendAsync("ReceiveMarketUpdate", realQuote, stoppingToken),
                            _hubContext.Clients.Group(realQuote.Symbol).SendAsync("ReceiveDetailUpdate", tradeLog, stoppingToken)
                        );
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Lỗi khi cập nhật dữ liệu thật cho {Symbol}: {Message}", symbol, ex.Message);
                }
            }
        }
    }
}
