import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function VitalChart({ data = [], dataKey, color, unit, secondKey }) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Take last 100 points for display (about 3-4 minutes)
    return data.slice(-100).map((item, index) => ({
      index,
      [dataKey]: item[dataKey],
      ...(secondKey && { [secondKey]: item[secondKey] })
    }));
  }, [data, dataKey, secondKey]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 shadow-lg">
          {payload.map((p, i) => (
            <div key={i} className="text-sm">
              <span className="text-[#94a3b8]">{p.dataKey}: </span>
              <span className="font-mono font-bold" style={{ color: p.color }}>
                {p.value} {unit}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-[#64748b]">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
          {secondKey && (
            <linearGradient id={`gradient-${secondKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
            </linearGradient>
          )}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis 
          dataKey="index" 
          tick={false} 
          axisLine={{ stroke: '#1e293b' }}
        />
        <YAxis 
          tick={{ fill: '#64748b', fontSize: 12 }}
          axisLine={{ stroke: '#1e293b' }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${dataKey})`}
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
        {secondKey && (
          <Area
            type="monotone"
            dataKey={secondKey}
            stroke="#94a3b8"
            strokeWidth={2}
            fill={`url(#gradient-${secondKey})`}
            dot={false}
            activeDot={{ r: 4, fill: '#94a3b8' }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
