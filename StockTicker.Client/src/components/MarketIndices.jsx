import React from 'react';

export default function MarketIndices({ stocks, isConnected }) {
  const totalStocks = stocks.length;
  const gainers = stocks.filter((s) => s.change > 0).length;
  const losers = stocks.filter((s) => s.change < 0).length;
  const unchanged = stocks.filter((s) => s.change === 0).length;

  const totalVolume = stocks.reduce((acc, s) => acc + (s.volume || 0), 0);

  // Tính trung bình biến động rổ VN30
  const avgChangePct = totalStocks > 0
    ? stocks.reduce((acc, s) => acc + (s.percentChange || 0), 0) / totalStocks
    : 0;
  const isUp = avgChangePct >= 0;

  return (
    <div className="market-ticker-tape">
      {/* Trạng thái kết nối */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: isConnected ? '#00e676' : '#ff5252',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#00e676' : '#ff5252',
              display: 'inline-block',
            }}
          />
          {isConnected ? 'Trực tuyến' : 'Mất kết nối'}
        </span>
      </div>

      {/* Thống kê thực tế */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#9ca3af' }}>Biến động VN30:</span>
          <span
            className="mono-num"
            style={{
              fontWeight: 700,
              color: isUp ? 'var(--stock-up)' : 'var(--stock-down)',
            }}
          >
            {isUp ? '+' : ''}{avgChangePct.toFixed(2)}%
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#9ca3af' }}>Độ rộng:</span>
          <span style={{ color: 'var(--stock-up)', fontWeight: 600 }}>▲ {gainers}</span>
          <span style={{ color: 'var(--stock-ref)', fontWeight: 600 }}>■ {unchanged}</span>
          <span style={{ color: 'var(--stock-down)', fontWeight: 600 }}>▼ {losers}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#9ca3af' }}>Tổng KL:</span>
          <span className="mono-num" style={{ color: '#e5e7eb', fontWeight: 600 }}>
            {totalVolume.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
