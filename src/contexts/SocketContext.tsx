'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinAuction: (auctionId: string) => void;
  leaveAuction: (auctionId: string) => void;
  sendMessage: (auctionId: string, message: string) => void;
  emitBidUpdate: (auctionId: string, bid: any) => void;
  emitAuctionStatusUpdate: (auctionId: string, status: string) => void;
  emitPlayerUpdate: (auctionId: string, player: any) => void;
  emitTimerUpdate: (auctionId: string, remaining: number) => void;
  emitPlayerSold: (auctionId: string, player: any, team: any, amount: number) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Initialize socket connection
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const token = localStorage.getItem('token');
    
    const newSocket = io(socketUrl, {
      auth: {
        token
      }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const joinAuction = (auctionId: string) => {
    if (socket) {
      socket.emit('join_auction', auctionId);
    }
  };

  const leaveAuction = (auctionId: string) => {
    if (socket) {
      socket.emit('leave_auction', auctionId);
    }
  };

  const sendMessage = (auctionId: string, message: string) => {
    if (socket) {
      socket.emit('send_message', { auctionId, message });
    }
  };

  const emitBidUpdate = (auctionId: string, bid: any) => {
    if (socket) {
      socket.emit('place_bid', { auctionId, bid });
    }
  };

  const emitAuctionStatusUpdate = (auctionId: string, status: string) => {
    if (socket) {
      socket.emit('auction_status_update', { auctionId, status });
    }
  };

  const emitPlayerUpdate = (auctionId: string, player: any) => {
    if (socket) {
      socket.emit('player_update', { auctionId, player });
    }
  };

  const emitTimerUpdate = (auctionId: string, remaining: number) => {
    if (socket) {
      socket.emit('timer_update', { auctionId, remaining });
    }
  };

  const emitPlayerSold = (auctionId: string, player: any, team: any, amount: number) => {
    if (socket) {
      socket.emit('player_sold', { auctionId, player, team, amount });
    }
  };

  const value = {
    socket,
    connected,
    joinAuction,
    leaveAuction,
    sendMessage,
    emitBidUpdate,
    emitAuctionStatusUpdate,
    emitPlayerUpdate,
    emitTimerUpdate,
    emitPlayerSold
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
