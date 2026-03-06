import { useState, useEffect } from 'react';
import { multimodalAPI } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, FileText, Droplet, Brain, Wind, Clock } from 'lucide-react';

const CONSCIOUSNESS_LEVELS = ['Alert', 'Verbal', 'Pain', 'Unresponsive'];
const VENTILATOR_MODES = ['None', 'CPAP', 'BiPAP', 'SIMV', 'AC/VC', 'PSV', 'PRVC'];

export default function MultimodalPanel({ patientId, onUpdate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    vitals_notes: '',
    doctor_notes: '',
    lab_reports: '',
    fluid_intake: 0,
    urine_output: 0,
    consciousness_level: 'Alert',
    ventilator_mode: 'None'
  });

  useEffect(() => {
    fetchRecords();
  }, [patientId]);

  const fetchRecords = async () => {
    try {
      const response = await multimodalAPI.getAll(patientId);
      setRecords(response.data);
    } catch (error) {
      toast.error('Failed to fetch multimodal data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vitals_notes: '',
      doctor_notes: '',
      lab_reports: '',
      fluid_intake: 0,
      urine_output: 0,
      consciousness_level: 'Alert',
      ventilator_mode: 'None'
    });
    setEditingRecord(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        await multimodalAPI.update(editingRecord.id, formData);
        toast.success('Record updated successfully');
      } else {
        await multimodalAPI.create({ patient_id: patientId, ...formData });
        toast.success('Record added successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchRecords();
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save record');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      vitals_notes: record.vitals_notes,
      doctor_notes: record.doctor_notes,
      lab_reports: record.lab_reports,
      fluid_intake: record.fluid_intake,
      urine_output: record.urine_output,
      consciousness_level: record.consciousness_level,
      ventilator_mode: record.ventilator_mode
    });
    setDialogOpen(true);
  };

  const handleDelete = async (recordId) => {
    try {
      await multimodalAPI.delete(recordId);
      toast.success('Record deleted successfully');
      fetchRecords();
      onUpdate?.();
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  const getConsciousnessColor = (level) => {
    switch (level) {
      case 'Alert': return 'text-green-400 bg-green-950/50';
      case 'Verbal': return 'text-yellow-400 bg-yellow-950/50';
      case 'Pain': return 'text-orange-400 bg-orange-950/50';
      case 'Unresponsive': return 'text-red-400 bg-red-950/50';
      default: return 'text-gray-400 bg-gray-950/50';
    }
  };

  return (
    <div className="space-y-4" data-testid="multimodal-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#e6edf3] flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#00d4ff]" />
          Multimodal Monitoring Data
        </h3>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#00d4ff] text-black hover:bg-[#00d4ff]/90" data-testid="add-multimodal-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Record
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#121a2f] border-slate-700 text-[#e6edf3] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRecord ? 'Edit Record' : 'Add Multimodal Record'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94a3b8]">Consciousness Level (AVPU)</Label>
                  <Select value={formData.consciousness_level} onValueChange={(v) => setFormData({ ...formData, consciousness_level: v })}>
                    <SelectTrigger className="bg-[#0b1320] border-slate-700" data-testid="consciousness-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121a2f] border-slate-700">
                      {CONSCIOUSNESS_LEVELS.map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94a3b8]">Ventilator Mode</Label>
                  <Select value={formData.ventilator_mode} onValueChange={(v) => setFormData({ ...formData, ventilator_mode: v })}>
                    <SelectTrigger className="bg-[#0b1320] border-slate-700" data-testid="ventilator-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121a2f] border-slate-700">
                      {VENTILATOR_MODES.map(mode => (
                        <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#94a3b8]">Fluid Intake (ml)</Label>
                  <Input
                    type="number"
                    value={formData.fluid_intake}
                    onChange={(e) => setFormData({ ...formData, fluid_intake: parseFloat(e.target.value) || 0 })}
                    className="bg-[#0b1320] border-slate-700"
                    data-testid="fluid-intake-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#94a3b8]">Urine Output (ml)</Label>
                  <Input
                    type="number"
                    value={formData.urine_output}
                    onChange={(e) => setFormData({ ...formData, urine_output: parseFloat(e.target.value) || 0 })}
                    className="bg-[#0b1320] border-slate-700"
                    data-testid="urine-output-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#94a3b8]">Doctor Notes</Label>
                <Textarea
                  value={formData.doctor_notes}
                  onChange={(e) => setFormData({ ...formData, doctor_notes: e.target.value })}
                  placeholder="Enter clinical observations..."
                  className="bg-[#0b1320] border-slate-700 min-h-[80px]"
                  data-testid="doctor-notes-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#94a3b8]">Lab Reports</Label>
                <Textarea
                  value={formData.lab_reports}
                  onChange={(e) => setFormData({ ...formData, lab_reports: e.target.value })}
                  placeholder="Enter lab results (CBC, BMP, ABG, etc.)..."
                  className="bg-[#0b1320] border-slate-700 min-h-[80px]"
                  data-testid="lab-reports-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#94a3b8]">Vitals Notes</Label>
                <Textarea
                  value={formData.vitals_notes}
                  onChange={(e) => setFormData({ ...formData, vitals_notes: e.target.value })}
                  placeholder="Additional notes about vital signs..."
                  className="bg-[#0b1320] border-slate-700 min-h-[60px]"
                  data-testid="vitals-notes-input"
                />
              </div>

              <Button type="submit" className="w-full bg-[#00d4ff] text-black hover:bg-[#00d4ff]/90" data-testid="submit-multimodal-btn">
                {editingRecord ? 'Update Record' : 'Add Record'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Records List */}
      {loading ? (
        <div className="text-center text-[#94a3b8] py-8">Loading...</div>
      ) : records.length === 0 ? (
        <div className="vital-card p-8 text-center">
          <FileText className="w-12 h-12 text-[#64748b] mx-auto mb-3" />
          <p className="text-[#94a3b8]">No multimodal records yet</p>
          <p className="text-[#64748b] text-sm">Add records to track doctor notes, lab reports, and more</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="multimodal-records">
          {records.map((record) => (
            <div key={record.id} className="vital-card p-4" data-testid={`multimodal-record-${record.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${getConsciousnessColor(record.consciousness_level)}`}>
                    <Brain className="w-3 h-3 inline mr-1" />
                    {record.consciousness_level}
                  </div>
                  {record.ventilator_mode !== 'None' && (
                    <div className="px-3 py-1 rounded-full text-xs font-bold bg-blue-950/50 text-blue-400">
                      <Wind className="w-3 h-3 inline mr-1" />
                      {record.ventilator_mode}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(record)} className="text-[#00d4ff] hover:bg-[#00d4ff]/10">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-950/50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#121a2f] border-slate-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#e6edf3]">Delete Record</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#94a3b8]">
                          Are you sure you want to delete this multimodal record?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[#1e293b] border-slate-600 text-[#e6edf3]">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(record.id)} className="bg-red-600 text-white hover:bg-red-700">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div className="bg-[#0b1320] rounded-lg p-3">
                  <div className="text-xs text-[#64748b] mb-1 flex items-center gap-1">
                    <Droplet className="w-3 h-3" /> Fluid Intake
                  </div>
                  <div className="text-lg font-mono text-[#00d4ff]">{record.fluid_intake} ml</div>
                </div>
                <div className="bg-[#0b1320] rounded-lg p-3">
                  <div className="text-xs text-[#64748b] mb-1 flex items-center gap-1">
                    <Droplet className="w-3 h-3" /> Urine Output
                  </div>
                  <div className="text-lg font-mono text-[#4ade80]">{record.urine_output} ml</div>
                </div>
                <div className="bg-[#0b1320] rounded-lg p-3">
                  <div className="text-xs text-[#64748b] mb-1">Fluid Balance</div>
                  <div className={`text-lg font-mono ${record.fluid_intake - record.urine_output > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {record.fluid_intake - record.urine_output > 0 ? '+' : ''}{record.fluid_intake - record.urine_output} ml
                  </div>
                </div>
                <div className="bg-[#0b1320] rounded-lg p-3">
                  <div className="text-xs text-[#64748b] mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Timestamp
                  </div>
                  <div className="text-sm text-[#94a3b8]">{new Date(record.timestamp).toLocaleString()}</div>
                </div>
              </div>

              {record.doctor_notes && (
                <div className="mb-2">
                  <div className="text-xs text-[#64748b] mb-1">Doctor Notes</div>
                  <div className="text-sm text-[#e6edf3] bg-[#0b1320] rounded p-2">{record.doctor_notes}</div>
                </div>
              )}

              {record.lab_reports && (
                <div className="mb-2">
                  <div className="text-xs text-[#64748b] mb-1">Lab Reports</div>
                  <div className="text-sm text-[#e6edf3] bg-[#0b1320] rounded p-2 font-mono">{record.lab_reports}</div>
                </div>
              )}

              {record.vitals_notes && (
                <div>
                  <div className="text-xs text-[#64748b] mb-1">Vitals Notes</div>
                  <div className="text-sm text-[#94a3b8] bg-[#0b1320] rounded p-2">{record.vitals_notes}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
