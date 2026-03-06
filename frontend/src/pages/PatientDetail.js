import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { patientsAPI, multimodalAPI, baselineAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import Navbar from '../components/Navbar';
import VitalChart from '../components/VitalChart';
import ECGChart from '../components/ECGChart';
import RiskBadge from '../components/RiskBadge';
import MultimodalPanel from '../components/MultimodalPanel';
import BaselinePanel from '../components/BaselinePanel';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, Heart, Thermometer, Wind, Activity, 
  Droplets, AlertTriangle, Clock, User, Phone,
  Pill, AlertCircle, TrendingDown, FileText, Target
} from 'lucide-react';

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveVitals, setLiveVitals] = useState(null);
  const [vitalHistory, setVitalHistory] = useState([]);
  const [predictiveWarning, setPredictiveWarning] = useState(false);
  
  const { joinPatientRoom, leavePatientRoom, subscribeToPatientVitals, unsubscribeFromPatientVitals } = useSocket();

  useEffect(() => {
    fetchPatient();
    joinPatientRoom(id);

    const handleVitals = (data) => {
      setLiveVitals(data);
      setPredictiveWarning(data.predictive_warning || false);
      setVitalHistory(prev => {
        const newHistory = [...prev, data.vitals];
        return newHistory.slice(-600);
      });
    };

    subscribeToPatientVitals(handleVitals);

    return () => {
      leavePatientRoom(id);
      unsubscribeFromPatientVitals(handleVitals);
    };
  }, [id]);

  const fetchPatient = async () => {
    try {
      const response = await patientsAPI.getById(id);
      setPatient(response.data);
      setVitalHistory(response.data.vital_history || []);
      setPredictiveWarning(response.data.predictive_warning || false);
    } catch (error) {
      toast.error('Failed to fetch patient data');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1320]">
        <Navbar />
        <main className="max-w-[1600px] mx-auto px-6 py-6">
          <Skeleton className="h-[600px] bg-[#121a2f] rounded-xl" />
        </main>
      </div>
    );
  }

  if (!patient) return null;

  const vitals = liveVitals?.vitals || patient.current_vitals || {};
  const riskLevel = liveVitals?.risk_level || patient.risk_level || 'LOW';
  const riskScore = liveVitals?.risk_score || patient.risk_score || 0;
  const explanations = liveVitals?.explanations || patient.risk_explanations || [];

  const medicalHistory = [
    { label: 'Diabetes', value: patient.diabetes },
    { label: 'Hypertension', value: patient.hypertension },
    { label: 'Heart Disease', value: patient.heart_disease },
    { label: 'Asthma', value: patient.asthma },
    { label: 'CKD', value: patient.ckd },
    { label: 'Previous ICU', value: patient.previous_icu },
  ];

  return (
    <div className="min-h-screen bg-[#0b1320] pb-20" data-testid="patient-detail-page">
      <Navbar />
      
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-[#1e293b] rounded-lg transition-colors"
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5 text-[#94a3b8]" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#e6edf3]">{patient.name}</h1>
              <RiskBadge level={riskLevel} />
            </div>
            <p className="text-[#94a3b8]">
              Bed {patient.ward_bed} • Dr. {patient.assigned_doctor_name}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-mono font-bold text-[#00d4ff]">{riskScore}</div>
            <div className="text-xs text-[#94a3b8] uppercase tracking-wider">Risk Score</div>
          </div>
        </div>

        {/* Predictive Warning Banner */}
        {predictiveWarning && (
          <div className="mb-6 p-4 rounded-xl bg-orange-950/50 border-2 border-orange-500 animate-pulse">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-6 h-6 text-orange-400" />
              <div>
                <h3 className="font-bold text-orange-400">Predictive Deterioration Warning</h3>
                <p className="text-orange-300 text-sm">
                  Possible patient deterioration in next 30 minutes. Vital trends indicate concerning patterns.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Risk Explanations */}
        {explanations.length > 0 && (
          <div className={`mb-6 p-4 rounded-xl border ${
            riskLevel === 'CRITICAL' ? 'bg-red-950/30 border-red-800' :
            riskLevel === 'HIGH' ? 'bg-orange-950/30 border-orange-800' :
            'bg-yellow-950/30 border-yellow-800'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`w-5 h-5 ${
                riskLevel === 'CRITICAL' ? 'text-red-400' :
                riskLevel === 'HIGH' ? 'text-orange-400' : 'text-yellow-400'
              }`} />
              <span className="font-semibold text-[#e6edf3]">Risk Analysis</span>
            </div>
            <ul className="space-y-1">
              {explanations.map((exp, i) => (
                <li key={i} className="text-sm text-[#94a3b8]">• {exp}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Vitals Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <VitalBox
            icon={Heart}
            label="Heart Rate"
            value={vitals.heart_rate || '--'}
            unit="bpm"
            color={vitals.heart_rate > 120 || vitals.heart_rate < 50 ? '#ef4444' : '#22c55e'}
          />
          <VitalBox
            icon={Activity}
            label="Blood Pressure"
            value={`${vitals.bp_systolic || '--'}/${vitals.bp_diastolic || '--'}`}
            unit="mmHg"
            color={vitals.bp_systolic > 180 || vitals.bp_systolic < 90 ? '#ef4444' : '#00d4ff'}
          />
          <VitalBox
            icon={Droplets}
            label="SpO2"
            value={vitals.spo2 || '--'}
            unit="%"
            color={vitals.spo2 < 94 ? '#ef4444' : '#22c55e'}
          />
          <VitalBox
            icon={Thermometer}
            label="Temperature"
            value={vitals.temperature || '--'}
            unit="°C"
            color={vitals.temperature > 39 ? '#ef4444' : '#00d4ff'}
          />
          <VitalBox
            icon={Wind}
            label="Resp. Rate"
            value={vitals.respiratory_rate || '--'}
            unit="/min"
            color={vitals.respiratory_rate > 25 ? '#ef4444' : '#22c55e'}
          />
          <div className="vital-card p-4 flex flex-col items-center justify-center">
            <div className="text-xs text-[#94a3b8] uppercase tracking-wider mb-2">ECG</div>
            <ECGChart data={vitals.ecg || []} height={60} />
          </div>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="charts" className="mb-6">
          <TabsList className="bg-[#121a2f] border border-slate-800">
            <TabsTrigger value="charts" className="data-[state=active]:bg-[#00d4ff] data-[state=active]:text-black">
              <Activity className="w-4 h-4 mr-2" />
              Vital Charts
            </TabsTrigger>
            <TabsTrigger value="multimodal" className="data-[state=active]:bg-[#00d4ff] data-[state=active]:text-black">
              <FileText className="w-4 h-4 mr-2" />
              Multimodal Data
            </TabsTrigger>
            <TabsTrigger value="baseline" className="data-[state=active]:bg-[#00d4ff] data-[state=active]:text-black">
              <Target className="w-4 h-4 mr-2" />
              Baseline
            </TabsTrigger>
            <TabsTrigger value="info" className="data-[state=active]:bg-[#00d4ff] data-[state=active]:text-black">
              <User className="w-4 h-4 mr-2" />
              Patient Info
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="charts" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="vital-card p-5">
                <h3 className="text-lg font-semibold text-[#e6edf3] mb-4">Heart Rate (30 min)</h3>
                <VitalChart data={vitalHistory} dataKey="heart_rate" color="#22c55e" unit="bpm" />
              </div>
              <div className="vital-card p-5">
                <h3 className="text-lg font-semibold text-[#e6edf3] mb-4">Blood Pressure (30 min)</h3>
                <VitalChart data={vitalHistory} dataKey="bp_systolic" color="#00d4ff" unit="mmHg" secondKey="bp_diastolic" />
              </div>
              <div className="vital-card p-5">
                <h3 className="text-lg font-semibold text-[#e6edf3] mb-4">SpO2 (30 min)</h3>
                <VitalChart data={vitalHistory} dataKey="spo2" color="#4ade80" unit="%" />
              </div>
              <div className="vital-card p-5">
                <h3 className="text-lg font-semibold text-[#e6edf3] mb-4">ECG Waveform</h3>
                <ECGChart data={vitals.ecg || []} height={150} fullWidth />
              </div>
              <div className="vital-card p-5">
                <h3 className="text-lg font-semibold text-[#e6edf3] mb-4">Temperature (30 min)</h3>
                <VitalChart data={vitalHistory} dataKey="temperature" color="#facc15" unit="°C" />
              </div>
              <div className="vital-card p-5">
                <h3 className="text-lg font-semibold text-[#e6edf3] mb-4">Respiratory Rate (30 min)</h3>
                <VitalChart data={vitalHistory} dataKey="respiratory_rate" color="#f97316" unit="/min" />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="multimodal" className="mt-4">
            <MultimodalPanel patientId={id} onUpdate={fetchPatient} />
          </TabsContent>
          
          <TabsContent value="baseline" className="mt-4">
            <BaselinePanel 
              patientId={id} 
              baseline={patient.baseline} 
              currentVitals={vitals}
              onUpdate={fetchPatient} 
            />
          </TabsContent>
          
          <TabsContent value="info" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Patient Info */}
              <div className="vital-card p-5">
                <h3 className="text-lg font-semibold text-[#e6edf3] mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#00d4ff]" />
                  Patient Information
                </h3>
                <div className="space-y-3 text-sm">
                  <InfoRow label="Age" value={`${patient.age} years`} />
                  <InfoRow label="Gender" value={patient.gender} />
                  <InfoRow label="Blood Group" value={patient.blood_group} />
                  <InfoRow label="Bed" value={patient.ward_bed} />
                </div>
              </div>

              {/* Medical History */}
              <div className="vital-card p-5">
                <h3 className="text-lg font-semibold text-[#e6edf3] mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#00d4ff]" />
                  Medical History
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {medicalHistory.map(item => (
                    <div 
                      key={item.label}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        item.value 
                          ? 'bg-red-950/50 border border-red-800 text-red-300'
                          : 'bg-[#1e293b] text-[#64748b]'
                      }`}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact & Medications */}
              <div className="vital-card p-5">
                <h3 className="text-lg font-semibold text-[#e6edf3] mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#00d4ff]" />
                  Contact & Care
                </h3>
                <div className="space-y-3 text-sm">
                  <InfoRow label="Emergency Contact" value={patient.emergency_contact} />
                  <InfoRow label="Allergies" value={patient.allergies || 'None'} />
                  <div>
                    <div className="text-[#94a3b8] mb-1 flex items-center gap-1">
                      <Pill className="w-3 h-3" /> Medications
                    </div>
                    <div className="text-[#e6edf3]">{patient.medications || 'None'}</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Alert History */}
        {patient.alerts && patient.alerts.length > 0 && (
          <div className="vital-card p-5">
            <h3 className="text-lg font-semibold text-[#e6edf3] mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#00d4ff]" />
              Recent Alerts
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {patient.alerts.slice(0, 20).map((alert, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-3 p-3 bg-[#0b1320] rounded-lg"
                >
                  <RiskBadge level={alert.risk_level} small />
                  <div className="flex-1">
                    <div className="text-sm text-[#e6edf3]">{alert.description}</div>
                    <div className="text-xs text-[#64748b]">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

function VitalBox({ icon: Icon, label, value, unit, color }) {
  return (
    <div className="vital-card p-4 flex flex-col items-center justify-center text-center">
      <Icon className="w-5 h-5 mb-2" style={{ color }} />
      <div className="text-3xl font-mono font-bold text-[#e6edf3]" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-[#64748b]">{unit}</div>
      <div className="text-xs text-[#94a3b8] uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#94a3b8]">{label}</span>
      <span className="text-[#e6edf3] font-medium">{value}</span>
    </div>
  );
}
