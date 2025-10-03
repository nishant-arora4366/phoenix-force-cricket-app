// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
  LinearProgress,
  Container,
  Button
} from '@mui/material';
import {
  Timer,
  Send,
  AttachMoney,
  Visibility
} from '@mui/icons-material';
import { useSocket } from '@/contexts/SocketContext';
import { ViewerProvider } from '@/contexts/ViewerContext';
import axios from 'axios';

interface Player {
  _id: string;
  name: string;
  role: string[];
  basePrice?: number;
  soldPrice?: number;
  teamId?: string;
}

interface AuctionDetail {
  _id: string;
  name: string;
  status: string;
  currentPlayer?: Player;
  players: Player[];
  soldPlayers: Player[];
  skippedPlayers: Player[];
  unsoldPlayers: Player[];
  timer: {
    isActive: boolean;
    seconds: number;
  };
}

interface Bid {
  _id: string;
  amount: number;
  teamId: {
    _id: string;
    name: string;
  };
  bidderId: {
    username: string;
  };
  timestamp: string;
}

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  type: string;
  timestamp: Date;
}

const ViewerAuctionPage = () => {
  const params = useParams();
  const auctionId = params.id as string;
  const { socket } = useSocket();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [currentBids, setCurrentBids] = useState<Bid[]>([]);
  const [highestBid, setHighestBid] = useState<Bid | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewerName, setViewerName] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (isRegistered) {
      fetchAuctionDetails();
      if (socket) {
        joinAuctionRoom();
        setupSocketListeners();
      }
    }

    return () => {
      if (socket && isRegistered) {
        socket.emit('leave-auction', { auctionId });
      }
    };
  }, [auctionId, socket, isRegistered]);

  const fetchAuctionDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/auctions/${auctionId}/public`);
      setAuction(response.data.auction);
      
      if (response.data.auction.currentPlayer) {
        fetchCurrentBids();
      }
    } catch (error) {
      console.error('Error fetching auction:', error);
      setError('Failed to fetch auction details');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentBids = async () => {
    try {
      const response = await axios.get(`/api/bids/auction/${auctionId}/current`);
      setCurrentBids(response.data.bids || []);
      if (response.data.bids.length > 0) {
        setHighestBid(response.data.bids[0]);
      }
    } catch (error) {
      console.error('Error fetching bids:', error);
    }
  };

  const joinAuctionRoom = () => {
    if (socket) {
      socket.emit('join-auction', { 
        auctionId,
        role: 'viewer',
        username: viewerName
      });
    }
  };

  const setupSocketListeners = () => {
    if (!socket) return;

    socket.on('auction-updated', (data) => {
      setAuction(data.auction);
      if (!data.auction.currentPlayer) {
        setCurrentBids([]);
        setHighestBid(null);
      }
    });

    socket.on('new-bid', (data) => {
      setCurrentBids(prev => [data.bid, ...prev].slice(0, 10));
      setHighestBid(data.bid);
    });

    socket.on('timer-update', (data) => {
      setAuction(prev => prev ? {
        ...prev,
        timer: { isActive: true, seconds: data.seconds }
      } : null);
    });

    socket.on('player-sold', (data) => {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        username: 'System',
        message: `${data.player.name} sold to ${data.team.name} for ₹${data.amount.toLocaleString()}!`,
        type: 'system',
        timestamp: new Date()
      }]);
    });

    socket.on('chat-message', (data) => {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        username: data.username,
        message: data.message,
        type: data.type || 'user',
        timestamp: new Date()
      }]);
    });
  };

  const handleRegister = async () => {
    if (!viewerName.trim()) return;
    
    try {
      // Create temporary viewer session
      const response = await axios.post('/api/auth/temp-viewer', {
        username: viewerName
      });
      
      if (response.data.token) {
        // Store token for this session
        localStorage.setItem('viewerToken', response.data.token);
        setIsRegistered(true);
      }
    } catch (error) {
      console.error('Error registering viewer:', error);
      setError('Failed to register as viewer');
    }
  };

  const sendMessage = () => {
    if (!message.trim() || !socket) return;

    socket.emit('send-message', {
      auctionId,
      message: message.trim(),
      username: viewerName
    });

    setMessage('');
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  if (!isRegistered) {
    return (
      <Container maxWidth="sm">
        <Box mt={8}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Visibility sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Join as Viewer
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Enter your name to view this live auction
            </Typography>
            <TextField
              fullWidth
              label="Your Name"
              value={viewerName}
              onChange={(e) => setViewerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleRegister}
              disabled={!viewerName.trim()}
              size="large"
            >
              Join Auction
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !auction) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error || 'Auction not found'}
        </Alert>
      </Container>
    );
  }

  const currentPlayer = auction.currentPlayer;
  const isAuctionActive = auction.status === 'active';

  return (
    <ViewerProvider>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">
              {auction.name} - Live Viewing
            </Typography>
            <Box display="flex" gap={2} alignItems="center">
              <Chip
                icon={<Visibility />}
                label={`Viewing as: ${viewerName}`}
                color="primary"
              />
              <Chip
                label={auction.status}
                color={auction.status === 'active' ? 'success' : 'default'}
              />
            </Box>
          </Box>
        </Paper>

        <Grid container spacing={3}>
          {/* Main Auction Area */}
          <Grid item xs={12} md={8}>
            {/* Current Player */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                {currentPlayer ? (
                  <>
                    <Typography variant="h6" gutterBottom>
                      Current Player
                    </Typography>
                    <Box display="flex" alignItems="center" gap={3}>
                      <Avatar sx={{ width: 80, height: 80 }}>
                        {currentPlayer.name.charAt(0)}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="h4">{currentPlayer.name}</Typography>
                        <Box display="flex" gap={1} mt={1}>
                          {currentPlayer.role?.map((role: string) => (
                            <Chip key={role} label={role} size="small" />
                          ))}
                        </Box>
                        <Typography variant="body2" color="textSecondary" mt={1}>
                          Base Price: ₹{currentPlayer.basePrice?.toLocaleString() || '0'}
                        </Typography>
                      </Box>
                      {isAuctionActive && (
                        <Box textAlign="center">
                          <Timer sx={{ fontSize: 40, color: 'primary.main' }} />
                          <Typography variant="h4" color="primary">
                            {auction.timer.seconds}s
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </>
                ) : (
                  <Typography variant="body1" color="textSecondary">
                    No player currently being auctioned
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Current Bid */}
            {highestBid && (
              <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="overline" sx={{ opacity: 0.8 }}>
                        Highest Bid
                      </Typography>
                      <Typography variant="h3">
                        ₹{highestBid.amount.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="h6">
                        {highestBid.teamId.name}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        by {highestBid.bidderId.username}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Recent Bids */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent Bids
              </Typography>
              <List>
                {currentBids.length > 0 ? (
                  currentBids.map((bid, index) => (
                    <ListItem key={bid._id} divider={index < currentBids.length - 1}>
                      <ListItemAvatar>
                        <Avatar>
                          <AttachMoney />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`₹${bid.amount.toLocaleString()}`}
                        secondary={`${bid.teamId.name} - ${bid.bidderId.username}`}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {new Date(bid.timestamp).toLocaleTimeString()}
                      </Typography>
                    </ListItem>
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No bids yet
                  </Typography>
                )}
              </List>
            </Paper>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Auction Stats */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Auction Progress
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography color="textSecondary">Players Sold</Typography>
                    <Typography fontWeight="medium">
                      {auction.soldPlayers?.length || 0}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography color="textSecondary">Players Remaining</Typography>
                    <Typography fontWeight="medium">
                      {auction.players?.length || 0}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography color="textSecondary">Unsold</Typography>
                    <Typography fontWeight="medium">
                      {auction.unsoldPlayers?.length || 0}
                    </Typography>
                  </Box>
                  <Divider />
                  <LinearProgress
                    variant="determinate"
                    value={
                      ((auction.soldPlayers?.length || 0) /
                        ((auction.players?.length || 0) + (auction.soldPlayers?.length || 0) + (auction.unsoldPlayers?.length || 0))) *
                      100
                    }
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Chat */}
            <Paper sx={{ height: 400, display: 'flex', flexDirection: 'column' }}>
              <Box p={2} borderBottom={1} borderColor="divider">
                <Typography variant="h6">Live Chat</Typography>
              </Box>
              <Box
                ref={chatContainerRef}
                sx={{ flex: 1, overflowY: 'auto', p: 2 }}
              >
                {chatMessages.map((msg) => (
                  <Box
                    key={msg.id}
                    sx={{
                      mb: 1,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: msg.type === 'system' ? 'action.hover' : 'background.default'
                    }}
                  >
                    <Typography variant="subtitle2" color="primary">
                      {msg.username}
                    </Typography>
                    <Typography variant="body2">{msg.message}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {msg.timestamp.toLocaleTimeString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Box p={2} borderTop={1} borderColor="divider">
                <Box display="flex" gap={1}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <IconButton onClick={sendMessage} disabled={!message.trim()}>
                    <Send />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </ViewerProvider>
  );
};

export default ViewerAuctionPage;
