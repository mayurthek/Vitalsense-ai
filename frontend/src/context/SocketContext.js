import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { patientsAPI } from '../services/api';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [vitalsData, setVitalsData] = useState({});
  const socketRef = useRef(null);
  const pollingRef = useRef(null);
  const lastCriticalRef = useRef({});

  const playAlertSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not available');
    }
  }, []);

  // Polling function to fetch vitals every 3 seconds
  const fetchVitals = useCallback(async () => {
    try {
      const token = localStorage.getItem('vitalsense_token');
      if (!token) return;

      const response = await patientsAPI.getAll();
      const patients = response.data;
      
      const newVitalsData = {};
      patients.forEach(patient => {
        newVitalsData[patient.id] = {
          vitals: patient.current_vitals,
          risk_level: patient.risk_level,
          risk_score: patient.risk_score
        };
        
        // Play sound for new critical patients
        if (patient.risk_level === 'CRITICAL' && !lastCriticalRef.current[patient.id]) {
          playAlertSound();
        }
        lastCriticalRef.current[patient.id] = patient.risk_level === 'CRITICAL';
      });
      
      setVitalsData(newVitalsData);
      setConnected(true);
    } catch (error) {
      console.log('Error fetching vitals:', error.message);
    }
  }, [playAlertSound]);

  useEffect(() => {
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
    
    // Try Socket.IO connection
    socketRef.current = io(BACKEND_URL, {
      path: '/socket.io/',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    let socketConnected = false;

    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current.id);
      socketConnected = true;
      setConnected(true);
    });

    socketRef.current.on('connect_error', (error) => {
      console.log('Socket connection error, using polling fallback');
      socketConnected = false;
    });

    socketRef.current.on('disconnect', () => {
      socketConnected = false;
    });

    socketRef.current.on('vitals_update', (data) => {
      if (socketConnected) {
        setVitalsData(prev => ({
          ...prev,
          [data.patient_id]: {
            vitals: data.vitals,
            risk_level: data.risk_level,
            risk_score: data.risk_score
          }
        }));

        if (data.risk_level === 'CRITICAL' && !lastCriticalRef.current[data.patient_id]) {
          playAlertSound();
        }
        lastCriticalRef.current[data.patient_id] = data.risk_level === 'CRITICAL';
      }
    });

    // Always use polling for reliable updates (every 3 seconds)
    fetchVitals(); // Initial fetch
    pollingRef.current = setInterval(fetchVitals, 3000);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchVitals, playAlertSound]);

  const joinPatientRoom = (patientId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_patient_room', { patient_id: patientId });
    }
  };

  const leavePatientRoom = (patientId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_patient_room', { patient_id: patientId });
    }
  };

  const subscribeToPatientVitals = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('patient_vitals', callback);
    }
  };

  const unsubscribeFromPatientVitals = (callback) => {
    if (socketRef.current) {
      socketRef.current.off('patient_vitals', callback);
    }
  };

  return (
    <SocketContext.Provider value={{
      connected,
      vitalsData,
      joinPatientRoom,
      leavePatientRoom,
      subscribeToPatientVitals,
      unsubscribeFromPatientVitals,
      playAlertSound
    }}>
      {children}
    </SocketContext.Provider>
  );
};
