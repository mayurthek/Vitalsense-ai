import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientsAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import PatientCard from '../components/PatientCard';
import { Skeleton } from '../components/ui/skeleton';
import { AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const { vitalsData, connected } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await patientsAPI.getAll();
      setPatients(response.data);
    } catch (error) {
      toast.error('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  // Merge real-time vitals with patient data
  const patientsWithVitals = patients.map(patient => {
    const liveData = vitalsData[patient.id];
    if (liveData) {
      return {
        ...patient,
        current_vitals: liveData.vitals,
        risk_level: liveData.risk_level,
        risk_score: liveData.risk_score,
        predictive_warning: liveData.predictive_warning
      };
    }
    return patient;
  });

  // Sort by risk level (critical first), then predictive warnings
  const sortedPatients = [...patientsWithVitals].sort((a, b) => {
    const riskOrder = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
    const aScore = (riskOrder[a.risk_level] || 4) - (a.predictive_warning ? 0.5 : 0);
    const bScore = (riskOrder[b.risk_level] || 4) - (b.predictive_warning ? 0.5 : 0);
    return aScore - bScore;
  });

  const criticalCount = sortedPatients.filter(p => p.risk_level === 'CRITICAL').length;
  const highCount = sortedPatients.filter(p => p.risk_level === 'HIGH').length;
  const predictiveCount = sortedPatients.filter(p => p.predictive_warning).length;

  return (
    <div className="min-h-screen bg-[#0b1320]" data-testid="dashboard-page">
      <Navbar />
      
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Status Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#00d4ff]" />
              <span className="text-[#e6edf3] font-medium">{patients.length} Patients</span>
            </div>
            {criticalCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/50 border border-red-800 rounded-lg animate-pulse">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-medium text-sm">{criticalCount} Critical</span>
              </div>
            )}
            {highCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-950/50 border border-orange-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 font-medium text-sm">{highCount} High Risk</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-[#94a3b8] text-sm">
              {connected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Patient Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[320px] bg-[#121a2f] rounded-xl" />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-6 bg-[#121a2f] rounded-2xl border border-slate-800 mb-6">
              <Users className="w-16 h-16 text-[#64748b]" />
            </div>
            <h2 className="text-xl font-semibold text-[#e6edf3] mb-2">No Patients Yet</h2>
            <p className="text-[#94a3b8] mb-6">Add patients to start monitoring vitals</p>
            <button
              onClick={() => navigate('/patients')}
              className="px-6 py-3 bg-[#00d4ff] text-black font-semibold rounded-lg btn-glow hover:bg-[#00d4ff]/90 transition-all"
              data-testid="add-patient-btn"
            >
              Add First Patient
            </button>
          </div>
        ) : (
          <div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            data-testid="patient-grid"
          >
            {sortedPatients.map((patient, index) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onClick={() => navigate(`/patient/${patient.id}`)}
                style={{ animationDelay: `${index * 50}ms` }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-3 px-6 bg-[#0b1320]/90 backdrop-blur-sm border-t border-slate-800">
        <p className="text-center text-xs text-[#64748b]">
          VitalSense AI is a clinical decision support tool. Alerts are advisory only.
        </p>
      </footer>
    </div>
  );
}
