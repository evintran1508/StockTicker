namespace StockTicker.Api.Models
{
    public class StockCandleDto
    {
        public string Time { get; set; } = string.Empty; // Format: "YYYY-MM-DD"
        public decimal Open { get; set; }
        public decimal High { get; set; }
        public decimal Low { get; set; }
        public decimal Close { get; set; }
        public long Volume { get; set; }
    }
}
