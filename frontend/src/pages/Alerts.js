import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { alertsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import RiskBadge from '../components/RiskBadge';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Bell, Clock, User, Activity, AlertTriangle } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts();
    // Poll for new alerts every 10 seconds
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await alertsAPI.getAll();
      setAlerts(response.data);
    } catch (error) {
      // Silently fail for polling
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = filter === 'ALL' 
    ? alerts 
    : alerts.filter(a => a.risk_level === filter);

  const riskFilters = ['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'];

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now - alertTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#0b1320]" data-testid="alerts-page">
      <Navbar />
      
      <main className="max-w-[1200px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#e6edf3] flex items-center gap-3">
              <Bell className="w-6 h-6 text-[#00d4ff]" />
              Alert Timeline
            </h1>
            <p className="text-[#94a3b8]">{alerts.length} total alerts</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {riskFilters.map(level => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === level
                  ? level === 'CRITICAL' ? 'bg-red-500 text-white' :
                    level === 'HIGH' ? 'bg-orange-500 text-white' :
                    level === 'MODERATE' ? 'bg-yellow-500 text-black' :
                    level === 'LOW' ? 'bg-green-500 text-white' :
                    'bg-[#00d4ff] text-black'
                  : 'bg-[#1e293b] text-[#94a3b8] hover:bg-[#2d3a4f]'
              }`}
              data-testid={`filter-${level.toLowerCase()}`}
            >
              {level}
              {level !== 'ALL' && (
                <span className="ml-2 opacity-75">
                  ({alerts.filter(a => a.risk_level === level).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Alert List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-[100px] bg-[#121a2f] rounded-xl" />
            ))}
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-6 bg-[#121a2f] rounded-2xl border border-slate-800 mb-6">
              <AlertTriangle className="w-16 h-16 text-[#64748b]" />
            </div>
            <h2 className="text-xl font-semibold text-[#e6edf3] mb-2">No Alerts</h2>
            <p className="text-[#94a3b8]">
              {filter === 'ALL' ? 'All patients are stable' : `No ${filter.toLowerCase()} alerts`}
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="alerts-list">
            {filteredAlerts.map((alert, index) => (
              <div
                key={alert.id}
                className={`vital-card p-4 animate-fade-in cursor-pointer hover:border-[#00d4ff]/30 transition-all ${
                  alert.risk_level === 'CRITICAL' ? 'border-red-500/50' : ''
                }`}
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => navigate(`/patient/${alert.patient_id}`)}
                data-testid={`alert-${alert.id}`}
              >
                <div className="flex items-start gap-4">
                  {/* Timeline Indicator */}
                  <div className={`w-1 h-full min-h-[60px] rounded-full ${
                    alert.risk_level === 'CRITICAL' ? 'bg-red-500' :
                    alert.risk_level === 'HIGH' ? 'bg-orange-500' :
                    alert.risk_level === 'MODERATE' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <RiskBadge level={alert.risk_level} />
                        <span className="font-semibold text-[#e6edf3]">{alert.vital_affected}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#64748b] text-sm">
                        <Clock className="w-4 h-4" />
                        {getTimeAgo(alert.timestamp)}
                      </div>
                    </div>
                    
                    <p className="text-[#94a3b8] mb-3">{alert.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-[#00d4ff]">
                        <User className="w-4 h-4" />
                        <span>{alert.patient_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#94a3b8]">
                        <Activity className="w-4 h-4" />
                        <span>Dr. {alert.doctor_name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
