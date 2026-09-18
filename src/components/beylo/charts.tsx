import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { gbp, gbpCompact } from '@/lib/beylo/format';
import { ASSET_DISTRIBUTION } from '@/data/beylo';

const axis = { stroke: '#9BAAC2', fontSize: 11, tickLine: false, axisLine: false } as const;

const TooltipBox: React.FC<{ active?: boolean; payload?: any[]; label?: string }> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 shadow-lg">
      <p className="text-[11px] uppercase tracking-[0.1em] text-navy-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-navy-900">{gbp(Number(payload[0].value), false)}</p>
      {payload[0].payload?.payments !== undefined && (
        <p className="text-[12px] text-navy-400">{payload[0].payload.payments} payments</p>
      )}
    </div>
  );
};

export const VolumeAreaChart: React.FC<{ data: { label: string; volume: number; payments?: number }[]; height?: number }> = ({
  data,
  height = 280,
}) => (
  <div style={{ height }} className="w-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="beyloVolume" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B2C45" stopOpacity={0.24} />
            <stop offset="100%" stopColor="#1B2C45" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#E6E3DB" vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} tickFormatter={(v) => gbpCompact(Number(v))} width={58} />
        <Tooltip content={<TooltipBox />} />
        <Area type="monotone" dataKey="volume" stroke="#1B2C45" strokeWidth={2} fill="url(#beyloVolume)" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

export const VolumeBarChart: React.FC<{ data: { label: string; volume: number }[]; height?: number; gold?: boolean }> = ({
  data,
  height = 260,
  gold,
}) => (
  <div style={{ height }} className="w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#E6E3DB" vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} tickFormatter={(v) => gbpCompact(Number(v))} width={58} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(27,44,69,0.04)' }} />
        <Bar dataKey="volume" radius={[4, 4, 0, 0]} fill={gold ? '#C9A961' : '#1B2C45'} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export const AssetDistributionChart: React.FC<{ height?: number }> = ({ height = 220 }) => (
  <div className="flex flex-col items-center gap-4 sm:flex-row">
    <div style={{ height, width: height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={ASSET_DISTRIBUTION} dataKey="value" nameKey="asset" innerRadius="58%" outerRadius="88%" paddingAngle={2} strokeWidth={0}>
            {ASSET_DISTRIBUTION.map((d) => (
              <Cell key={d.asset} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
    <ul className="w-full flex-1 space-y-2.5">
      {ASSET_DISTRIBUTION.map((d) => (
        <li key={d.asset} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2 font-medium text-navy-900">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
            {d.asset}
          </span>
          <span className="text-navy-400">
            {d.value}% · <span className="tabular-nums text-navy-700">{gbp(d.volume, false)}</span>
          </span>
        </li>
      ))}
    </ul>
  </div>
);
