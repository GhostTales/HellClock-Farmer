import { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush
} from 'recharts';
import optionsIcon from '/textures/UI_Icon_Options.png?url';

export interface ChartLineConfig {
  dataKey: string;
  name?: string;
  stroke: string;
  yAxisId?: string;
}

export interface ChartYAxisConfig {
  id?: string;
  orientation?: 'left' | 'right';
  stroke?: string;
}

export interface ChartBlockProps {
  title: string;
  emptyMessage: React.ReactNode;
  data: any[];
  lines: ChartLineConfig[];
  yAxes?: ChartYAxisConfig[];
  margin?: { top: number; right: number; left: number; bottom: number };
  tooltipContent?: React.ReactElement | ((props: any) => React.ReactNode);
}

export const ChartBlock = ({ title, emptyMessage, data, lines, yAxes = [{ stroke: '#ccc' }], margin = { top: 10, right: 40, left: 10, bottom: 25 }, tooltipContent }: ChartBlockProps) => {
  const [showTrendlines, setShowTrendlines] = useState(false);
  const [showMovingAverage, setShowMovingAverage] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showBrush, setShowBrush] = useState(false);
  const [showDots, setShowDots] = useState(true);
  const [brushRange, setBrushRange] = useState<{ startIndex?: number, endIndex?: number } | null>(null);

  // Reset the brush range if the number of data points changes
  useEffect(() => {
    setBrushRange(null);
  }, [data.length]);

  const chartData = useMemo(() => {
    let modifiedData = [...data];

    if (data.length >= 2) {
      const trendlines = lines.map(line => {
        const key = line.dataKey;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        let validN = 0;
        data.forEach((point, i) => {
          const y = Number(point[key]);
          if (!isNaN(y)) {
            sumX += i;
            sumY += y;
            sumXY += i * y;
            sumXX += i * i;
            validN++;
          }
        });
        if (validN < 2) return null;
        
        const m = (validN * sumXY - sumX * sumY) / (validN * sumXX - sumX * sumX);
        const b = (sumY - m * sumX) / validN;
        
        return { key, m, b };
      }).filter(Boolean) as { key: string, m: number, b: number }[];

      const windowSize = Math.min(5, data.length);

      modifiedData = modifiedData.map((point, i) => {
        const newPoint = { ...point };

        trendlines.forEach(({ key, m, b }) => {
          newPoint[`${key}_trendline`] = m * i + b;
        });

        lines.forEach(line => {
          const key = line.dataKey;
          let sum = 0;
          let count = 0;
          for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
            const y = Number(data[j][key]);
            if (!isNaN(y)) {
              sum += y;
              count++;
            }
          }
          if (count > 0) {
            newPoint[`${key}_ma`] = sum / count;
          }
        });
        return newPoint;
      });
    }

    return modifiedData;
  }, [data, lines]);

  return (
    <div className="chart-block" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="chart-title" style={{ margin: 0 }}>{title}</h3>
        <div 
          style={{ position: 'relative' }}
          onMouseLeave={() => setShowMenu(false)}
        >
          <button 
            className="toolbar-btn"
            onClick={() => setShowMenu(!showMenu)}
            onMouseEnter={() => setShowMenu(true)}
            style={{ padding: '2px 8px', fontSize: '1.2em' }}
            title="Chart Tools"
          >
            <img src={optionsIcon} alt="Chart Tools" style={{ width: '1.5em', height: '1.5em', display: 'block' }} />
          </button>
          {showMenu && (
            <div 
              className="dropdown-menu" 
              style={{ position: 'absolute', right: 0, left: 'auto', top: '100%', zIndex: 10, minWidth: 'max-content' }}
            >
              <button 
                className="dropdown-item" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTrendlines(!showTrendlines);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', width: '100%' }}
              >
                <input type="checkbox" checked={showTrendlines} readOnly />
                Trendlines (Linear)
              </button>
              <button 
                className="dropdown-item" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMovingAverage(!showMovingAverage);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', width: '100%' }}
              >
                <input type="checkbox" checked={showMovingAverage} readOnly />
                Moving Average (5 Runs)
              </button>
              <button 
                className="dropdown-item" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBrush(!showBrush);
                  if (showBrush) {
                    setBrushRange(null);
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', width: '100%' }}
              >
                <input type="checkbox" checked={showBrush} readOnly />
                Enable Zoom/Pan (Brush)
              </button>
              <button 
                className="dropdown-item" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDots(!showDots);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', width: '100%' }}
              >
                <input type="checkbox" checked={showDots} readOnly />
                Show Data Points
              </button>
            </div>
          )}
        </div>
      </div>
      {data.length === 0 ? (
        <p className="chart-empty-message" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{emptyMessage}</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="runName" stroke="#ccc" tick={{ fill: '#ccc' }} />
            {yAxes.map((axis, idx) => (
              <YAxis key={axis.id || idx} yAxisId={axis.id} orientation={axis.orientation || 'left'} stroke={axis.stroke || '#ccc'} tick={{ fill: axis.stroke || '#ccc' }} />
            ))}
            {tooltipContent ? <Tooltip content={tooltipContent} /> : <Tooltip />}
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {lines.map((line, idx) => (
              <Line key={line.dataKey || idx} yAxisId={line.yAxisId} type="monotone" dataKey={line.dataKey} name={line.name} stroke={line.stroke} activeDot={{ r: 8, fill: line.stroke }} strokeWidth={2.5} dot={showDots} />
            ))}
            {showTrendlines && lines.map((line, idx) => (
              <Line key={`trend_${line.dataKey || idx}`} yAxisId={line.yAxisId} type="monotone" dataKey={`${line.dataKey}_trendline`} name={`${line.name || line.dataKey} (Trend)`} stroke={line.stroke} strokeDasharray="5 5" dot={false} activeDot={false} strokeWidth={2} opacity={0.6} legendType="none" />
            ))}
            {showMovingAverage && lines.map((line, idx) => (
              <Line key={`ma_${line.dataKey || idx}`} yAxisId={line.yAxisId} type="monotone" dataKey={`${line.dataKey}_ma`} name={`${line.name || line.dataKey} (5-MA)`} stroke={line.stroke} strokeDasharray="3 3" dot={false} activeDot={false} strokeWidth={2} opacity={0.6} legendType="none" />
            ))}
            {showBrush && (
              <Brush 
                dataKey="runName" 
                height={20} 
                stroke="#8884d8" 
                fill="#222" 
                travellerWidth={10} 
                {...(brushRange ? { startIndex: brushRange.startIndex, endIndex: brushRange.endIndex } : {})}
                onChange={(e: any) => {
                  if (e && typeof e.startIndex === 'number' && typeof e.endIndex === 'number') {
                    setBrushRange({ startIndex: e.startIndex, endIndex: e.endIndex });
                  }
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};