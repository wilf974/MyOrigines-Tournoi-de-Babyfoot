import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * Contexte WebSocket pour les mises à jour en temps réel
 */
const WebSocketContext = createContext();

/**
 * Provider WebSocket
 */
export function WebSocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Créer la connexion WebSocket
    const newSocket = io('http://localhost:2001', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('🔌 WebSocket connecté:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 WebSocket déconnecté');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erreur connexion WebSocket:', error);
      setConnected(false);
    });

    setSocket(newSocket);

    // Nettoyage à la déconnexion
    return () => {
      newSocket.close();
    };
  }, []);

  const value = {
    socket,
    connected
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook pour utiliser le contexte WebSocket
 */
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket doit être utilisé dans un WebSocketProvider');
  }
  return context;
}

export default WebSocketContext;
