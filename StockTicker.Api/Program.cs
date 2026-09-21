
using StockTicker.Api.Services;

namespace StockTicker
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            // Đăng ký SignalR
            builder.Services.AddSignalR();

            // Đăng ký BackgroundService để giả lập dữ liệu chứng khoán
            builder.Services.AddHostedService<StockTicker.Api.Services.StockPriceWorker>();

            // Đăng ký RealMarketDataService và HttpClient
            builder.Services.AddHttpClient<RealMarketDataService>();

            // Đăng ký MarketStore dùng chung
            builder.Services.AddSingleton<MarketStore>();

            // Đăng ký CORS để cho phép client từ các origin khác nhau truy cập
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowClient", policy =>
                {
                    policy.SetIsOriginAllowed(_ => true)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });
            builder.Services.AddControllers();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            
            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseCors("AllowClient");


            app.UseHttpsRedirection();

            app.UseAuthorization();


            app.MapControllers();

            app.MapHub<StockTicker.Api.Hubs.StockHub>("/stockHub");

            app.Run();
        }
    }
}
