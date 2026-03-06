import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientsAPI, doctorsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Users, Bed, User, Droplets, AlertCircle, Trash2 } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';

export default function PatientManagement() {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Male',
    blood_group: 'O+',
    ward_bed: '',
    assigned_doctor_id: '',
    allergies: '',
    medications: '',
    emergency_contact: '',
    diabetes: false,
    hypertension: false,
    heart_disease: false,
    asthma: false,
    ckd: false,
    previous_icu: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [patientsRes, doctorsRes] = await Promise.all([
        patientsAPI.getAll(),
        doctorsAPI.getAll()
      ]);
      setPatients(patientsRes.data);
      setDoctors(doctorsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.assigned_doctor_id) {
      toast.error('Please select a doctor');
      return;
    }
    
    try {
      await patientsAPI.create({
        ...formData,
        age: parseInt(formData.age)
      });
      toast.success('Patient added successfully');
      setDialogOpen(false);
      setFormData({
        name: '',
        age: '',
        gender: 'Male',
        blood_group: 'O+',
        ward_bed: '',
        assigned_doctor_id: '',
        allergies: '',
        medications: '',
        emergency_contact: '',
        diabetes: false,
        hypertension: false,
        heart_disease: false,
        asthma: false,
        ckd: false,
        previous_icu: false
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add patient');
    }
  };

  const handleDelete = async (e, patientId, patientName) => {
    e.stopPropagation();
    try {
      await patientsAPI.delete(patientId);
      toast.success(`${patientName} discharged successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to discharge patient');
    }
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const genders = ['Male', 'Female', 'Other'];

  const medicalHistoryFields = [
    { key: 'diabetes', label: 'Diabetes' },
    { key: 'hypertension', label: 'Hypertension' },
    { key: 'heart_disease', label: 'Heart Disease' },
    { key: 'asthma', label: 'Asthma' },
    { key: 'ckd', label: 'CKD' },
    { key: 'previous_icu', label: 'Previous ICU Admission' }
  ];

  return (
    <div className="min-h-screen bg-[#0b1320]" data-testid="patient-management-page">
      <Navbar />
      
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#e6edf3]">Patient Management</h1>
            <p className="text-[#94a3b8]">{patients.length} patients admitted</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-[#00d4ff] text-black font-semibold hover:bg-[#00d4ff]/90 btn-glow"
                data-testid="add-patient-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Admit Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#121a2f] border-slate-700 text-[#e6edf3] max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Admit New Patient</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                {/* Basic Info */}
                <div>
                  <h4 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#94a3b8]">Patient Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        className="bg-[#0b1320] border-slate-700"
                        required
                        data-testid="patient-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#94a3b8]">Age</Label>
                      <Input
                        type="number"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        placeholder="45"
                        className="bg-[#0b1320] border-slate-700"
                        required
                        data-testid="patient-age-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label className="text-[#94a3b8]">Gender</Label>
                      <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                        <SelectTrigger className="bg-[#0b1320] border-slate-700" data-testid="patient-gender-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#121a2f] border-slate-700">
                          {genders.map(g => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#94a3b8]">Blood Group</Label>
                      <Select value={formData.blood_group} onValueChange={(v) => setFormData({ ...formData, blood_group: v })}>
                        <SelectTrigger className="bg-[#0b1320] border-slate-700" data-testid="patient-blood-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#121a2f] border-slate-700">
                          {bloodGroups.map(bg => (
                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#94a3b8]">Ward/Bed Number</Label>
                      <Input
                        value={formData.ward_bed}
                        onChange={(e) => setFormData({ ...formData, ward_bed: e.target.value })}
                        placeholder="ICU-01"
                        className="bg-[#0b1320] border-slate-700"
                        required
                        data-testid="patient-bed-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Assigned Doctor */}
                <div>
                  <h4 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Assigned Doctor</h4>
                  <Select value={formData.assigned_doctor_id} onValueChange={(v) => setFormData({ ...formData, assigned_doctor_id: v })}>
                    <SelectTrigger className="bg-[#0b1320] border-slate-700" data-testid="patient-doctor-select">
                      <SelectValue placeholder="Select a doctor" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121a2f] border-slate-700">
                      {doctors.map(doc => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.name} - {doc.specialization}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {doctors.length === 0 && (
                    <p className="text-yellow-400 text-sm mt-2">
                      No doctors available. Please add a doctor first.
                    </p>
                  )}
                </div>

                {/* Medical Info */}
                <div>
                  <h4 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Medical Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#94a3b8]">Allergies</Label>
                      <Input
                        value={formData.allergies}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                        placeholder="Penicillin, Peanuts"
                        className="bg-[#0b1320] border-slate-700"
                        data-testid="patient-allergies-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#94a3b8]">Current Medications</Label>
                      <Input
                        value={formData.medications}
                        onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                        placeholder="Aspirin, Metformin"
                        className="bg-[#0b1320] border-slate-700"
                        data-testid="patient-medications-input"
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label className="text-[#94a3b8]">Emergency Contact</Label>
                    <Input
                      value={formData.emergency_contact}
                      onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                      placeholder="+1 234 567 8900"
                      className="bg-[#0b1320] border-slate-700"
                      required
                      data-testid="patient-emergency-input"
                    />
                  </div>
                </div>

                {/* Medical History */}
                <div>
                  <h4 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Past Medical History</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {medicalHistoryFields.map(field => (
                      <div key={field.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.key}
                          checked={formData[field.key]}
                          onCheckedChange={(checked) => setFormData({ ...formData, [field.key]: checked })}
                          className="border-slate-600 data-[state=checked]:bg-[#00d4ff] data-[state=checked]:border-[#00d4ff]"
                          data-testid={`patient-${field.key}-checkbox`}
                        />
                        <Label htmlFor={field.key} className="text-[#e6edf3] text-sm cursor-pointer">
                          {field.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-[#00d4ff] text-black font-semibold hover:bg-[#00d4ff]/90"
                  data-testid="submit-patient-btn"
                >
                  Admit Patient
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Patients Table */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-[80px] bg-[#121a2f] rounded-xl" />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-6 bg-[#121a2f] rounded-2xl border border-slate-800 mb-6">
              <Users className="w-16 h-16 text-[#64748b]" />
            </div>
            <h2 className="text-xl font-semibold text-[#e6edf3] mb-2">No Patients Yet</h2>
            <p className="text-[#94a3b8] mb-6">Admit patients to start monitoring their vitals</p>
          </div>
        ) : (
          <div className="vital-card overflow-hidden" data-testid="patients-table">
            <table className="w-full vital-table">
              <thead>
                <tr>
                  <th className="text-left p-4">Patient</th>
                  <th className="text-left p-4">Bed</th>
                  <th className="text-left p-4">Doctor</th>
                  <th className="text-left p-4">Blood</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr 
                    key={patient.id}
                    className="hover:bg-[#1e293b]/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/patient/${patient.id}`)}
                    data-testid={`patient-row-${patient.id}`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#1e293b] rounded-lg">
                          <User className="w-5 h-5 text-[#00d4ff]" />
                        </div>
                        <div>
                          <div className="font-medium text-[#e6edf3]">{patient.name}</div>
                          <div className="text-sm text-[#64748b]">{patient.age}y, {patient.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-[#94a3b8]">
                        <Bed className="w-4 h-4" />
                        {patient.ward_bed}
                      </div>
                    </td>
                    <td className="p-4 text-[#94a3b8]">{patient.assigned_doctor_name}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-[#ef4444]">
                        <Droplets className="w-4 h-4" />
                        {patient.blood_group}
                      </div>
                    </td>
                    <td className="p-4">
                      <RiskBadge level={patient.risk_level || 'LOW'} />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#00d4ff] hover:bg-[#00d4ff]/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patient/${patient.id}`);
                          }}
                          data-testid={`view-patient-${patient.id}`}
                        >
                          View
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`delete-patient-${patient.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#121a2f] border-slate-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-[#e6edf3]">Discharge Patient</AlertDialogTitle>
                              <AlertDialogDescription className="text-[#94a3b8]">
                                Are you sure you want to discharge {patient.name}? This will remove all their monitoring data and alerts.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-[#1e293b] border-slate-600 text-[#e6edf3] hover:bg-[#2d3a4f]">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(e) => handleDelete(e, patient.id, patient.name)}
                                className="bg-red-600 text-white hover:bg-red-700"
                              >
                                Discharge
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
