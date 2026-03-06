import { useMemo } from 'react';
import RiskBadge from './RiskBadge';
import ECGChart from './ECGChart';
import { Heart, Activity, Droplets, Thermometer, Wind, User, Bed } from 'lucide-react';

export default function PatientCard({ patient, onClick, style }) {
  const vitals = patient.current_vitals || {};
  const riskLevel = patient.risk_level || 'LOW';
  const isCritical = riskLevel === 'CRITICAL';

  return (
    <div
      onClick={onClick}
      className={`vital-card p-5 cursor-pointer animate-fade-in hover:-translate-y-1 transition-all duration-300 ${
        isCritical ? 'critical' : 'hover:border-[#00d4ff]/30 hover:shadow-cyan'
      }`}
      style={style}
      data-testid={`patient-card-${patient.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isCritical ? 'bg-red-500/20' : 'bg-[#00d4ff]/10'}`}>
            <User className={`w-5 h-5 ${isCritical ? 'text-red-400' : 'text-[#00d4ff]'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-[#e6edf3] text-lg leading-tight">{patient.name}</h3>
            <p className="text-sm text-[#64748b]">Dr. {patient.assigned_doctor_name}</p>
          </div>
        </div>
        <RiskBadge level={riskLevel} />
      </div>

      {/* Bed Number */}
      <div className="flex items-center gap-2 mb-4 text-sm text-[#94a3b8]">
        <Bed className="w-4 h-4" />
        <span>Bed {patient.ward_bed}</span>
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <VitalItem 
          icon={Heart}
          value={vitals.heart_rate || '--'}
          unit="bpm"
          alert={vitals.heart_rate > 120 || vitals.heart_rate < 50}
        />
        <VitalItem 
          icon={Activity}
          value={vitals.bp_systolic ? `${vitals.bp_systolic}/${vitals.bp_diastolic}` : '--'}
          unit="mmHg"
          alert={vitals.bp_systolic > 180 || vitals.bp_systolic < 90}
        />
        <VitalItem 
          icon={Droplets}
          value={vitals.spo2 || '--'}
          unit="%"
          alert={vitals.spo2 < 94}
        />
        <VitalItem 
          icon={Thermometer}
          value={vitals.temperature || '--'}
          unit="°C"
          alert={vitals.temperature > 39}
        />
        <VitalItem 
          icon={Wind}
          value={vitals.respiratory_rate || '--'}
          unit="/min"
          alert={vitals.respiratory_rate > 25}
        />
        <div className="flex flex-col items-center justify-center">
          <span className="text-xs text-[#64748b] mb-1">ECG</span>
          <ECGChart data={vitals.ecg || []} height={30} mini />
        </div>
      </div>

      {/* Mini ECG Waveform */}
      <div className="h-12 bg-[#0b1320] rounded-lg overflow-hidden">
        <ECGChart data={vitals.ecg || []} height={48} fullWidth critical={isCritical} />
      </div>
    </div>
  );
}

function VitalItem({ icon: Icon, value, unit, alert }) {
  return (
    <div className="flex flex-col items-center justify-center p-2 bg-[#0b1320] rounded-lg">
      <Icon className={`w-4 h-4 mb-1 ${alert ? 'text-red-400' : 'text-[#64748b]'}`} />
      <span className={`text-lg font-mono font-bold ${alert ? 'text-red-400' : 'text-[#e6edf3]'}`}>
        {value}
      </span>
      <span className="text-xs text-[#64748b]">{unit}</span>
    </div>
  );
}
