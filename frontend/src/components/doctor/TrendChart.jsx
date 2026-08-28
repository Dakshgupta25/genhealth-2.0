import React from 'react';
import DoodleIcon from '../common/DoodleIcon';
import { Badge, Card, CardHeader, CardTitle, CardDescription, CardContent, EmptyState } from '../ui';

export function TrendChart({
  title,
  unit = '',
  dataPoints = [],
  loading = false,
}) {
  if (loading) {
    return (
      <Card radius="lg" className="p-8 flex flex-col items-center justify-center space-y-3 min-h-[260px] text-center">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-cyan-600 animate-spin" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Loading longitudinal biomarker trajectory...
        </p>
      </Card>
    );
  }

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <EmptyState
        icon={<DoodleIcon name="heartbeat" className="w-5 h-5" />}
        title={`No Historical Records for ${title || 'Selected Test'}`}
        description="Upload clinical lab reports containing this biomarker to automatically plot longitudinal trend curves."
      />
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

  // SVG Chart dimensions
  const width = 580;
  const height = 210;
  const padX = 52;
  const padY = 32;
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
      case 'critical':
        return '#EF4444';
      case 'low':
        return '#F59E0B';
      case 'normal':
        return '#10B981';
      default:
        return '#0891B2';
    }
  };

  const latestPoint = sorted[sorted.length - 1];

  return (
    <Card radius="lg" className="overflow-hidden shadow-sm">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <CardTitle className="text-base">{title}</CardTitle>
              {unit && (
                <span className="text-xs px-2 py-0.5 rounded-md font-mono font-semibold bg-slate-100 text-cyan-700 dark:bg-slate-800 dark:text-cyan-300">
                  {unit}
                </span>
              )}
            </div>
            <CardDescription className="text-xs">
              Longitudinal trend across <span className="font-semibold text-slate-800 dark:text-slate-200">{sorted.length}</span> recorded lab measures
            </CardDescription>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-medium self-start sm:self-center">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-500 dark:text-slate-400">Normal</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-slate-500 dark:text-slate-400">High</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-500 dark:text-slate-400">Low</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {/* SVG Trend Chart Canvas */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[480px]"
          >
            {/* Horizontal Reference Grid Lines */}
            <line
              x1={padX}
              y1={padY}
              x2={width - padX}
              y2={padY}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeDasharray="4 4"
            />
            <line
              x1={padX}
              y1={height / 2}
              x2={width - padX}
              y2={height / 2}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeDasharray="4 4"
            />
            <line
              x1={padX}
              y1={height - padY}
              x2={width - padX}
              y2={height - padY}
              stroke="currentColor"
              className="text-slate-300 dark:text-slate-700"
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

            {/* Clinical Trend Line Path (Clinical Cyan) */}
            {points.length > 1 && (
              <path
                d={pathD}
                fill="none"
                stroke="#0891B2"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Point Nodes */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5.5"
                  fill={getPointColor(p.abnormality_flag)}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-transform hover:scale-125 cursor-pointer"
                />
                <text
                  x={p.x}
                  y={p.y - 9}
                  textAnchor="middle"
                  className="text-[10px] font-bold font-mono fill-slate-800 dark:fill-slate-100"
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

        {/* Latest Value Footnote */}
        {latestPoint && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Latest reading: <strong className="font-mono text-slate-900 dark:text-slate-100">{latestPoint.value} {unit}</strong> on {new Date(latestPoint.report_date).toLocaleDateString()}
            </span>
            <Badge status={latestPoint.abnormality_flag === 'normal' ? 'normal' : latestPoint.abnormality_flag === 'low' ? 'warning' : 'critical'} size="sm">
              {latestPoint.abnormality_flag || 'Status'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TrendChart;
