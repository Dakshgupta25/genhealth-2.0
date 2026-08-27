import React from 'react';
import DoodleIcon from '../common/DoodleIcon';

export function TrendChart({
  title,
  unit = '',
  dataPoints = [],
  loading = false,
}) {
  if (loading) {
    return (
      <div className="p-8 rounded-3xl border shadow-sm flex flex-col items-center justify-center space-y-3 min-h-[260px]"
           style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
        <div className="w-8 h-8 rounded-full border-3 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading longitudinal biomarker trend...</p>
      </div>
    );
  }

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div className="p-8 rounded-3xl border border-dashed shadow-sm flex flex-col items-center justify-center space-y-2 min-h-[260px] text-center"
           style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
             style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--brand-primary)' }}>
          <DoodleIcon name="heartbeat" className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold">No Historical Records for {title}</h4>
        <p className="text-xs max-w-xs" style={{ color: 'var(--text-muted)' }}>
          Upload reports containing "{title}" to automatically construct longitudinal trend trajectories.
        </p>
      </div>
    );
  }

  // Sort chronological (oldest to newest for left-to-right chart flow)
  const sorted = [...dataPoints].sort(
    (a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime()
  );

  const numericVals = sorted
    .map((d) => d.numeric_value)
    .filter((v) => v !== null && v !== undefined && !isNaN(v));

  const minVal = numericVals.length > 0 ? Math.min(...numericVals) : 0;
  const maxVal = numericVals.length > 0 ? Math.max(...numericVals) : 100;
  const padding = (maxVal - minVal) * 0.2 || 10;
  const yMin = Math.max(0, Math.floor(minVal - padding));
  const yMax = Math.ceil(maxVal + padding);
  const yRange = yMax - yMin || 1;

  // Chart dimensions
  const width = 580;
  const height = 200;
  const padX = 50;
  const padY = 30;
  const graphWidth = width - padX * 2;
  const graphHeight = height - padY * 2;

  const points = sorted.map((d, idx) => {
    const x =
      sorted.length === 1
        ? width / 2
        : padX + (idx / (sorted.length - 1)) * graphWidth;
    const val = d.numeric_value ?? 0;
    const y = height - padY - ((val - yMin) / yRange) * graphHeight;
    return { ...d, x, y };
  });

  const pathD =
    points.length > 1
      ? points.reduce(
          (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`,
          ''
        )
      : '';

  const getPointColor = (flag) => {
    switch (flag?.toLowerCase()) {
      case 'high':
        return '#EF4444';
      case 'low':
        return '#F59E0B';
      case 'normal':
        return '#10B981';
      default:
        return '#6366F1';
    }
  };

  return (
    <div className="p-6 rounded-3xl border shadow-sm space-y-4"
         style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold">{title}</h3>
            {unit && (
              <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium"
                    style={{ backgroundColor: 'var(--brand-soft-blue)', color: 'var(--text-accent)' }}>
                {unit}
              </span>
            )}
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Longitudinal trend curve across {sorted.length} recorded lab documents
          </p>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span style={{ color: 'var(--text-muted)' }}>Normal</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span style={{ color: 'var(--text-muted)' }}>High</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span style={{ color: 'var(--text-muted)' }}>Low</span>
          </span>
        </div>
      </div>

      {/* SVG Trend Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[500px]"
        >
          {/* Background Grid Lines */}
          <line
            x1={padX}
            y1={padY}
            x2={width - padX}
            y2={padY}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeDasharray="4 4"
          />
          <line
            x1={padX}
            y1={height / 2}
            x2={width - padX}
            y2={height / 2}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeDasharray="4 4"
          />
          <line
            x1={padX}
            y1={height - padY}
            x2={width - padX}
            y2={height - padY}
            stroke="currentColor"
            strokeOpacity="0.12"
          />

          {/* Y Axis Labels */}
          <text x={padX - 8} y={padY + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
            {yMax}
          </text>
          <text x={padX - 8} y={height / 2 + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
            {Math.round((yMax + yMin) / 2)}
          </text>
          <text x={padX - 8} y={height - padY + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
            {yMin}
          </text>

          {/* Trend Line Path */}
          {points.length > 1 && (
            <path
              d={pathD}
              fill="none"
              stroke="#6366F1"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="6"
                fill={getPointColor(p.abnormality_flag)}
                stroke="#FFFFFF"
                strokeWidth="2"
                className="transition-all hover:scale-125 cursor-pointer"
              />
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                className="text-[10px] font-bold font-mono fill-slate-700 dark:fill-slate-200"
              >
                {p.value}
              </text>
              <text
                x={p.x}
                y={height - padY + 16}
                textAnchor="middle"
                className="text-[9px] fill-slate-400 font-mono"
              >
                {new Date(p.report_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default TrendChart;
