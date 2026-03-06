import { useMemo } from 'react';

export default function ECGChart({ data = [], height = 60, fullWidth = false, mini = false, critical = false }) {
  const pathD = useMemo(() => {
    if (!data || data.length === 0) {
      // Generate default flat line with small waves
      const points = [];
      for (let i = 0; i < 30; i++) {
        const x = (i / 29) * 100;
        const y = 50 + Math.sin(i * 0.5) * 5;
        points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
      }
      return points.join(' ');
    }

    // Normalize data to fit within viewBox
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 90 - ((val - min) / range) * 80; // Map to 10-90 range
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    });

    return points.join(' ');
  }, [data]);

  const strokeColor = critical ? '#ef4444' : '#22c55e';

  return (
    <svg 
      viewBox="0 0 100 100" 
      preserveAspectRatio="none"
      className={fullWidth ? 'w-full' : mini ? 'w-12' : 'w-20'}
      style={{ height }}
    >
      {/* Grid lines */}
      <g stroke="#1e293b" strokeWidth="0.5">
        <line x1="0" y1="25" x2="100" y2="25" />
        <line x1="0" y1="50" x2="100" y2="50" />
        <line x1="0" y1="75" x2="100" y2="75" />
      </g>
      
      {/* ECG Line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={mini ? "2" : "1.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ecg-path"
        style={{
          filter: `drop-shadow(0 0 3px ${strokeColor})`
        }}
      />
    </svg>
  );
}
