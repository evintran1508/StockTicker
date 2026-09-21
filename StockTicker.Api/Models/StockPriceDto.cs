namespace StockTicker.Api.Models
{
    public class StockPriceDto
    {
        public string Symbol { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public decimal CurrentPrice { get; set; }
        public decimal ReferencePrice { get; set; }
        public decimal CeilingPrice { get; set; }
        public decimal FloorPrice { get; set; }
        public decimal Change { get; set; }
        public double PercentChange { get; set; }
        public decimal DayHigh { get; set; }
        public decimal DayLow { get; set; }
        public long Volume { get; set; }
        public string UpdatedAt { get; set; } = string.Empty;
    }
}
