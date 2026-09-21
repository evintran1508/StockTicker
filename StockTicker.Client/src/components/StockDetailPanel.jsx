import React from 'react';
import { X } from 'lucide-react';

export default function StockDetailPanel({ stock, detailLogs, onClose }) {
  if (!stock) return null;

  const isUp = stock.change > 0;
  const isDown = stock.change < 0;
  const priceColor = isUp ? 'var(--stock-up)' : isDown ? 'var(--stock-down)' : 'var(--stock-ref)';

  const p = Number(stock.currentPrice);

  // Tính bước giá chuẩn HOSE
  const getTick = (val) => {
    if (val < 10) return 0.01;
    if (val < 50) return 0.05;
    return 0.1;
  };

  const tick = getTick(p);

  // 3 bước giá ước tính tuân thủ 100% bước giá HOSE và biên độ [Sàn, Trần]
  const bids = [1, 2, 3].map((step) => {
    const raw = p - step * tick;
    const price = Math.max(stock.floorPrice, raw);
    return {
      price: price < 50 ? price.toFixed(2) : price.toFixed(1),
    };
  });

  const asks = [1, 2, 3].map((step) => {
    const raw = p + step * tick;
    const price = Math.min(stock.ceilingPrice, raw);
    return {
      price: price < 50 ? price.toFixed(2) : price.toFixed(1),
    };
  });

  // Giá trị giao dịch ước tính (Tỷ đồng)
  const turnoverBn = ((p * 1000 * (stock.volume || 0)) / 1000000000).toFixed(2);

  // Thanh biên độ ngày
  const rangeSpan = Math.max(0.01, (stock.dayHigh || p) - (stock.dayLow || p));
  const dayProgress = Math.min(100, Math.max(0, Math.round(((p - (stock.dayLow || p)) / rangeSpan) * 100)));

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      {/* Header Panel */}
      <div className="card-header" style={{ background: '#121722', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#1d2638', padding: '6px 12px', borderRadius: '6px', fontWeight: 800, fontSize: '15px', color: '#fff' }}>
            {stock.symbol}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f3f4f6' }}>{stock.companyName}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Sàn HOSE • Quy chuẩn bước giá {tick} • Biên độ ±7%</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
            KL: {stock.volume?.toLocaleString()} CP
          </span>
          {onClose && (
            <button onClick={onClose} className="btn" style={{ padding: '4px 8px' }} title="Đóng">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', padding: '16px' }}>
        {/* Khối 1: Thông số giao dịch */}
        <div style={{ background: '#0a0e17', borderRadius: '8px', padding: '14px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#9ca3af' }}>
              Thông tin phiên giao dịch
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px' }}>
              <div style={{ color: '#6b7280', fontSize: '11px' }}>Giá Tham Chiếu</div>
              <div className="mono-num color-ref" style={{ fontWeight: 700, fontSize: '14px' }}>{stock.referencePrice?.toFixed(2)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px' }}>
              <div style={{ color: '#6b7280', fontSize: '11px' }}>Giá Trần (+7%)</div>
              <div className="mono-num color-ceil" style={{ fontWeight: 700, fontSize: '14px' }}>{stock.ceilingPrice?.toFixed(2)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px' }}>
              <div style={{ color: '#6b7280', fontSize: '11px' }}>Giá Sàn (-7%)</div>
              <div className="mono-num color-floor" style={{ fontWeight: 700, fontSize: '14px' }}>{stock.floorPrice?.toFixed(2)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px' }}>
              <div style={{ color: '#6b7280', fontSize: '11px' }}>Giá Trị Khớp</div>
              <div className="mono-num" style={{ fontWeight: 700, fontSize: '14px', color: '#e5e7eb' }}>~{turnoverBn} Tỷ</div>
            </div>
          </div>

          {/* 3 Bước Giá */}
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>
              <span style={{ color: 'var(--stock-up)', fontWeight: 600 }}>Dư mua: {bids.map(b => b.price).join(' • ')}</span>
              <span style={{ color: 'var(--stock-down)', fontWeight: 600 }}>Dư bán: {asks.map(a => a.price).join(' • ')}</span>
            </div>
          </div>

          {/* Thanh biên độ ngày */}
          <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
              <span>Thấp: <b style={{ color: '#9ca3af' }}>{stock.dayLow?.toFixed(2)}</b></span>
              <span>Biên độ ngày</span>
              <span>Cao: <b style={{ color: '#9ca3af' }}>{stock.dayHigh?.toFixed(2)}</b></span>
            </div>
            <div style={{ height: '4px', background: '#1c253b', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  width: `${dayProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #3b82f6, #00e676)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Khối 2: Nhật ký khớp lệnh */}
        <div style={{ background: '#0a0e17', borderRadius: '8px', padding: '14px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#9ca3af' }}>
              Nhật ký khớp lệnh ({stock.symbol})
            </div>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>
              {detailLogs.length} lệnh gần nhất
            </span>
          </div>

          {/* Tiêu đề cột nhỏ gọn */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 8px',
              fontSize: '11px',
              color: '#6b7280',
              fontWeight: 600,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              marginBottom: '4px',
            }}
          >
            <span>Thời gian</span>
            <span>Giá khớp</span>
            <span>Biến động (+/-% )</span>
          </div>

          <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {detailLogs.length === 0 ? (
              <div style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>
                Đang nạp dữ liệu giao dịch cho mã {stock.symbol}...
              </div>
            ) : (
              detailLogs.map((log, index) => {
                const logUp = log.change > 0;
                const logDown = log.change < 0;
                const color = logUp ? 'var(--stock-up)' : logDown ? 'var(--stock-down)' : 'var(--stock-ref)';
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '5px 8px',
                      background: index === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      borderLeft: index === 0 ? `2px solid ${color}` : '2px solid transparent',
                    }}
                  >
                    <span style={{ color: '#9ca3af' }}>
                      {log.updatedAt}
                    </span>
                    <span style={{ fontWeight: 700, color }}>
                      {log.currentPrice.toFixed(2)}
                    </span>
                    <span style={{ color }}>
                      {log.change > 0 ? '+' : ''}{log.change.toFixed(2)} ({log.percentChange > 0 ? '+' : ''}{log.percentChange.toFixed(2)}%)
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
