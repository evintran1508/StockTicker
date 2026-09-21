import React, { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import MarketIndices from './components/MarketIndices';
import StockTable from './components/StockTable';
import TradingViewChart from './components/TradingViewChart';
import StockDetailPanel from './components/StockDetailPanel';

export default function App() {
  const [stocks, setStocks] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('FPT');
  const [timeRange, setTimeRange] = useState('3mo');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionUrl, setConnectionUrl] = useState('');
  const [flashingRows, setFlashingRows] = useState({});
  const [detailLogs, setDetailLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const connectionRef = useRef(null);
  const selectedSymbolRef = useRef(selectedSymbol);
  const tradeCacheRef = useRef({});

  useEffect(() => {
    selectedSymbolRef.current = selectedSymbol;
  }, [selectedSymbol]);

  // Nạp tức thì lịch sử khớp lệnh từ In-Memory Ring Buffer của Backend
  const fetchTradesForSymbol = async (sym) => {
    // 1. Phục vụ ngay từ Client Cache (0ms)
    if (tradeCacheRef.current[sym]?.length > 0) {
      setDetailLogs(tradeCacheRef.current[sym]);
    }

    // 2. Kéo dữ liệu Ring Buffer mới nhất từ API
    try {
      const res = await fetch(`http://localhost:5049/stocks/${sym}/trades`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          tradeCacheRef.current[sym] = data;
          if (selectedSymbolRef.current === sym) {
            setDetailLogs(data);
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi tải lịch sử khớp lệnh:', e);
    }
  };

  // 1. Tải dữ liệu ban đầu từ REST API & nạp sẵn Trade Logs FPT
  useEffect(() => {
    const fetchInitialData = async () => {
      const urls = ['https://localhost:7187', 'http://localhost:5049'];
      for (const url of urls) {
        try {
          const res = await fetch(`${url}/stocks`);
          if (res.ok) {
            const data = await res.json();
            setStocks(data);
            break;
          }
        } catch (e) {
          // Thử tiếp fallback
        }
      }
    };

    fetchInitialData();
    fetchTradesForSymbol('FPT');
  }, []);

  // 2. Thiết lập kết nối SignalR
  useEffect(() => {
    const primaryUrl = 'https://localhost:7187/stockHub';
    const fallbackUrl = 'http://localhost:5049/stockHub';

    const connectHub = async (url) => {
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(url)
        .withAutomaticReconnect([0, 2000, 5000, 10000])
        .build();

      // 1. Nhận cập nhật toàn sàn (Clients.All)
      connection.on('ReceiveMarketUpdate', (data) => {
        setStocks((prev) => {
          const exists = prev.some((s) => s.symbol === data.symbol);
          if (exists) {
            return prev.map((s) => (s.symbol === data.symbol ? data : s));
          }
          return [...prev, data];
        });

        // Kích hoạt hiệu ứng flash
        const animClass = data.change >= 0 ? 'flash-up' : 'flash-down';
        setFlashingRows((prev) => ({ ...prev, [data.symbol]: animClass }));
        setTimeout(() => {
          setFlashingRows((prev) => {
            const copy = { ...prev };
            delete copy[data.symbol];
            return copy;
          });
        }, 700);
      });

      // 2. Nhận cập nhật riêng từ Group mã đang chọn (Clients.Group)
      connection.on('ReceiveDetailUpdate', (data) => {
        // Cập nhật vào Client-side Cache
        const existing = tradeCacheRef.current[data.symbol] || [];
        const updated = [data, ...existing.slice(0, 24)];
        tradeCacheRef.current[data.symbol] = updated;

        // Cập nhật giao diện nếu đang xem đúng mã đó
        if (data.symbol === selectedSymbolRef.current) {
          setDetailLogs(updated);
        }
      });

      await connection.start();
      connectionRef.current = connection;
      setIsConnected(true);
      setConnectionUrl(url);

      // Join group mặc định FPT
      if (selectedSymbolRef.current) {
        connection.invoke('JoinStockGroup', selectedSymbolRef.current).catch(console.error);
      }
    };

    connectHub(primaryUrl).catch((err) => {
      console.warn('Lỗi kết nối HTTPS, chuyển sang HTTP:', err);
      connectHub(fallbackUrl).catch((fallbackErr) => {
        console.error('Không thể kết nối SignalR Hub:', fallbackErr);
        setIsConnected(false);
      });
    });

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, []);

  // 3. Xử lý khi người dùng chọn mã cổ phiếu: Nạp tức thì không để màn hình trống
  const handleSelectStock = async (symbol) => {
    if (symbol === selectedSymbol) return;

    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      if (selectedSymbol) {
        await connectionRef.current.invoke('LeaveStockGroup', selectedSymbol).catch(console.error);
      }
      await connectionRef.current.invoke('JoinStockGroup', symbol).catch(console.error);
    }

    setSelectedSymbol(symbol);
    fetchTradesForSymbol(symbol);
  };

  const selectedStockData = stocks.find((s) => s.symbol === selectedSymbol);

  const quickSymbols = ['FPT', 'HPG', 'VNM', 'MWG', 'VCB', 'VIC', 'TCB', 'SSI'];

  return (
    <div className="app-container">
      {/* Header chính */}
      <header className="header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em', color: '#fff' }}>
              Bảng Giá Trực Tuyến VN30
            </h1>
            <p style={{ fontSize: '11px', color: '#6b7280' }}>Sở Giao dịch Chứng khoán TP. Hồ Chí Minh (HOSE)</p>
          </div>
        </div>

        {/* Mã chọn nhanh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>Mã theo dõi:</span>
          {quickSymbols.map((sym) => (
            <button
              key={sym}
              onClick={() => handleSelectStock(sym)}
              className="btn"
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: selectedSymbol === sym ? '#2563eb' : 'transparent',
                borderColor: selectedSymbol === sym ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
                color: selectedSymbol === sym ? '#fff' : '#9ca3af',
              }}
            >
              {sym}
            </button>
          ))}
        </div>
      </header>

      {/* Dải chỉ số thị trường (Ticker Tape) */}
      <MarketIndices stocks={stocks} isConnected={isConnected} />

      {/* Nội dung Dashboard */}
      <main className="dashboard-main">
        <div className="dashboard-grid">
          {/* Cột Bảng giá chứng khoán (nhỏ gọn hơn) */}
          <div className="dashboard-col-table">
            <StockTable
              stocks={stocks}
              selectedSymbol={selectedSymbol}
              onSelectStock={handleSelectStock}
              flashingRows={flashingRows}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>

          {/* Cột Biểu đồ & Chi tiết (chiếm diện tích lớn hơn) */}
          <div className="dashboard-col-chart">
            <TradingViewChart
              selectedStock={selectedSymbol}
              currentPriceData={selectedStockData}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />

            <StockDetailPanel
              stock={selectedStockData}
              detailLogs={detailLogs}
              onClose={() => setSelectedSymbol(null)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
