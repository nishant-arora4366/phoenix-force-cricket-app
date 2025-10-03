// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  Add,
  MoreVert,
  Search,
  PlayArrow,
  Pause,
  Stop,
  Visibility,
  Edit,
  Delete,
  People,
  AttachMoney,
  Timer
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface Auction {
  _id: string;
  name: string;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
  tournamentId: {
    _id: string;
    name: string;
    format: string;
  };
  players: any[];
  soldPlayers: any[];
  currentPlayer?: any;
  settings: {
    minBid: number;
    minBidIncrement: number;
    timerDuration: number;
  };
  statistics: {
    totalSold: number;
    totalUnsold: number;
    totalRevenue: number;
    avgSalePrice: number;
  };
  createdBy: {
    username: string;
  };
  createdAt: string;
}

export default function AuctionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tournamentFilter, setTournamentFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);

  const isAdmin = user?.role === 'admin';
  const isAuctioneer = user?.role === 'auctioneer';
  const canManageAuctions = isAdmin || isAuctioneer;

  useEffect(() => {
    fetchAuctions();
  }, [statusFilter, tournamentFilter]);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      let url = '/api/auctions?';
      
      if (statusFilter) {
        url += `status=${statusFilter}&`;
      }
      if (tournamentFilter) {
        url += `tournamentId=${tournamentFilter}&`;
      }

      const response = await axios.get(url);
      setAuctions(response.data.auctions);
    } catch (err: any) {
      setError('Failed to fetch auctions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, auction: Auction) => {
    setAnchorEl(event.currentTarget);
    setSelectedAuction(auction);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAuction(null);
  };

  const handleStartAuction = async (auctionId: string) => {
    try {
      await axios.put(`/api/auctions/${auctionId}/start`);
      await fetchAuctions();
      router.push(`/dashboard/auction/${auctionId}`);
    } catch (err) {
      alert('Failed to start auction');
    }
  };

  const handlePauseAuction = async (auctionId: string) => {
    try {
      await axios.put(`/api/auctions/${auctionId}/pause`);
      await fetchAuctions();
    } catch (err) {
      alert('Failed to pause auction');
    }
  };

  const handleDeleteAuction = async (auctionId: string) => {
    if (!window.confirm('Are you sure you want to cancel this auction?')) {
      return;
    }

    try {
      await axios.delete(`/api/auctions/${auctionId}`);
      await fetchAuctions();
    } catch (err) {
      alert('Failed to cancel auction');
    }
  };

  const filteredAuctions = auctions.filter(auction =>
    auction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    auction.tournamentId.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <PlayArrow />;
      case 'paused':
        return <Pause />;
      case 'completed':
        return <Stop />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Auctions</Typography>
        {canManageAuctions && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/dashboard/auctions/create')}
          >
            Create Auction
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Search auctions..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="paused">Paused</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button 
              variant="outlined"
              onClick={() => setStatusFilter('active')}
              fullWidth
            >
              Show Active Only
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Auctions Grid */}
      <Grid container spacing={3}>
        {filteredAuctions.map((auction) => (
          <Grid item xs={12} md={6} lg={4} key={auction._id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {auction.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {auction.tournamentId.name}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1} alignItems="center">
                    <Chip
                      label={auction.status}
                      color={getStatusColor(auction.status)}
                      size="small"
                      icon={getStatusIcon(auction.status) || undefined}
                    />
                    {canManageAuctions && (
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, auction)}
                      >
                        <MoreVert />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <People fontSize="small" color="action" />
                      <Typography variant="body2">
                        {auction.players.length} Players
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <AttachMoney fontSize="small" color="action" />
                      <Typography variant="body2">
                        Min Bid: ₹{auction.settings.minBid}L
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Timer fontSize="small" color="action" />
                      <Typography variant="body2">
                        Timer: {auction.settings.timerDuration}s
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      Sold: {auction.statistics.totalSold}/{auction.players.length}
                    </Typography>
                  </Grid>
                </Grid>

                {auction.statistics.totalRevenue > 0 && (
                  <Box sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
                    <Typography variant="body2" color="primary">
                      Total Revenue: ₹{auction.statistics.totalRevenue}L
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Avg Price: ₹{auction.statistics.avgSalePrice.toFixed(1)}L
                    </Typography>
                  </Box>
                )}

                <Typography variant="caption" color="textSecondary">
                  Created by {auction.createdBy.username} • {new Date(auction.createdAt).toLocaleDateString()}
                </Typography>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() => router.push(`/dashboard/auction/${auction._id}`)}
                >
                  View
                </Button>
                {auction.status === 'pending' && canManageAuctions && (
                  <Button
                    size="small"
                    color="primary"
                    startIcon={<PlayArrow />}
                    onClick={() => handleStartAuction(auction._id)}
                  >
                    Start
                  </Button>
                )}
                {auction.status === 'active' && canManageAuctions && (
                  <Button
                    size="small"
                    color="warning"
                    startIcon={<Pause />}
                    onClick={() => handlePauseAuction(auction._id)}
                  >
                    Pause
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          router.push(`/dashboard/auctions/${selectedAuction?._id}/edit`);
          handleMenuClose();
        }}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          router.push(`/dashboard/auction/${selectedAuction?._id}`);
          handleMenuClose();
        }}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem 
          onClick={() => {
            if (selectedAuction) {
              handleDeleteAuction(selectedAuction._id);
            }
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Cancel Auction
        </MenuItem>
      </Menu>
    </Box>
  );
}
