import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Activity, Lock, Mail, User, Shield } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'doctor'
  });
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        await register(formData.email, formData.password, formData.name, formData.role);
        toast.success('Account created successfully!');
      }
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1697082977798-72ff9de23c88?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MDV8MHwxfHNlYXJjaHwxfHxob3NwaXRhbCUyMGZ1dHVyaXN0aWMlMjBjb2F0fGVufDB8fHx8MTc3Mjc3OTczOXww&ixlib=rb-4.1.0&q=85')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-[#0b1320]/85 backdrop-blur-sm" />
      
      {/* Login Card */}
      <div 
        className="relative z-10 w-full max-w-md glass border border-slate-700/50 rounded-2xl p-8 shadow-2xl animate-fade-in"
        data-testid="login-card"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 bg-[#00d4ff]/10 rounded-xl border border-[#00d4ff]/30">
            <Activity className="w-8 h-8 text-[#00d4ff]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#e6edf3] tracking-tight">VitalSense AI</h1>
            <p className="text-xs text-[#94a3b8] uppercase tracking-widest">ICU Monitoring System</p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex bg-[#0b1320] rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              isLogin 
                ? 'bg-[#00d4ff] text-black' 
                : 'text-[#94a3b8] hover:text-[#e6edf3]'
            }`}
            data-testid="login-tab"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              !isLogin 
                ? 'bg-[#00d4ff] text-black' 
                : 'text-[#94a3b8] hover:text-[#e6edf3]'
            }`}
            data-testid="register-tab"
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div className="space-y-2 animate-fade-in">
              <Label className="text-[#94a3b8] text-sm">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                <Input
                  type="text"
                  placeholder="Dr. John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-10 bg-[#0b1320] border-slate-700 text-[#e6edf3] placeholder:text-slate-600"
                  required={!isLogin}
                  data-testid="name-input"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[#94a3b8] text-sm">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <Input
                type="email"
                placeholder="doctor@hospital.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="pl-10 bg-[#0b1320] border-slate-700 text-[#e6edf3] placeholder:text-slate-600"
                required
                data-testid="email-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#94a3b8] text-sm">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <Input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10 bg-[#0b1320] border-slate-700 text-[#e6edf3] placeholder:text-slate-600"
                required
                data-testid="password-input"
              />
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-2 animate-fade-in">
              <Label className="text-[#94a3b8] text-sm">Role</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-[#0b1320] border border-slate-700 rounded-md text-[#e6edf3] focus:ring-1 focus:ring-[#00d4ff] focus:border-[#00d4ff]"
                  data-testid="role-select"
                >
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00d4ff] text-black font-semibold hover:bg-[#00d4ff]/90 btn-glow py-5"
            data-testid="submit-button"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-[#64748b] leading-relaxed">
          VitalSense AI is a clinical decision support tool.<br />
          Alerts are advisory only.
        </p>
      </div>
    </div>
  );
}
