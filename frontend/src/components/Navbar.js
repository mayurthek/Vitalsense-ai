import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Activity, Bell, Users, Stethoscope, LayoutDashboard, LogOut, User, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/patients', label: 'Patients', icon: Users },
    { path: '/doctors', label: 'Doctors', icon: Stethoscope },
    { path: '/alerts', label: 'Alerts', icon: Bell },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#0b1320]/95 backdrop-blur-md border-b border-slate-800" data-testid="navbar">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group" data-testid="nav-logo">
            <div className="p-2 bg-[#00d4ff]/10 rounded-lg border border-[#00d4ff]/30 group-hover:bg-[#00d4ff]/20 transition-colors">
              <Activity className="w-6 h-6 text-[#00d4ff]" />
            </div>
            <div>
              <span className="text-lg font-bold text-[#e6edf3] tracking-tight">VitalSense AI</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#64748b] uppercase tracking-widest">ICU Monitor</span>
                <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            </div>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30'
                      : 'text-[#94a3b8] hover:text-[#e6edf3] hover:bg-[#1e293b]'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1e293b] transition-colors"
                data-testid="user-menu-trigger"
              >
                <div className="w-8 h-8 rounded-full bg-[#00d4ff]/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#00d4ff]" />
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-[#e6edf3]">{user?.name}</div>
                  <div className="text-xs text-[#64748b] capitalize">{user?.role}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-[#64748b]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 bg-[#121a2f] border-slate-700 text-[#e6edf3]"
            >
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-[#64748b]">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 focus:text-red-300 cursor-pointer"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
