import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vitalsense_token');
    const savedUser = localStorage.getItem('vitalsense_user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user: userData } = response.data;
    
    localStorage.setItem('vitalsense_token', token);
    localStorage.setItem('vitalsense_user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name, role = 'doctor') => {
    const response = await api.post('/auth/register', { email, password, name, role });
    const { token, user: userData } = response.data;
    
    localStorage.setItem('vitalsense_token', token);
    localStorage.setItem('vitalsense_user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('vitalsense_token');
    localStorage.removeItem('vitalsense_user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
