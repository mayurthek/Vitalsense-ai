import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

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
  const audioRef = useRef(null);

  useEffect(() => {
    const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
    
    socketRef.current = io(BACKEND_URL, {
      path: '/socket.io/',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current.id);
      setConnected(true);
    });

    socketRef.current.on('connect_error', (error) => {
      console.log('Socket connection error:', error.message);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    });

    socketRef.current.on('vitals_update', (data) => {
      setVitalsData(prev => ({
        ...prev,
        [data.patient_id]: {
          vitals: data.vitals,
          risk_level: data.risk_level,
          risk_score: data.risk_score
        }
      }));

      // Play alert sound for critical patients
      if (data.risk_level === 'CRITICAL') {
        playAlertSound();
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const playAlertSound = () => {
    try {
      // Create oscillator for alert sound
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
  };

  const joinPatientRoom = (patientId) => {
    if (socketRef.current) {
      socketRef.current.emit('join_patient_room', { patient_id: patientId });
    }
  };

  const leavePatientRoom = (patientId) => {
    if (socketRef.current) {
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
