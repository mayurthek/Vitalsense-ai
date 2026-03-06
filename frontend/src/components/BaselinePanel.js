import { useState, useEffect } from 'react';
import { baselineAPI } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { toast } from 'sonner';
import { Target, Edit, Trash2, Heart, Activity, Droplets, Thermometer, Wind, TrendingUp, TrendingDown } from 'lucide-react';

export default function BaselinePanel({ patientId, baseline: initialBaseline, currentVitals, onUpdate }) {
  const [baseline, setBaseline] = useState(initialBaseline);
  const [loading, setLoading] = useState(!initialBaseline);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    baseline_hr: 75,
    baseline_bp_systolic: 120,
    baseline_bp_diastolic: 80,
    baseline_spo2: 98,
    baseline_temp: 37.0,
    baseline_rr: 16
  });

  useEffect(() => {
    if (!initialBaseline) {
      fetchBaseline();
    } else {
      setBaseline(initialBaseline);
      setFormData({
        baseline_hr: initialBaseline.baseline_hr,
        baseline_bp_systolic: initialBaseline.baseline_bp_systolic,
        baseline_bp_diastolic: initialBaseline.baseline_bp_diastolic,
        baseline_spo2: initialBaseline.baseline_spo2,
        baseline_temp: initialBaseline.baseline_temp,
        baseline_rr: initialBaseline.baseline_rr
      });
    }
  }, [initialBaseline, patientId]);

  const fetchBaseline = async () => {
    try {
      const response = await baselineAPI.getAll(patientId);
      if (response.data.length > 0) {
        const bl = response.data[0];
        setBaseline(bl);
        setFormData({
          baseline_hr: bl.baseline_hr,
          baseline_bp_systolic: bl.baseline_bp_systolic,
          baseline_bp_diastolic: bl.baseline_bp_diastolic,
          baseline_spo2: bl.baseline_spo2,
          baseline_temp: bl.baseline_temp,
          baseline_rr: bl.baseline_rr
        });
      }
    } catch (error) {
      console.log('No baseline found');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (baseline) {
        await baselineAPI.update(baseline.id, formData);
        toast.success('Baseline updated successfully');
      } else {
        await baselineAPI.create({ patient_id: patientId, ...formData });
        toast.success('Baseline created successfully');
      }
      setDialogOpen(false);
      fetchBaseline();
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save baseline');
    }
  };

  const handleDelete = async () => {
    try {
      await baselineAPI.delete(baseline.id);
      toast.success('Baseline deleted successfully');
      setBaseline(null);
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to delete baseline');
    }
  };

  const calculateDeviation = (current, baselineValue) => {
    if (!baselineValue) return { value: 0, percent: 0 };
    const diff = current - baselineValue;
    const percent = (diff / baselineValue) * 100;
    return { value: diff, percent };
  };

  const getDeviationColor = (percent, invertedGood = false) => {
    const absPercent = Math.abs(percent);
    if (absPercent < 10) return 'text-green-400';
    if (absPercent < 20) return 'text-yellow-400';
    if (absPercent < 30) return 'text-orange-400';
    return 'text-red-400';
  };

  const DeviationIndicator = ({ current, baselineValue, unit, invertedGood = false }) => {
    const { value, percent } = calculateDeviation(current, baselineValue);
    const isUp = value > 0;
    const Icon = isUp ? TrendingUp : TrendingDown;
    const color = getDeviationColor(percent, invertedGood);
    
    if (Math.abs(percent) < 1) return <span className="text-green-400 text-xs">Normal</span>;
    
    return (
      <div className={`flex items-center gap-1 text-xs ${color}`}>
        <Icon className="w-3 h-3" />
        <span>{isUp ? '+' : ''}{value.toFixed(1)} {unit} ({percent.toFixed(0)}%)</span>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center text-[#94a3b8] py-8">Loading baseline...</div>;
  }

  return (
    <div className="space-y-4" data-testid="baseline-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#e6edf3] flex items-center gap-2">
          <Target className="w-5 h-5 text-[#00d4ff]" />
          Patient Baseline Vitals
        </h3>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#00d4ff] text-black hover:bg-[#00d4ff]/90" data-testid="edit-baseline-btn">
                {baseline ? <><Edit className="w-4 h-4 mr-2" />Edit Baseline</> : <><Target className="w-4 h-4 mr-2" />Set Baseline</>}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#121a2f] border-slate-700 text-[#e6edf3] max-w-lg">
              <DialogHeader>
                <DialogTitle>{baseline ? 'Edit Baseline Vitals' : 'Set Baseline Vitals'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94a3b8]">Baseline Heart Rate (bpm)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={formData.baseline_hr}
                      onChange={(e) => setFormData({ ...formData, baseline_hr: parseFloat(e.target.value) || 0 })}
                      className="bg-[#0b1320] border-slate-700"
                      data-testid="baseline-hr-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94a3b8]">Baseline SpO2 (%)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={formData.baseline_spo2}
                      onChange={(e) => setFormData({ ...formData, baseline_spo2: parseFloat(e.target.value) || 0 })}
                      className="bg-[#0b1320] border-slate-700"
                      data-testid="baseline-spo2-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94a3b8]">Baseline BP Systolic (mmHg)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={formData.baseline_bp_systolic}
                      onChange={(e) => setFormData({ ...formData, baseline_bp_systolic: parseFloat(e.target.value) || 0 })}
                      className="bg-[#0b1320] border-slate-700"
                      data-testid="baseline-bp-sys-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94a3b8]">Baseline BP Diastolic (mmHg)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={formData.baseline_bp_diastolic}
                      onChange={(e) => setFormData({ ...formData, baseline_bp_diastolic: parseFloat(e.target.value) || 0 })}
                      className="bg-[#0b1320] border-slate-700"
                      data-testid="baseline-bp-dia-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94a3b8]">Baseline Temperature (°C)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.baseline_temp}
                      onChange={(e) => setFormData({ ...formData, baseline_temp: parseFloat(e.target.value) || 0 })}
                      className="bg-[#0b1320] border-slate-700"
                      data-testid="baseline-temp-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94a3b8]">Baseline Resp. Rate (/min)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={formData.baseline_rr}
                      onChange={(e) => setFormData({ ...formData, baseline_rr: parseFloat(e.target.value) || 0 })}
                      className="bg-[#0b1320] border-slate-700"
                      data-testid="baseline-rr-input"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-[#00d4ff] text-black hover:bg-[#00d4ff]/90" data-testid="submit-baseline-btn">
                  {baseline ? 'Update Baseline' : 'Set Baseline'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          
          {baseline && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-red-400 hover:bg-red-950/50" data-testid="delete-baseline-btn">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#121a2f] border-slate-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-[#e6edf3]">Delete Baseline</AlertDialogTitle>
                  <AlertDialogDescription className="text-[#94a3b8]">
                    Are you sure you want to delete the patient's baseline vitals?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-[#1e293b] border-slate-600 text-[#e6edf3]">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {!baseline ? (
        <div className="vital-card p-8 text-center">
          <Target className="w-12 h-12 text-[#64748b] mx-auto mb-3" />
          <p className="text-[#94a3b8]">No baseline set for this patient</p>
          <p className="text-[#64748b] text-sm">Set baseline vitals to compare current readings against the patient's normal values</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" data-testid="baseline-comparison">
          <BaselineCard
            icon={Heart}
            label="Heart Rate"
            current={currentVitals?.heart_rate}
            baseline={baseline.baseline_hr}
            unit="bpm"
          />
          <BaselineCard
            icon={Activity}
            label="BP Systolic"
            current={currentVitals?.bp_systolic}
            baseline={baseline.baseline_bp_systolic}
            unit="mmHg"
          />
          <BaselineCard
            icon={Activity}
            label="BP Diastolic"
            current={currentVitals?.bp_diastolic}
            baseline={baseline.baseline_bp_diastolic}
            unit="mmHg"
          />
          <BaselineCard
            icon={Droplets}
            label="SpO2"
            current={currentVitals?.spo2}
            baseline={baseline.baseline_spo2}
            unit="%"
            invertedGood
          />
          <BaselineCard
            icon={Thermometer}
            label="Temperature"
            current={currentVitals?.temperature}
            baseline={baseline.baseline_temp}
            unit="°C"
          />
          <BaselineCard
            icon={Wind}
            label="Resp. Rate"
            current={currentVitals?.respiratory_rate}
            baseline={baseline.baseline_rr}
            unit="/min"
          />
        </div>
      )}

      {baseline && (
        <div className="vital-card p-4 text-sm text-[#94a3b8]">
          <p>Baseline set on: {new Date(baseline.created_at).toLocaleString()}</p>
          {baseline.updated_at !== baseline.created_at && (
            <p>Last updated: {new Date(baseline.updated_at).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  );
}

function BaselineCard({ icon: Icon, label, current, baseline, unit, invertedGood = false }) {
  const diff = current - baseline;
  const percent = baseline ? (diff / baseline) * 100 : 0;
  const absPercent = Math.abs(percent);
  
  let statusColor = 'text-green-400 border-green-800';
  if (absPercent >= 20) statusColor = 'text-red-400 border-red-800';
  else if (absPercent >= 10) statusColor = 'text-yellow-400 border-yellow-800';
  
  const isUp = diff > 0;

  return (
    <div className={`vital-card p-4 border ${absPercent >= 20 ? 'border-red-800' : 'border-slate-800'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[#00d4ff]" />
        <span className="text-xs text-[#94a3b8] uppercase">{label}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-[#64748b]">Current</span>
          <span className="text-lg font-mono font-bold text-[#e6edf3]">{current?.toFixed(1) || '--'}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-[#64748b]">Baseline</span>
          <span className="text-sm font-mono text-[#94a3b8]">{baseline?.toFixed(1)}</span>
        </div>
        <div className={`flex items-center justify-end gap-1 ${statusColor}`}>
          {absPercent >= 1 ? (
            <>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span className="text-xs font-medium">{isUp ? '+' : ''}{percent.toFixed(0)}%</span>
            </>
          ) : (
            <span className="text-xs text-green-400">Normal</span>
          )}
        </div>
      </div>
    </div>
  );
}
