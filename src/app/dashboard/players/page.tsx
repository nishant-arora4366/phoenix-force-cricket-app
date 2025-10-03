// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import {
  Search,
  Add,
  Edit,
  Delete,
  FilterList,
  ViewList,
  ViewModule
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface Player {
  _id: string;
  name: string;
  role: string[];
  battingStyle?: string;
  bowlingStyle?: string;
  basePrice?: number;
  battingRating?: number;
  bowlingRating?: number;
  playerGroup?: string[];
  isActive: boolean;
  profilePicUrl?: string;
}

export default function PlayersPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isAuctioneer = user?.role === 'auctioneer';
  const canEdit = isAdmin || isAuctioneer;

  useEffect(() => {
    fetchPlayers();
  }, [roleFilter, groupFilter]);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      let url = '/api/players?isActive=true';
      
      if (roleFilter) {
        url += `&role=${roleFilter}`;
      }
      if (groupFilter) {
        url += `&group=${groupFilter}`;
      }

      const response = await axios.get(url);
      setPlayers(response.data.players);
    } catch (err: any) {
      setError('Failed to fetch players');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this player?')) {
      return;
    }

    try {
      await axios.delete(`/api/players/${playerId}`);
      await fetchPlayers();
    } catch (err) {
      alert('Failed to delete player');
    }
  };

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', width: 200 },
    {
      field: 'role',
      headerName: 'Role',
      width: 150,
      renderCell: (params) => (
        <Box>
          {params.value.map((role: string) => (
            <Chip key={role} label={role} size="small" sx={{ mr: 0.5 }} />
          ))}
        </Box>
      )
    },
    { field: 'battingStyle', headerName: 'Batting Style', width: 130 },
    { field: 'bowlingStyle', headerName: 'Bowling Style', width: 130 },
    { 
      field: 'basePrice', 
      headerName: 'Base Price', 
      width: 120,
      valueFormatter: (params) => params.value ? `₹${params.value}L` : '-'
    },
    {
      field: 'battingRating',
      headerName: 'Batting',
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value || '-'} 
          size="small"
          color={params.value >= 8 ? 'success' : params.value >= 6 ? 'primary' : 'default'}
        />
      )
    },
    {
      field: 'bowlingRating',
      headerName: 'Bowling',
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value || '-'} 
          size="small"
          color={params.value >= 8 ? 'success' : params.value >= 6 ? 'primary' : 'default'}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) => (
        <Box>
          <IconButton 
            size="small" 
            onClick={() => {
              setSelectedPlayer(params.row);
              setOpenDialog(true);
            }}
          >
            <Edit fontSize="small" />
          </IconButton>
          {canEdit && (
            <IconButton 
              size="small" 
              onClick={() => handleDeletePlayer(params.row._id)}
              color="error"
            >
              <Delete fontSize="small" />
            </IconButton>
          )}
        </Box>
      )
    }
  ];

  const PlayerCard = ({ player }: { player: Player }) => (
    <Card>
      <CardMedia
        component="img"
        height="140"
        image={player.profilePicUrl || '/api/placeholder/400/300'}
        alt={player.name}
      />
      <CardContent>
        <Typography gutterBottom variant="h6" component="div">
          {player.name}
        </Typography>
        <Box mb={1}>
          {player.role.map((role) => (
            <Chip key={role} label={role} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary">
          Batting: {player.battingStyle || 'N/A'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Bowling: {player.bowlingStyle || 'N/A'}
        </Typography>
        <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
          Base Price: {player.basePrice ? `₹${player.basePrice}L` : 'N/A'}
        </Typography>
      </CardContent>
    </Card>
  );

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
        <Typography variant="h4">Players</Typography>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => window.location.href = '/dashboard/players/create'}
          >
            Add Player
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Search players..."
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
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={roleFilter}
                label="Role"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="batsman">Batsman</MenuItem>
                <MenuItem value="bowler">Bowler</MenuItem>
                <MenuItem value="wicket-keeper">Wicket Keeper</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Group</InputLabel>
              <Select
                value={groupFilter}
                label="Group"
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="A">Group A</MenuItem>
                <MenuItem value="B">Group B</MenuItem>
                <MenuItem value="C">Group C</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <Box display="flex" gap={1}>
              <IconButton
                onClick={() => setViewMode('list')}
                color={viewMode === 'list' ? 'primary' : 'default'}
              >
                <ViewList />
              </IconButton>
              <IconButton
                onClick={() => setViewMode('grid')}
                color={viewMode === 'grid' ? 'primary' : 'default'}
              >
                <ViewModule />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Players Display */}
      {viewMode === 'list' ? (
        <Paper sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredPlayers}
            columns={columns}
            getRowId={(row) => row._id}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10 },
              },
            }}
          />
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredPlayers.map((player) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={player._id}>
              <PlayerCard player={player} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Player Details Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Player Details</DialogTitle>
        <DialogContent>
          {selectedPlayer && (
            <Box>
              <Typography variant="h6">{selectedPlayer.name}</Typography>
              <Box mt={2}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Roles</Typography>
                    <Box>
                      {selectedPlayer.role.map((role) => (
                        <Chip key={role} label={role} size="small" sx={{ mr: 0.5 }} />
                      ))}
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Base Price</Typography>
                    <Typography>
                      {selectedPlayer.basePrice ? `₹${selectedPlayer.basePrice}L` : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Batting Style</Typography>
                    <Typography>{selectedPlayer.battingStyle || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Bowling Style</Typography>
                    <Typography>{selectedPlayer.bowlingStyle || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Batting Rating</Typography>
                    <Typography>{selectedPlayer.battingRating || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">Bowling Rating</Typography>
                    <Typography>{selectedPlayer.bowlingRating || 'N/A'}</Typography>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Close</Button>
          {canEdit && (
            <Button 
              variant="contained"
              onClick={() => window.location.href = `/dashboard/players/${selectedPlayer?._id}/edit`}
            >
              Edit
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
