import React from 'react';
import { formatINR } from '../../data/reportsAnalyticsSelectors';

const EmptyChart = ({ label }) => (
  <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm font-medium text-slate-500">
    {label}
  </div>
);

export const SalesTrendChart = ({ points }) => {
  if (!points.length || points.every((point) => point.value === 0)) {
    return <EmptyChart label="No completed sales in this period." />;
  }

  const width = 720;
  const height = 240;
  const padL = 52;
  const padR = 12;
  const padT = 16;
  const padB = 32;
  const max = Math.max(...points.map((point) => point.value), 1);
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const coords = points.map((point, index) => {
    const x = padL + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
    const y = padT + innerH - (point.value / max) * innerH;
    return { ...point, x, y };
  });
  const line = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${padT + innerH} L ${coords[0].x.toFixed(1)} ${padT + innerH} Z`;
  const labelStep = Math.max(1, Math.ceil(points.length / 6));
  const yTicks = [0, max / 2, max];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label="Completed sales trend">
      {yTicks.map((tick) => {
        const y = padT + innerH - (tick / max) * innerH;
        return (
          <g key={tick}>
            <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-slate-400" fontSize="11">
              {tick >= 1000 ? `${Math.round(tick / 1000)}k` : Math.round(tick)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="#79B433" opacity="0.16" />
      <path d={line} fill="none" stroke="#1A2E0A" strokeWidth="2.5" />
      {coords.map((point) => (
        <circle key={point.date} cx={point.x} cy={point.y} r="3.5" fill="#F7941D">
          <title>{`${point.label}: ${formatINR(point.value)}`}</title>
        </circle>
      ))}
      {coords.map((point, index) =>
        index % labelStep === 0 || index === coords.length - 1 ? (
          <text key={`${point.date}-label`} x={point.x} y={height - 8} textAnchor="middle" className="fill-slate-500" fontSize="11">
            {point.label}
          </text>
        ) : null
      )}
    </svg>
  );
};

export const HorizontalBars = ({ items, formatValue, emptyLabel }) => {
  const max = Math.max(...items.map((item) => item.value), 0);
  if (!items.length || max === 0) return <EmptyChart label={emptyLabel} />;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="font-mono text-slate-900">{formatValue(item.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color || '#1A2E0A' }} />
          </div>
        </div>
      ))}
    </div>
  );
};
