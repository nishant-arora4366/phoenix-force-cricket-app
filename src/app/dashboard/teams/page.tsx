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
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Group,
  AttachMoney,
  Person,
  Add,
  EmojiEvents,
  Search,
  Visibility,
  Edit,
  Delete
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface Team {
  _id: string;
  name: string;
  tournamentId: {
    _id: string;
    name: string;
    format: string;
  };
  captainId: {
    _id: string;
    username: string;
    profile: any;
  };
  managerId?: {
    _id: string;
    username: string;
    profile: any;
  };
  players: {
    playerId: {
      _id: string;
      name: string;
      role: string[];
      basePrice: number;
    };
    amount: number;
    purchasedAt: string;
    role: string;
  }[];
  tokens: number;
  totalSpent: number;
  settings: {
    maxPlayers: number;
    minPlayers: number;
  };
  playerCount?: number;
  availableBudget?: number;
}

export default function TeamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tournamentFilter, setTournamentFilter] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [tournaments, setTournaments] = useState<any[]>([]);

  const isAdmin = user?.role === 'admin';
  const isAuctioneer = user?.role === 'auctioneer';
  const isCaptain = user?.role === 'captain';
  const canCreateTeam = isAdmin || isAuctioneer || isCaptain;
  const canViewAllTeams = isAdmin || isAuctioneer;

  useEffect(() => {
    fetchTeams();
    fetchTournaments();
  }, [tournamentFilter]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      let url = '/api/teams?';
      
      if (!canViewAllTeams) {
        url += 'myTeam=true&';
      }
      
      if (tournamentFilter) {
        url += `tournamentId=${tournamentFilter}`;
      }

      const response = await axios.get(url);
      setTeams(response.data.teams);
    } catch (err: any) {
      setError('Failed to fetch teams');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const response = await axios.get('/api/tournaments');
      setTournaments(response.data.tournaments);
    } catch (err) {
      console.error('Failed to fetch tournaments', err);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this team?')) {
      return;
    }

    try {
      await axios.delete(`/api/teams/${teamId}`);
      await fetchTeams();
    } catch (err) {
      alert('Failed to delete team');
    }
  };

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.tournamentId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.captainId.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTeamStrength = (team: Team) => {
    const playerCount = team.players.length;
    const minPlayers = team.settings.minPlayers;
    const maxPlayers = team.settings.maxPlayers;
    
    if (playerCount >= minPlayers && playerCount <= maxPlayers) {
      return { label: 'Complete', color: 'success' };
    } else if (playerCount < minPlayers) {
      return { label: `Need ${minPlayers - playerCount} more`, color: 'warning' };
    } else {
      return { label: 'Overfilled', color: 'error' };
    }
  };

  const getRoleCount = (players: any[], role: string) => {
    return players.filter(p => p.playerId.role.includes(role)).length;
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
        <Typography variant="h4">Teams</Typography>
        {canCreateTeam && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => router.push('/dashboard/teams/create')}
          >
            Create Team
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              placeholder="Search teams..."
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
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Tournament</InputLabel>
              <Select
                value={tournamentFilter}
                label="Tournament"
                onChange={(e) => setTournamentFilter(e.target.value)}
              >
                <MenuItem value="">All Tournaments</MenuItem>
                {tournaments.map((tournament) => (
                  <MenuItem key={tournament._id} value={tournament._id}>
                    {tournament.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Teams Grid */}
      <Grid container spacing={3}>
        {filteredTeams.map((team) => {
          const teamStrength = getTeamStrength(team);
          const budgetUsed = (team.totalSpent / team.tokens) * 100;
          
          return (
            <Grid item xs={12} md={6} lg={4} key={team._id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {team.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {team.tournamentId.name}
                      </Typography>
                    </Box>
                    <Chip
                      label={teamStrength.label}
                      color={teamStrength.color as any}
                      size="small"
                    />
                  </Box>

                  {/* Captain Info */}
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      <Person fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        Captain: {team.captainId.username}
                      </Typography>
                      {team.managerId && (
                        <Typography variant="caption" color="textSecondary">
                          Manager: {team.managerId.username}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Budget Progress */}
                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Budget Used</Typography>
                      <Typography variant="body2">
                        ₹{team.totalSpent}L / ₹{team.tokens}L
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={budgetUsed}
                      color={budgetUsed > 90 ? 'error' : budgetUsed > 70 ? 'warning' : 'primary'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>

                  {/* Player Composition */}
                  <Grid container spacing={1} mb={2}>
                    <Grid item xs={4}>
                      <Box textAlign="center" p={1} bgcolor="grey.100" borderRadius={1}>
                        <Typography variant="h6">{team.players.length}</Typography>
                        <Typography variant="caption">Total</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box textAlign="center" p={1} bgcolor="grey.100" borderRadius={1}>
                        <Typography variant="h6">{getRoleCount(team.players, 'batsman')}</Typography>
                        <Typography variant="caption">Batsmen</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box textAlign="center" p={1} bgcolor="grey.100" borderRadius={1}>
                        <Typography variant="h6">{getRoleCount(team.players, 'bowler')}</Typography>
                        <Typography variant="caption">Bowlers</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => {
                        setSelectedTeam(team);
                        setOpenDialog(true);
                      }}
                      fullWidth
                    >
                      View Details
                    </Button>
                    {(isAdmin || isAuctioneer || team.captainId._id === user?.id) && (
                      <IconButton
                        size="small"
                        onClick={() => router.push(`/dashboard/teams/${team._id}/edit`)}
                      >
                        <Edit />
                      </IconButton>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Team Details Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{selectedTeam?.name}</Typography>
            <Chip
              label={`${selectedTeam?.players.length} / ${selectedTeam?.settings.maxPlayers} Players`}
              color="primary"
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTeam && (
            <Box>
              <Box mb={3}>
                <Typography variant="subtitle1" gutterBottom>Team Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Tournament</Typography>
                    <Typography>{selectedTeam.tournamentId.name}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Captain</Typography>
                    <Typography>{selectedTeam.captainId.username}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Budget</Typography>
                    <Typography>₹{selectedTeam.availableBudget}L available</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Total Spent</Typography>
                    <Typography>₹{selectedTeam.totalSpent}L</Typography>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>Players</Typography>
              <List>
                {selectedTeam.players.map((player, index) => (
                  <ListItem key={index}>
                    <ListItemAvatar>
                      <Avatar>{player.playerId.name.charAt(0)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={player.playerId.name}
                      secondary={
                        <Box display="flex" gap={1} alignItems="center">
                          {player.playerId.role.map((role) => (
                            <Chip key={role} label={role} size="small" />
                          ))}
                          <Typography variant="body2" color="primary">
                            • ₹{player.amount}L
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
