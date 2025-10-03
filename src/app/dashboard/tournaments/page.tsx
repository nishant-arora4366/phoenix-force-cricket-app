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
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Menu
} from '@mui/material';
import {
  EmojiEvents,
  Add,
  CalendarToday,
  Group,
  AttachMoney,
  Timer,
  Search,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  PlayArrow
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface Tournament {
  _id: string;
  name: string;
  description: string;
  date: string;
  format: string;
  teams: any[];
  captains: any[];
  settings: {
    totalTokens: number;
    minBid: number;
    bidIncrement: number;
    timerDuration: number;
    maxPlayersPerTeam: number;
    minPlayersPerTeam: number;
  };
  status: string;
  createdBy: {
    username: string;
  };
  createdAt: string;
}

export default function TournamentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isAdmin = user?.role === 'admin';
  const isAuctioneer = user?.role === 'auctioneer';
  const canManageTournaments = isAdmin || isAuctioneer;

  useEffect(() => {
    fetchTournaments();
  }, [statusFilter, formatFilter]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      let url = '/api/tournaments?';
      
      if (statusFilter) {
        url += `status=${statusFilter}&`;
      }
      if (formatFilter) {
        url += `format=${formatFilter}&`;
      }

      const response = await axios.get(url);
      setTournaments(response.data.tournaments);
    } catch (err: any) {
      setError('Failed to fetch tournaments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!window.confirm('Are you sure you want to cancel this tournament?')) {
      return;
    }

    try {
      await axios.delete(`/api/tournaments/${tournamentId}`);
      await fetchTournaments();
    } catch (err) {
      alert('Failed to cancel tournament');
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, tournament: Tournament) => {
    setAnchorEl(event.currentTarget);
    setSelectedTournament(tournament);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const filteredTournaments = tournaments.filter(tournament =>
    tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tournament.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'default';
      case 'completed':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFormatDetails = (format: string) => {
    const details: { [key: string]: { teams: number; color: string } } = {
      'Bilateral': { teams: 2, color: '#1976d2' },
      'Tri-Series': { teams: 3, color: '#388e3c' },
      'Quad Series': { teams: 4, color: '#f57c00' },
      'Mega Auction - Six Teams': { teams: 6, color: '#d32f2f' },
      'Mega Auction - Eight Teams': { teams: 8, color: '#7b1fa2' }
    };
    return details[format] || { teams: 0, color: '#666' };
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
        <Typography variant="h4">Tournaments</Typography>
        {canManageTournaments && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/dashboard/tournaments/create')}
          >
            Create Tournament
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Search tournaments..."
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
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Format</InputLabel>
              <Select
                value={formatFilter}
                label="Format"
                onChange={(e) => setFormatFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="Bilateral">Bilateral</MenuItem>
                <MenuItem value="Tri-Series">Tri-Series</MenuItem>
                <MenuItem value="Quad Series">Quad Series</MenuItem>
                <MenuItem value="Mega Auction - Six Teams">Mega Auction - Six Teams</MenuItem>
                <MenuItem value="Mega Auction - Eight Teams">Mega Auction - Eight Teams</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tournaments Grid */}
      <Grid container spacing={3}>
        {filteredTournaments.map((tournament) => {
          const formatDetails = getFormatDetails(tournament.format);
          const isUpcoming = new Date(tournament.date) > new Date() && tournament.status === 'active';
          
          return (
            <Grid item xs={12} md={6} key={tournament._id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom>
                        {tournament.name}
                      </Typography>
                      {tournament.description && (
                        <Typography variant="body2" color="textSecondary" mb={1}>
                          {tournament.description}
                        </Typography>
                      )}
                    </Box>
                    <Box display="flex" gap={1} alignItems="center">
                      <Chip
                        label={tournament.status}
                        color={getStatusColor(tournament.status) as any}
                        size="small"
                      />
                      {canManageTournaments && (
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, tournament)}
                        >
                          <MoreVert />
                        </IconButton>
                      )}
                    </Box>
                  </Box>

                  {/* Tournament Info */}
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <CalendarToday fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={formatDate(tournament.date)}
                        secondary={isUpcoming ? 'Upcoming' : 'Past'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <EmojiEvents fontSize="small" style={{ color: formatDetails.color }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={tournament.format}
                        secondary={`${tournament.teams.length}/${formatDetails.teams} teams registered`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <AttachMoney fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`₹${tournament.settings.totalTokens}L per team`}
                        secondary={`Min bid: ₹${tournament.settings.minBid}L`}
                      />
                    </ListItem>
                  </List>

                  {/* Teams Progress */}
                  <Box mt={2} mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Teams Registered</Typography>
                      <Typography variant="body2">
                        {tournament.teams.length} / {formatDetails.teams}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 8,
                        bgcolor: 'grey.300',
                        borderRadius: 4,
                        overflow: 'hidden'
                      }}
                    >
                      <Box
                        sx={{
                          width: `${(tournament.teams.length / formatDetails.teams) * 100}%`,
                          height: '100%',
                          bgcolor: formatDetails.color,
                          transition: 'width 0.3s'
                        }}
                      />
                    </Box>
                  </Box>

                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => {
                        setSelectedTournament(tournament);
                        setOpenDialog(true);
                      }}
                      fullWidth
                    >
                      View Details
                    </Button>
                    {tournament.status === 'active' && tournament.teams.length >= 2 && (
                      <Button
                        size="small"
                        color="primary"
                        startIcon={<PlayArrow />}
                        onClick={() => router.push('/dashboard/auctions/create')}
                      >
                        Start Auction
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          router.push(`/dashboard/tournaments/${selectedTournament?._id}/edit`);
          handleMenuClose();
        }}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          setOpenDialog(true);
          handleMenuClose();
        }}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem 
          onClick={() => {
            if (selectedTournament) {
              handleDeleteTournament(selectedTournament._id);
            }
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Cancel Tournament
        </MenuItem>
      </Menu>

      {/* Tournament Details Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Tournament Details</DialogTitle>
        <DialogContent>
          {selectedTournament && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedTournament.name}
              </Typography>
              
              {selectedTournament.description && (
                <Typography variant="body2" color="textSecondary" mb={2}>
                  {selectedTournament.description}
                </Typography>
              )}

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Date</Typography>
                  <Typography>{formatDate(selectedTournament.date)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Format</Typography>
                  <Typography>{selectedTournament.format}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Chip 
                    label={selectedTournament.status} 
                    color={getStatusColor(selectedTournament.status) as any}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Created By</Typography>
                  <Typography>{selectedTournament.createdBy.username}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>Settings</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">Total Tokens</Typography>
                  <Typography>₹{selectedTournament.settings.totalTokens}L</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">Min Bid</Typography>
                  <Typography>₹{selectedTournament.settings.minBid}L</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">Bid Increment</Typography>
                  <Typography>₹{selectedTournament.settings.bidIncrement}L</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">Timer Duration</Typography>
                  <Typography>{selectedTournament.settings.timerDuration}s</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">Max Players/Team</Typography>
                  <Typography>{selectedTournament.settings.maxPlayersPerTeam}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="subtitle2" color="textSecondary">Min Players/Team</Typography>
                  <Typography>{selectedTournament.settings.minPlayersPerTeam}</Typography>
                </Grid>
              </Grid>

              {selectedTournament.teams.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" gutterBottom>Registered Teams</Typography>
                  <List>
                    {selectedTournament.teams.map((team: any) => (
                      <ListItem key={team._id}>
                        <ListItemIcon>
                          <Group />
                        </ListItemIcon>
                        <ListItemText primary={team.name} />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
          {canManageTournaments && (
            <Button 
              variant="contained"
              onClick={() => router.push(`/dashboard/tournaments/${selectedTournament?._id}/edit`)}
            >
              Edit Tournament
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
