
import React from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { AforoEntry } from '../types';

interface ChartProps {
  data: AforoEntry[];
  title: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
        <p className="text-slate-400 text-xs font-bold uppercase mb-1">{label}:00h</p>
        <p className="text-emerald-400 text-sm font-bold">
          Media: {payload[0].value}% ocupación
        </p>
      </div>
    );
  }
  return null;
};

export const OccupancyLineChart: React.FC<ChartProps> = ({ data, title }) => {
  return (
    <div className="w-full h-64 mt-4">
      <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="hour" 
            stroke="#94a3b8" 
            tickFormatter={(value) => `${value}h`}
            fontSize={10}
            interval={0}
          />
          <YAxis stroke="#94a3b8" fontSize={10} unit="%" />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="occupancy" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorOccupancy)" 
            strokeWidth={3}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
