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
      <Card radius="lg" className="p-8 flex flex-col items-center justify-center space-y-3 min-h-[240px] text-center bg-white border border-[#E3E3DF] dark:border-[#303030]">
        <div className="w-6 h-6 rounded-full border-2 border-[#B4232F] border-t-transparent animate-spin" />
        <p className="text-xs text-[#858585] font-medium">
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
        description="Ingest clinical lab reports containing this biomarker to plot longitudinal trend curves."
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
  const width = 560;
  const height = 190;
  const padX = 48;
  const padY = 28;
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
        return '#B4232F';
      case 'low':
        return '#9A6500';
      case 'normal':
        return '#247A59';
      default:
        return '#171717';
    }
  };

  const latestPoint = sorted[sorted.length - 1];

  return (
    <Card radius="lg" className="overflow-hidden bg-white border border-[#E3E3DF] dark:border-[#303030]">
      <CardHeader density="compact" className="border-b border-[#E3E3DF] dark:border-[#303030] pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <CardTitle density="compact">{title}</CardTitle>
              {unit && (
                <span className="text-xs px-2 py-0.5 rounded-[4px] font-mono font-semibold bg-[#F4F4F2] text-[#171717] dark:bg-[#252525] dark:text-[#F0F0F0]">
                  {unit}
                </span>
              )}
            </div>
            <CardDescription className="text-xs">
              Longitudinal trajectory across <span className="font-semibold text-[#171717] dark:text-[#F0F0F0]">{sorted.length}</span> recorded measures
            </CardDescription>
          </div>

          <div className="flex items-center space-x-3 text-[11px] font-medium self-start sm:self-center">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#247A59]" />
              <span className="text-[#5F6368] dark:text-[#A0A0A0]">Normal</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#B4232F]" />
              <span className="text-[#5F6368] dark:text-[#A0A0A0]">Abnormal</span>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent density="compact" className="p-4 sm:p-5">
        {/* SVG Trend Chart Canvas */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[440px]"
          >
            {/* Horizontal Reference Grid Lines */}
            <line
              x1={padX}
              y1={padY}
              x2={width - padX}
              y2={padY}
              stroke="currentColor"
              className="text-[#E3E3DF] dark:text-[#303030]"
              strokeDasharray="4 4"
            />
            <line
              x1={padX}
              y1={height / 2}
              x2={width - padX}
              y2={height / 2}
              stroke="currentColor"
              className="text-[#E3E3DF] dark:text-[#303030]"
              strokeDasharray="4 4"
            />
            <line
              x1={padX}
              y1={height - padY}
              x2={width - padX}
              y2={height - padY}
              stroke="currentColor"
              className="text-[#E3E3DF] dark:text-[#303030]"
            />

            {/* Y Axis Labels */}
            <text x={padX - 8} y={padY + 4} textAnchor="end" className="text-[10px] fill-[#858585] font-mono">
              {yMax}
            </text>
            <text x={padX - 8} y={height / 2 + 4} textAnchor="end" className="text-[10px] fill-[#858585] font-mono">
              {Math.round((yMax + yMin) / 2)}
            </text>
            <text x={padX - 8} y={height - padY + 4} textAnchor="end" className="text-[10px] fill-[#858585] font-mono">
              {yMin}
            </text>

            {/* Clinical Trend Line Path (Brand Red) */}
            {points.length > 1 && (
              <path
                d={pathD}
                fill="none"
                stroke="#B4232F"
                className="dark:stroke-[#E04855]"
                strokeWidth="2.2"
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
                  r="5"
                  fill={getPointColor(p.abnormality_flag)}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-transform hover:scale-125 cursor-pointer dark:stroke-[#1E1E1E]"
                />
                <text
                  x={p.x}
                  y={p.y - 8}
                  textAnchor="middle"
                  className="text-[10px] font-bold font-mono fill-[#171717] dark:fill-[#F0F0F0]"
                >
                  {p.value}
                </text>
                <text
                  x={p.x}
                  y={height - padY + 15}
                  textAnchor="middle"
                  className="text-[9px] fill-[#858585] font-mono"
                >
                  {new Date(p.report_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Latest Value Footnote */}
        {latestPoint && (
          <div className="mt-2 pt-2 border-t border-[#E3E3DF] dark:border-[#303030] flex items-center justify-between text-xs">
            <span className="text-[#5F6368] dark:text-[#A0A0A0]">
              Latest reading: <strong className="font-mono text-[#171717] dark:text-[#F0F0F0]">{latestPoint.value} {unit}</strong> on {new Date(latestPoint.report_date).toLocaleDateString()}
            </span>
            <Badge status={latestPoint.abnormality_flag === 'normal' ? 'normal' : 'critical'} size="sm" dot>
              {latestPoint.abnormality_flag || 'Status'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TrendChart;
