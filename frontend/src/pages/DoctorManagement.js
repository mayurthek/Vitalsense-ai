import { useState, useEffect } from 'react';
import { doctorsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, User, Stethoscope, Clock, Phone, Badge, Building, Trash2 } from 'lucide-react';

export default function DoctorManagement() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    license_number: '',
    department: '',
    shift_timing: '',
    contact: ''
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await doctorsAPI.getAll();
      setDoctors(response.data);
    } catch (error) {
      toast.error('Failed to fetch doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await doctorsAPI.create(formData);
      toast.success('Doctor added successfully');
      setDialogOpen(false);
      setFormData({
        name: '',
        specialization: '',
        license_number: '',
        department: '',
        shift_timing: '',
        contact: ''
      });
      fetchDoctors();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add doctor');
    }
  };

  const handleDelete = async (doctorId, doctorName) => {
    try {
      await doctorsAPI.delete(doctorId);
      toast.success(`Dr. ${doctorName} removed successfully`);
      fetchDoctors();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete doctor');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1320]" data-testid="doctor-management-page">
      <Navbar />
      
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#e6edf3]">Doctor Management</h1>
            <p className="text-[#94a3b8]">{doctors.length} doctors registered</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-[#00d4ff] text-black font-semibold hover:bg-[#00d4ff]/90 btn-glow"
                data-testid="add-doctor-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Doctor
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#121a2f] border-slate-700 text-[#e6edf3] max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Add New Doctor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94a3b8]">Full Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Dr. John Smith"
                      className="bg-[#0b1320] border-slate-700"
                      required
                      data-testid="doctor-name-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94a3b8]">Specialization</Label>
                    <Input
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      placeholder="Critical Care"
                      className="bg-[#0b1320] border-slate-700"
                      required
                      data-testid="doctor-specialization-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94a3b8]">License Number</Label>
                    <Input
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                      placeholder="MD-12345"
                      className="bg-[#0b1320] border-slate-700"
                      required
                      data-testid="doctor-license-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94a3b8]">Department</Label>
                    <Input
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="ICU"
                      className="bg-[#0b1320] border-slate-700"
                      required
                      data-testid="doctor-department-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#94a3b8]">Shift Timing</Label>
                    <Input
                      value={formData.shift_timing}
                      onChange={(e) => setFormData({ ...formData, shift_timing: e.target.value })}
                      placeholder="8AM - 8PM"
                      className="bg-[#0b1320] border-slate-700"
                      required
                      data-testid="doctor-shift-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#94a3b8]">Contact</Label>
                    <Input
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      placeholder="+1 234 567 8900"
                      className="bg-[#0b1320] border-slate-700"
                      required
                      data-testid="doctor-contact-input"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-[#00d4ff] text-black font-semibold hover:bg-[#00d4ff]/90"
                  data-testid="submit-doctor-btn"
                >
                  Add Doctor
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Doctors Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[200px] bg-[#121a2f] rounded-xl" />
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-6 bg-[#121a2f] rounded-2xl border border-slate-800 mb-6">
              <Stethoscope className="w-16 h-16 text-[#64748b]" />
            </div>
            <h2 className="text-xl font-semibold text-[#e6edf3] mb-2">No Doctors Yet</h2>
            <p className="text-[#94a3b8] mb-6">Add doctors to assign them to patients</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="doctors-grid">
            {doctors.map((doctor, index) => (
              <div 
                key={doctor.id}
                className="vital-card p-5 animate-fade-in hover:border-[#00d4ff]/30 transition-all"
                style={{ animationDelay: `${index * 50}ms` }}
                data-testid={`doctor-card-${doctor.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#00d4ff]/10 rounded-xl">
                    <User className="w-8 h-8 text-[#00d4ff]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#e6edf3]">{doctor.name}</h3>
                    <p className="text-[#00d4ff] text-sm">{doctor.specialization}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-950/50"
                        data-testid={`delete-doctor-${doctor.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#121a2f] border-slate-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#e6edf3]">Remove Doctor</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#94a3b8]">
                          Are you sure you want to remove Dr. {doctor.name}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[#1e293b] border-slate-600 text-[#e6edf3] hover:bg-[#2d3a4f]">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(doctor.id, doctor.name)}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-[#94a3b8]">
                    <Badge className="w-4 h-4" />
                    <span>{doctor.license_number}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#94a3b8]">
                    <Building className="w-4 h-4" />
                    <span>{doctor.department}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#94a3b8]">
                    <Clock className="w-4 h-4" />
                    <span>{doctor.shift_timing}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#94a3b8]">
                    <Phone className="w-4 h-4" />
                    <span>{doctor.contact}</span>
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
