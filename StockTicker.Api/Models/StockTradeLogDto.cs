namespace StockTicker.Api.Models
{
    public class StockTradeLogDto
    {
        public string Symbol { get; set; } = string.Empty;
        public decimal CurrentPrice { get; set; }
        public decimal Change { get; set; }
        public double PercentChange { get; set; }
        public long Volume { get; set; }
        public string UpdatedAt { get; set; } = string.Empty;
    }
}
