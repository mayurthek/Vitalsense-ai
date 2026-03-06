export default function RiskBadge({ level, small = false }) {
  const styles = {
    LOW: 'bg-green-950 text-green-400 border-green-800',
    MODERATE: 'bg-yellow-950 text-yellow-400 border-yellow-800',
    HIGH: 'bg-orange-950 text-orange-400 border-orange-800',
    CRITICAL: 'bg-red-950 text-red-400 border-red-800 animate-pulse'
  };

  return (
    <span 
      className={`inline-flex items-center border rounded-full font-bold uppercase tracking-wider ${styles[level] || styles.LOW} ${
        small ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
      }`}
      data-testid={`risk-badge-${level?.toLowerCase()}`}
    >
      {level || 'LOW'}
    </span>
  );
}
