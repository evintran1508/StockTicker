import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, AreaSeries } from 'lightweight-charts';
import { RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function TradingViewChart({ selectedStock, currentPriceData, timeRange, onTimeRangeChange }) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const areaSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const priceLineRef = useRef(null);
  const lastCandleRef = useRef(null);

  const [chartType, setChartType] = useState('candle'); // 'candle' hoặc 'area'
  const [legendData, setLegendData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tickAnim, setTickAnim] = useState(false);

  // 1. Khởi tạo biểu đồ TradingView
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0f141f' },
        textColor: '#9ca3af',
        fontFamily: "'Inter', system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: {
          color: '#60a5fa',
          width: 1,
          style: 3,
        },
        horzLine: {
          color: '#60a5fa',
          width: 1,
          style: 3,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        rightOffset: 0,
        lockVisibleTimeRangeOnResize: true,
      },
      handleScroll: false,
      handleScale: false,
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.22,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: window.innerWidth < 640 ? 320 : window.innerWidth < 1024 ? 400 : window.innerWidth < 1440 ? 480 : 540,
    });

    // Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00e676',
      downColor: '#ff5252',
      borderVisible: false,
      wickUpColor: '#00e676',
      wickDownColor: '#ff5252',
    });

    // Area Series (Đường sóng diện tích chuẩn Google Finance / TradingView)
    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: 'rgba(37, 99, 235, 0.35)',
      bottomColor: 'rgba(37, 99, 235, 0.0)',
      lineColor: '#3b82f6',
      lineWidth: 2,
    });
    areaSeries.applyOptions({ visible: false }); // Mặc định hiển thị Candlestick

    // Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartInstanceRef.current = chart;
    candleSeriesRef.current = candleSeries;
    areaSeriesRef.current = areaSeries;
    volumeSeriesRef.current = volumeSeries;

    // Lắng nghe di chuyển chuột để cập nhật thanh thông số (Legend)
    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setLegendData(null);
        return;
      }
      const cData = param.seriesData.get(candleSeries);
      const aData = param.seriesData.get(areaSeries);
      const vData = param.seriesData.get(volumeSeries);

      let timeDisplay = String(param.time);
      if (typeof param.time === 'number') {
        const dateObj = new Date(param.time * 1000);
        timeDisplay = dateObj.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      if (cData) {
        setLegendData({
          time: timeDisplay,
          open: cData.open,
          high: cData.high,
          low: cData.low,
          close: cData.close,
          volume: vData ? vData.value : 0,
        });
      } else if (aData) {
        setLegendData({
          time: timeDisplay,
          close: aData.value,
          volume: vData ? vData.value : 0,
        });
      }
    });

    // Tự động căn chỉnh khi resize màn hình
    const handleResize = () => {
      if (chartContainerRef.current) {
        const newWidth = chartContainerRef.current.clientWidth;
        const newHeight = window.innerWidth < 640 ? 320 : window.innerWidth < 1024 ? 400 : window.innerWidth < 1440 ? 480 : 540;
        chart.applyOptions({ width: newWidth, height: newHeight });
        chart.timeScale().fitContent();
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // 2. Chuyển đổi giữa Biểu đồ Nến (Candlestick) và Đường Giá (Area Line)
  useEffect(() => {
    if (!candleSeriesRef.current || !areaSeriesRef.current) return;
    if (chartType === 'candle') {
      candleSeriesRef.current.applyOptions({ visible: true });
      areaSeriesRef.current.applyOptions({ visible: false });
    } else {
      candleSeriesRef.current.applyOptions({ visible: false });
      areaSeriesRef.current.applyOptions({ visible: true });
    }
  }, [chartType]);

  // 3. Tải nến theo mã và timeframe
  useEffect(() => {
    if (!selectedStock || !candleSeriesRef.current) return;

    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const endpoint = API_BASE_URL
          ? `${API_BASE_URL}/stocks/${selectedStock}/candles?range=${timeRange}`
          : `/stocks/${selectedStock}/candles?range=${timeRange}`;
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error('Failed to fetch candles');
        const data = await res.json();

        if (!isMounted || !Array.isArray(data) || data.length === 0) return;

        // Chuẩn hóa timestamp sang số nguyên (UTCTimestamp tính bằng giây)
        const getTimeNumber = (timeVal) => {
          if (typeof timeVal === 'number') return timeVal;
          const str = String(timeVal).trim();
          if (!isNaN(str) && !str.includes('-')) {
            return parseInt(str, 10);
          }
          const [year, month, day] = str.split('-').map(Number);
          return Math.floor(Date.UTC(year, month - 1, day, 0, 0, 0) / 1000);
        };

        // Khử trùng lặp và sắp xếp tăng dần
        const candleMap = new Map();
        for (const d of data) {
          const t = getTimeNumber(d.time);
          const o = Number(d.open);
          const h = Number(d.high);
          const l = Number(d.low);
          const c = Number(d.close);
          const v = Number(d.volume || 0);

          if (!isNaN(t) && o > 0 && c > 0) {
            candleMap.set(t, { time: t, open: o, high: h, low: l, close: c, volume: v });
          }
        }

        const formattedCandles = Array.from(candleMap.values()).sort((a, b) => a.time - b.time);
        if (formattedCandles.length === 0) return;

        const formattedAreas = formattedCandles.map((d) => ({
          time: d.time,
          value: d.close,
        }));

        const formattedVolumes = formattedCandles.map((d) => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(0, 230, 118, 0.45)' : 'rgba(255, 82, 82, 0.45)',
        }));

        // Lưu nến cuối cùng để cập nhật real-time
        lastCandleRef.current = { ...formattedCandles[formattedCandles.length - 1] };

        candleSeriesRef.current.setData(formattedCandles);
        areaSeriesRef.current.setData(formattedAreas);
        volumeSeriesRef.current.setData(formattedVolumes);

        // Vẽ đường giá hiện tại
        if (priceLineRef.current) {
          candleSeriesRef.current.removePriceLine(priceLineRef.current);
        }
        const lastP = formattedCandles[formattedCandles.length - 1].close;
        priceLineRef.current = candleSeriesRef.current.createPriceLine({
          price: lastP,
          color: '#38bdf8',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'LIVE',
        });

        chartInstanceRef.current?.timeScale().fitContent();
      } catch (err) {
        console.warn('Lỗi tải dữ liệu nến:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedStock, timeRange]);

  // 4. 🔥 CẬP NHẬT TRỰC TIẾP BIỂU ĐỒ KHI CÓ TICK REAL-TIME TỪ SIGNALR 🔥
  useEffect(() => {
    if (!currentPriceData || currentPriceData.symbol !== selectedStock) return;
    if (!candleSeriesRef.current || !lastCandleRef.current) return;

    const newPrice = Number(currentPriceData.currentPrice);
    if (!newPrice || isNaN(newPrice)) return;

    // Kích hoạt hiệu ứng chớp sáng ở giá
    setTickAnim(true);
    const timer = setTimeout(() => setTickAnim(false), 500);

    try {
      const last = lastCandleRef.current;
      const updatedCandle = {
        time: last.time,
        open: last.open,
        high: Math.max(last.high, newPrice),
        low: Math.min(last.low, newPrice),
        close: newPrice,
      };

      // Cập nhật nến cuối cùng để biểu đồ nảy giá lên/xuống trực tiếp
      candleSeriesRef.current.update(updatedCandle);

      // Cập nhật đường Area
      if (areaSeriesRef.current) {
        areaSeriesRef.current.update({
          time: last.time,
          value: newPrice,
        });
      }

      // Cập nhật đường chỉ báo ngang
      if (priceLineRef.current) {
        priceLineRef.current.applyOptions({
          price: newPrice,
          color: currentPriceData.change >= 0 ? '#00e676' : '#ff5252',
        });
      }

      // Lưu lại trạng thái nến
      lastCandleRef.current = updatedCandle;
    } catch (e) {
      console.warn('Lỗi cập nhật tick biểu đồ:', e);
    }

    return () => clearTimeout(timer);
  }, [currentPriceData, selectedStock]);

  const ranges = [
    { key: '1d', label: '1 Ngày' },
    { key: '1mo', label: '1 Tháng' },
    { key: '3mo', label: '3 Tháng' },
    { key: '6mo', label: '6 Tháng' },
    { key: '1y', label: '1 Năm' },
  ];

  const isUp = currentPriceData ? currentPriceData.change >= 0 : true;
  const priceColor = isUp ? 'var(--stock-up)' : 'var(--stock-down)';

  return (
    <div className="card">
      {/* Thanh Header Tài Chính (Giống TradingView / Google Finance) */}
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {/* Khối giá lớn trực quan */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                {selectedStock}
              </span>
              <span style={{ fontSize: '11px', color: '#9ca3af', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                HOSE
              </span>
            </div>

            {currentPriceData && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '2px' }}>
                <span
                  className="mono-num"
                  style={{
                    fontSize: '26px',
                    fontWeight: 800,
                    color: priceColor,
                    transition: 'color 0.2s ease',
                  }}
                >
                  {currentPriceData.currentPrice?.toFixed(2)}
                </span>
                <span
                  className="mono-num"
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: priceColor,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  {isUp ? '+' : ''}{currentPriceData.change?.toFixed(2)} ({isUp ? '+' : ''}{currentPriceData.percentChange?.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>

          {loading && <RefreshCw size={14} className="animate-spin" style={{ color: '#6b7280' }} />}
        </div>

        {/* Nút điều khiển: Loại biểu đồ & Khung thời gian */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Toggle Loại biểu đồ */}
          <div style={{ display: 'flex', background: '#0a0d14', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setChartType('candle')}
              style={{
                background: chartType === 'candle' ? '#1f293d' : 'transparent',
                color: chartType === 'candle' ? '#60a5fa' : '#6b7280',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              Nến
            </button>
            <button
              onClick={() => setChartType('area')}
              style={{
                background: chartType === 'area' ? '#1f293d' : 'transparent',
                color: chartType === 'area' ? '#60a5fa' : '#6b7280',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              Đường
            </button>
          </div>

          {/* Timeframe selector */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {ranges.map((r) => (
              <button
                key={r.key}
                onClick={() => onTimeRangeChange(r.key)}
                className="btn"
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  fontWeight: 600,
                  backgroundColor: timeRange === r.key ? '#2563eb' : 'transparent',
                  borderColor: timeRange === r.key ? '#3b82f6' : 'rgba(255,255,255,0.06)',
                  color: timeRange === r.key ? '#fff' : '#9ca3af',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dải thông số nến khi rê chuột (OHLC Legend) */}
      <div
        style={{
          padding: '6px 16px',
          background: '#090d14',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          gap: '16px',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
          color: '#9ca3af',
          flexWrap: 'wrap',
        }}
      >
        {legendData ? (
          <>
            <span>Thời gian: <b style={{ color: '#fff' }}>{legendData.time}</b></span>
            {legendData.open !== undefined && (
              <span>Mở (O): <b style={{ color: '#fff' }}>{legendData.open?.toFixed(2)}</b></span>
            )}
            {legendData.high !== undefined && (
              <span>Cao (H): <b style={{ color: 'var(--stock-up)' }}>{legendData.high?.toFixed(2)}</b></span>
            )}
            {legendData.low !== undefined && (
              <span>Thấp (L): <b style={{ color: 'var(--stock-down)' }}>{legendData.low?.toFixed(2)}</b></span>
            )}
            <span>Đóng (C): <b style={{ color: '#fff' }}>{legendData.close?.toFixed(2)}</b></span>
            <span>Khối lượng: <b style={{ color: '#38bdf8' }}>{legendData.volume?.toLocaleString()}</b></span>
          </>
        ) : (
          <span>Di chuyển chuột trên biểu đồ để xem thông số nến chi tiết</span>
        )}
      </div>

      {/* Canvas TradingView */}
      <div ref={chartContainerRef} style={{ width: '100%' }} />
    </div>
  );
}
