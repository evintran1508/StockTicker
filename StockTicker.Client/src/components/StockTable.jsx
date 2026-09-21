import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function StockTable({
  stocks,
  selectedSymbol,
  onSelectStock,
  flashingRows,
  searchTerm,
  onSearchChange,
}) {
  const [filterType, setFilterType] = useState('all'); // 'all', 'up', 'down'

  const filteredStocks = stocks
    .filter((s) => {
      if (filterType === 'up') return s.change > 0;
      if (filterType === 'down') return s.change < 0;
      return true;
    })
    .filter(
      (s) =>
        s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.companyName && s.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const getPriceClass = (stock, price) => {
    if (price === stock.ceilingPrice) return 'color-ceil';
    if (price === stock.floorPrice) return 'color-floor';
    if (price > stock.referencePrice) return 'color-up';
    if (price < stock.referencePrice) return 'color-down';
    return 'color-ref';
  };

  const gainersCount = stocks.filter((s) => s.change > 0).length;
  const losersCount = stocks.filter((s) => s.change < 0).length;

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
              Bảng Giá Khớp Lệnh
            </h3>
            <span style={{ fontSize: '11px', color: '#9ca3af', backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
              {stocks.length} mã
            </span>
          </div>

          {/* Thanh tìm kiếm */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Tìm mã hoặc tên công ty..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Thanh Bộ lọc Nhanh (Tabs: Tất cả / Tăng / Giảm) */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={() => setFilterType('all')}
            className="btn"
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              background: filterType === 'all' ? '#1e293b' : 'transparent',
              borderColor: filterType === 'all' ? '#3b82f6' : 'rgba(255,255,255,0.06)',
              color: filterType === 'all' ? '#fff' : '#9ca3af',
              fontWeight: 600,
            }}
          >
            Tất cả ({stocks.length})
          </button>
          <button
            onClick={() => setFilterType('up')}
            className="btn"
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              background: filterType === 'up' ? 'rgba(0,230,118,0.15)' : 'transparent',
              borderColor: filterType === 'up' ? 'var(--stock-up)' : 'rgba(255,255,255,0.06)',
              color: filterType === 'up' ? 'var(--stock-up)' : '#9ca3af',
              fontWeight: 600,
            }}
          >
            Tăng giá ({gainersCount})
          </button>
          <button
            onClick={() => setFilterType('down')}
            className="btn"
            style={{
              fontSize: '11px',
              padding: '4px 10px',
              background: filterType === 'down' ? 'rgba(255,82,82,0.15)' : 'transparent',
              borderColor: filterType === 'down' ? 'var(--stock-down)' : 'rgba(255,255,255,0.06)',
              color: filterType === 'down' ? 'var(--stock-down)' : '#9ca3af',
              fontWeight: 600,
            }}
          >
            Giảm giá ({losersCount})
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="stock-table">
          <thead>
            <tr style={{ background: '#0e121a', color: '#9ca3af', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left' }}>Mã</th>
              <th style={{ color: 'var(--stock-ceil)' }}>Trần</th>
              <th style={{ color: 'var(--stock-floor)' }}>Sàn</th>
              <th style={{ color: 'var(--stock-ref)' }}>TC</th>
              <th style={{ background: '#141a27', color: '#fff' }}>Khớp</th>
              <th style={{ background: '#141a27' }}>+/-</th>
              <th style={{ background: '#141a27' }}>%</th>
              <th style={{ color: '#9ca3af' }}>Cao</th>
              <th style={{ color: '#9ca3af' }}>Thấp</th>
              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tổng KL</th>
            </tr>
          </thead>
          <tbody>
            {filteredStocks.map((stock) => {
              const isSelected = selectedSymbol === stock.symbol;
              const flashClass = flashingRows[stock.symbol] || '';
              const priceClass = getPriceClass(stock, stock.currentPrice);

              return (
                <tr
                  key={stock.symbol}
                  onClick={() => onSelectStock(stock.symbol)}
                  className={flashClass}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.18)' : 'transparent',
                    boxShadow: isSelected ? 'inset 2px 0 0 #3b82f6' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                >
                  {/* Mã CK & Tên */}
                  <td style={{ padding: '8px 10px', textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>{stock.symbol}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', maxWidth: '110px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {stock.companyName}
                    </div>
                  </td>

                  {/* Giá Trần */}
                  <td className="mono-num color-ceil" style={{ fontWeight: 600 }}>
                    {stock.ceilingPrice?.toFixed(2)}
                  </td>

                  {/* Giá Sàn */}
                  <td className="mono-num color-floor" style={{ fontWeight: 600 }}>
                    {stock.floorPrice?.toFixed(2)}
                  </td>

                  {/* Giá TC */}
                  <td className="mono-num color-ref" style={{ fontWeight: 600 }}>
                    {stock.referencePrice?.toFixed(2)}
                  </td>

                  {/* Giá Khớp */}
                  <td
                    className={`mono-num ${priceClass}`}
                    style={{ fontWeight: 700, fontSize: '13px', background: 'rgba(255,255,255,0.02)' }}
                  >
                    {stock.currentPrice?.toFixed(2)}
                  </td>

                  {/* +/- */}
                  <td
                    className={`mono-num ${priceClass}`}
                    style={{ fontWeight: 600, background: 'rgba(255,255,255,0.02)' }}
                  >
                    {stock.change > 0 ? '+' : ''}{stock.change?.toFixed(2)}
                  </td>

                  {/* % */}
                  <td
                    className={`mono-num ${priceClass}`}
                    style={{ fontWeight: 600, background: 'rgba(255,255,255,0.02)' }}
                  >
                    {stock.percentChange > 0 ? '+' : ''}{stock.percentChange?.toFixed(2)}%
                  </td>

                  {/* Cao */}
                  <td className="mono-num" style={{ color: '#9ca3af' }}>
                    {stock.dayHigh?.toFixed(2)}
                  </td>

                  {/* Thấp */}
                  <td className="mono-num" style={{ color: '#9ca3af' }}>
                    {stock.dayLow?.toFixed(2)}
                  </td>

                  {/* Tổng KL */}
                  <td className="mono-num" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500, color: '#e5e7eb' }}>
                    {stock.volume?.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
