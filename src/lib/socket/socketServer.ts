import { Server as HTTPServer } from 'http';
import { Socket, Server } from 'socket.io';
import { verifyToken } from '@/lib/utils/auth';
import { config } from '@/lib/config/config';

export interface SocketWithAuth extends Socket {
  userId?: string;
  username?: string;
  role?: string;
}

export function initializeSocketServer(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: config.cors,
    pingTimeout: config.websocket.pingTimeout,
    pingInterval: config.websocket.pingInterval
  });

  // Authentication middleware
  io.use(async (socket: SocketWithAuth, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (token) {
        const payload = verifyToken(token);
        socket.userId = payload.userId;
        socket.username = payload.username;
        socket.role = payload.role;
      }
      
      next();
    } catch (error) {
      // Allow connection even without auth (for viewers)
      next();
    }
  });

  io.on('connection', (socket: SocketWithAuth) => {
    console.log(`User connected: ${socket.username || 'Anonymous'} (${socket.id})`);

    // Join auction room
    socket.on('join_auction', (auctionId: string) => {
      socket.join(`auction_${auctionId}`);
      console.log(`${socket.username || 'Anonymous'} joined auction ${auctionId}`);
      
      // Notify others
      socket.to(`auction_${auctionId}`).emit('user_joined', {
        userId: socket.userId,
        username: socket.username || 'Anonymous',
        timestamp: new Date()
      });
    });

    // Leave auction room
    socket.on('leave_auction', (auctionId: string) => {
      socket.leave(`auction_${auctionId}`);
      console.log(`${socket.username || 'Anonymous'} left auction ${auctionId}`);
      
      // Notify others
      socket.to(`auction_${auctionId}`).emit('user_left', {
        userId: socket.userId,
        username: socket.username || 'Anonymous',
        timestamp: new Date()
      });
    });

    // Handle chat messages
    socket.on('send_message', (data: { auctionId: string; message: string }) => {
      io.to(`auction_${data.auctionId}`).emit('new_message', {
        userId: socket.userId,
        username: socket.username || 'Anonymous',
        message: data.message,
        timestamp: new Date()
      });
    });

    // Handle bid updates
    socket.on('place_bid', (data: { auctionId: string; bid: any }) => {
      io.to(`auction_${data.auctionId}`).emit('bid_update', {
        ...data.bid,
        timestamp: new Date()
      });
    });

    // Handle auction status updates
    socket.on('auction_status_update', (data: { auctionId: string; status: string }) => {
      io.to(`auction_${data.auctionId}`).emit('auction_status_changed', {
        status: data.status,
        timestamp: new Date()
      });
    });

    // Handle player updates
    socket.on('player_update', (data: { auctionId: string; player: any }) => {
      io.to(`auction_${data.auctionId}`).emit('current_player_changed', {
        player: data.player,
        timestamp: new Date()
      });
    });

    // Handle timer updates
    socket.on('timer_update', (data: { auctionId: string; remaining: number }) => {
      io.to(`auction_${data.auctionId}`).emit('timer_tick', {
        remaining: data.remaining,
        timestamp: new Date()
      });
    });

    // Handle player sold
    socket.on('player_sold', (data: { auctionId: string; player: any; team: any; amount: number }) => {
      io.to(`auction_${data.auctionId}`).emit('player_sold_update', {
        player: data.player,
        team: data.team,
        amount: data.amount,
        timestamp: new Date()
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.username || 'Anonymous'} (${socket.id})`);
    });
  });

  return io;
}
