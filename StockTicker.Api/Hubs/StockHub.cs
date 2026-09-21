using Microsoft.AspNetCore.SignalR;

namespace StockTicker.Api.Hubs
{
    public class StockHub : Hub
    {
        // Khi người dùng bấm vào xem chi tiết 1 mã, họ sẽ join vào group riêng của mã đó
        public async Task JoinStockGroup(string symbol)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, symbol.ToUpper());
        }

        // Khi người dùng rời khỏi trang chi tiết
        public async Task LeaveStockGroup(string symbol)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, symbol.ToUpper());
        }


    }
}
