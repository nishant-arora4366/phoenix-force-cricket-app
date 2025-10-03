// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
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
  LinearProgress
} from '@mui/material';
import {
  Timer,
  Gavel,
  Send,
  PlayArrow,
  Pause,
  SkipNext,
  AttachMoney,
  Person,
  Group
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import axios from 'axios';

interface AuctionDetail {
  _id: string;
  name: string;
  status: string;
  currentPlayer?: any;
  players: any[];
  soldPlayers: any[];
  skippedPlayers: any[];
  unsoldPlayers: any[];
  timer: {
    duration: number;
    remaining: number;
    isActive: boolean;
  };
  settings: {
    minBid: number;
    minBidIncrement: number;
    timerDuration: number;
  };
  statistics: {
    totalSold: number;
    totalUnsold: number;
    totalRevenue: number;
  };
  tournamentId: any;
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

export default function AuctionPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { socket, joinAuction, leaveAuction, sendMessage, emitBidUpdate } = useSocket();
  
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentBids, setCurrentBids] = useState<Bid[]>([]);
  const [highestBid, setHighestBid] = useState<number>(0);
  const [timer, setTimer] = useState<number>(30);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [myTeam, setMyTeam] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const auctionId = params.id as string;
  const isAuctioneer = user?.role === 'admin' || user?.role === 'auctioneer';
  const canBid = user?.role === 'captain' || user?.role === 'manager' || isAuctioneer;

  useEffect(() => {
    if (auctionId) {
      fetchAuctionDetails();
      fetchMyTeam();
      fetchChatMessages();
      joinAuction(auctionId);
    }

    return () => {
      if (auctionId) {
        leaveAuction(auctionId);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [auctionId]);

  useEffect(() => {
    if (!socket) return;

    // Socket event listeners
    socket.on('bid_update', handleBidUpdate);
    socket.on('auction_status_changed', handleStatusChange);
    socket.on('current_player_changed', handlePlayerChange);
    socket.on('timer_tick', handleTimerTick);
    socket.on('player_sold_update', handlePlayerSold);
    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('bid_update');
      socket.off('auction_status_changed');
      socket.off('current_player_changed');
      socket.off('timer_tick');
      socket.off('player_sold_update');
      socket.off('new_message');
    };
  }, [socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchAuctionDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/auctions/${auctionId}`);
      setAuction(response.data.auction);
      
      if (response.data.auction.currentPlayer) {
        fetchCurrentBids();
      }
    } catch (err) {
      setError('Failed to fetch auction details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTeam = async () => {
    if (!canBid) return;
    
    try {
      const response = await axios.get('/api/teams?myTeam=true');
      if (response.data.teams.length > 0) {
        setMyTeam(response.data.teams[0]);
      }
    } catch (err) {
      console.error('Failed to fetch team', err);
    }
  };

  const fetchCurrentBids = async () => {
    if (!auction?.currentPlayer) return;
    
    try {
      const response = await axios.get(`/api/bids?auctionId=${auctionId}&playerId=${auction.currentPlayer._id}`);
      setCurrentBids(response.data.bids);
      
      if (response.data.bids.length > 0) {
        setHighestBid(response.data.bids[0].amount);
        setBidAmount(response.data.bids[0].amount + auction.settings.minBidIncrement);
      } else {
        setHighestBid(0);
        setBidAmount(auction.settings.minBid);
      }
    } catch (err) {
      console.error('Failed to fetch bids', err);
    }
  };

  const fetchChatMessages = async () => {
    try {
      const response = await axios.get(`/api/chat?auctionId=${auctionId}`);
      setMessages(response.data.messages);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const handleBidUpdate = (bid: any) => {
    setCurrentBids(prev => [bid, ...prev]);
    setHighestBid(bid.amount);
    setBidAmount(bid.amount + (auction?.settings.minBidIncrement || 20));
  };

  const handleStatusChange = (data: any) => {
    if (auction) {
      setAuction({ ...auction, status: data.status });
    }
  };

  const handlePlayerChange = (data: any) => {
    if (auction) {
      setAuction({ ...auction, currentPlayer: data.player });
      setCurrentBids([]);
      setHighestBid(0);
      setBidAmount(auction.settings.minBid);
    }
  };

  const handleTimerTick = (data: any) => {
    setTimer(data.remaining);
  };

  const handlePlayerSold = (data: any) => {
    fetchAuctionDetails();
    addSystemMessage(`${data.player.name} sold to ${data.team.name} for ₹${data.amount}L`);
  };

  const handleNewMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const addSystemMessage = (text: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      username: 'System',
      message: text,
      type: 'system',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const placeBid = async () => {
    if (!myTeam || !auction?.currentPlayer) return;

    try {
      const response = await axios.post('/api/bids', {
        auctionId,
        playerId: auction.currentPlayer._id,
        teamId: myTeam._id,
        amount: bidAmount
      });

      if (response.data.success) {
        emitBidUpdate(auctionId, response.data.bid);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to place bid');
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    try {
      await axios.post('/api/chat', {
        auctionId,
        message: chatInput
      });
      
      sendMessage(auctionId, chatInput);
      setChatInput('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startAuction = async () => {
    try {
      await axios.put(`/api/auctions/${auctionId}/start`);
      fetchAuctionDetails();
    } catch (err) {
      alert('Failed to start auction');
    }
  };

  const pauseAuction = async () => {
    try {
      await axios.put(`/api/auctions/${auctionId}/pause`);
      fetchAuctionDetails();
    } catch (err) {
      alert('Failed to pause auction');
    }
  };

  const nextPlayer = async () => {
    try {
      await axios.put(`/api/auctions/${auctionId}/next-player`);
      fetchAuctionDetails();
    } catch (err) {
      alert('Failed to move to next player');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !auction) {
    return <Alert severity="error">{error || 'Auction not found'}</Alert>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">{auction.name}</Typography>
          <Typography variant="body2" color="textSecondary">
            {auction.tournamentId?.name} • Status: {auction.status}
          </Typography>
        </Box>
        
        {isAuctioneer && (
          <Box display="flex" gap={1}>
            {auction.status === 'pending' && (
              <Button variant="contained" startIcon={<PlayArrow />} onClick={startAuction}>
                Start Auction
              </Button>
            )}
            {auction.status === 'active' && (
              <>
                <Button variant="outlined" startIcon={<Pause />} onClick={pauseAuction}>
                  Pause
                </Button>
                <Button variant="contained" startIcon={<SkipNext />} onClick={nextPlayer}>
                  Next Player
                </Button>
              </>
            )}
          </Box>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Current Player */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            {auction.currentPlayer ? (
              <Box>
                <Typography variant="h5" gutterBottom>Current Player</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ width: 80, height: 80 }}>
                        {auction.currentPlayer.name.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{auction.currentPlayer.name}</Typography>
                        <Box>
                          {auction.currentPlayer.role.map((role: string) => (
                            <Chip key={role} label={role} size="small" sx={{ mr: 0.5 }} />
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Base Price</Typography>
                      <Typography variant="h6">₹{auction.currentPlayer.basePrice || 40}L</Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                {/* Timer */}
                <Box sx={{ mt: 3 }}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Timer</Typography>
                    <Typography variant="body2">{timer}s</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(timer / auction.settings.timerDuration) * 100}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Box>
            ) : (
              <Typography color="textSecondary">No player currently up for auction</Typography>
            )}
          </Paper>

          {/* Bid Section */}
          {auction.currentPlayer && canBid && myTeam && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Place Bid</Typography>
              <Box display="flex" gap={2} alignItems="center">
                <TextField
                  type="number"
                  label="Bid Amount (Lakhs)"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  InputProps={{
                    startAdornment: '₹',
                    endAdornment: 'L'
                  }}
                />
                <Button 
                  variant="contained" 
                  onClick={placeBid}
                  disabled={auction.status !== 'active' || bidAmount <= highestBid}
                >
                  Place Bid
                </Button>
                <Typography variant="body2" color="textSecondary">
                  Available: ₹{myTeam.availableBudget}L
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Current Bids */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Current Bids</Typography>
            {currentBids.length > 0 ? (
              <List>
                {currentBids.slice(0, 5).map((bid, index) => (
                  <ListItem key={bid._id} sx={{ 
                    bgcolor: index === 0 ? 'primary.light' : 'transparent',
                    borderRadius: 1,
                    mb: 1
                  }}>
                    <ListItemAvatar>
                      <Avatar>
                        <AttachMoney />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`₹${bid.amount}L by ${bid.teamId.name}`}
                      secondary={`${bid.bidderId.username} • ${new Date(bid.timestamp).toLocaleTimeString()}`}
                      primaryTypographyProps={{
                        color: index === 0 ? 'primary.contrastText' : 'textPrimary'
                      }}
                      secondaryTypographyProps={{
                        color: index === 0 ? 'primary.contrastText' : 'textSecondary'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="textSecondary">No bids yet</Typography>
            )}
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Auction Stats */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Auction Statistics</Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Total Players</Typography>
                  <Typography>{auction.players.length}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Sold</Typography>
                  <Typography color="success.main">{auction.statistics.totalSold}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Unsold</Typography>
                  <Typography color="error.main">{auction.statistics.totalUnsold}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Total Revenue</Typography>
                  <Typography variant="h6" color="primary">
                    ₹{auction.statistics.totalRevenue}L
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Chat */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Auction Chat</Typography>
              <Box
                sx={{
                  height: 300,
                  overflowY: 'auto',
                  mb: 2,
                  p: 1,
                  bgcolor: 'grey.50',
                  borderRadius: 1
                }}
              >
                {messages.map((msg) => (
                  <Box
                    key={msg.id}
                    sx={{
                      mb: 1,
                      p: 1,
                      bgcolor: msg.type === 'system' ? 'info.light' : 'background.paper',
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {msg.username}
                    </Typography>
                    <Typography variant="body2">{msg.message}</Typography>
                  </Box>
                ))}
                <div ref={chatEndRef} />
              </Box>
              
              <Box display="flex" gap={1}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                />
                <IconButton onClick={sendChatMessage} color="primary">
                  <Send />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
