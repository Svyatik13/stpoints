import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import { api } from '@/lib/api';

export default function STChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);
  const [series, setSeries] = useState<ISeriesApi<"Candlestick"> | null>(null);
  const [period, setPeriod] = useState('1mo');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const newChart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid' as any, color: 'transparent' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      crosshair: {
        mode: 0,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
      },
    });

    const newSeries = newChart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    setChart(newChart);
    setSeries(newSeries);

    const handleResize = () => {
      if (chartContainerRef.current) {
        newChart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      newChart.remove();
    };
  }, []);

  useEffect(() => {
    if (!series) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const res = await api.wallet.price();
        const basePrice = parseFloat(res.price) || 1;

        // Generate synthetic OHLC candles from the current price
        const now = Math.floor(Date.now() / 1000);
        const daySeconds = 86400;
        const candles = 30;
        const data = [];
        let price = basePrice * 0.7;
        for (let i = candles; i >= 0; i--) {
          const t = now - i * daySeconds;
          const change = (Math.random() - 0.48) * 0.06 * price;
          const open = price;
          const close = Math.max(0.0001, price + change);
          const high = Math.max(open, close) * (1 + Math.random() * 0.03);
          const low = Math.min(open, close) * (1 - Math.random() * 0.03);
          data.push({ time: t as any, open, high, low, close });
          price = close;
        }

        series.setData(data);
      } catch (err) {
        console.error('Failed to load chart data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [series, period]);

  return (
    <div className="glass-card-static p-6 flex flex-col gap-4 relative">
      {/* Header / Periods */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <span className="text-st-cyan">ST</span>
            <span className="text-text-muted text-sm font-bold uppercase">/ USD</span>
          </h2>
          {loading && <p className="text-xs text-st-gold animate-pulse">Načítám tržní data...</p>}
        </div>
        
        <div className="flex gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
          {['1d', '5d', '1mo', '3mo', '6mo', '1y'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-all ${
                period === p ? 'bg-st-cyan text-black' : 'text-text-muted hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div 
        ref={chartContainerRef} 
        className="w-full relative rounded-xl overflow-hidden border border-white/5 bg-[#0b0e14] shadow-inner" 
        style={{ minHeight: '500px' }}
      />
    </div>
  );
}
