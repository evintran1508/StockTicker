namespace StockTicker.Api.Services
{
    public static class HoseRuleHelper
    {
        /// <summary>
        /// Xác định bước giá HOSE bằng Lambda Switch Expression
        /// </summary>
        public static decimal GetTickSize(decimal price) => price switch
        {
            < 10m => 0.01m,
            < 50m => 0.05m,
            _ => 0.1m
        };

        /// <summary>
        /// Hàm bậc cao (Higher-order Function) nhận Lambda Delegate làm chiến lược làm tròn
        /// </summary>
        public static decimal ApplyTickStrategy(decimal price, Func<decimal, decimal, decimal> rounder) =>
            rounder(price, GetTickSize(price));

        /// <summary>
        /// Làm tròn giá thông thường theo bước giá (Nearest Tick) dùng Lambda
        /// </summary>
        public static decimal RoundToTick(decimal price) =>
            ApplyTickStrategy(price, (p, tick) => Math.Round(p / tick, MidpointRounding.AwayFromZero) * tick);

        /// <summary>
        /// Làm tròn xuống theo bước giá (Floor to tick) dùng Lambda
        /// </summary>
        public static decimal RoundDownToTick(decimal price) =>
            ApplyTickStrategy(price, (p, tick) => Math.Floor(p / tick) * tick);

        /// <summary>
        /// Làm tròn lên theo bước giá (Ceil to tick) dùng Lambda
        /// </summary>
        public static decimal RoundUpToTick(decimal price) =>
            ApplyTickStrategy(price, (p, tick) => Math.Ceiling(p / tick) * tick);

        /// <summary>
        /// Tính giá Trần sàn HOSE dùng Lambda: Làm tròn xuống của (TC * 1.07)
        /// </summary>
        public static decimal CalculateCeilingPrice(decimal refPrice) =>
            RoundDownToTick(RoundToTick(refPrice) * 1.07m);

        /// <summary>
        /// Tính giá Sàn sàn HOSE dùng Lambda: Làm tròn lên của (TC * 0.93)
        /// </summary>
        public static decimal CalculateFloorPrice(decimal refPrice) =>
            RoundUpToTick(RoundToTick(refPrice) * 0.93m);

        /// <summary>
        /// Kẹp giá khớp [Sàn, Trần] dùng Lambda và Math.Clamp
        /// </summary>
        public static decimal ClampPrice(decimal price, decimal floorPrice, decimal ceilingPrice) =>
            Math.Clamp(RoundToTick(price), floorPrice, ceilingPrice);

        /// <summary>
        /// Kẹp giá Cao nhất (DayHigh) không vượt quá Trần dùng Lambda
        /// </summary>
        public static decimal ClampDayHigh(decimal dayHigh, decimal currentPrice, decimal ceilingPrice) =>
            Math.Min(ceilingPrice, RoundToTick(Math.Max(dayHigh, currentPrice)));

        /// <summary>
        /// Kẹp giá Thấp nhất (DayLow) không thủng Sàn dùng Lambda
        /// </summary>
        public static decimal ClampDayLow(decimal dayLow, decimal currentPrice, decimal floorPrice) =>
            Math.Max(floorPrice, RoundToTick(dayLow > 0 ? Math.Min(dayLow, currentPrice) : currentPrice));
    }
}
