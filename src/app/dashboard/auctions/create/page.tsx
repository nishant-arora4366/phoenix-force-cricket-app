// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Chip,
  FormHelperText,
  Autocomplete,
  Checkbox,
  FormControlLabel,
  Card,
  CardContent
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Save,
  EmojiEvents,
  People,
  Gavel
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface Tournament {
  _id: string;
  name: string;
  status: string;
}

interface Player {
  _id: string;
  name: string;
  role: string[];
  battingStyle?: string;
  bowlingStyle?: string;
  basePrice?: number;
}

interface CreateAuctionForm {
  name: string;
  tournamentId: string;
  timerSeconds: number;
  minBidIncrement: number;
  selectedPlayerIds: string[];
  autoStart: boolean;
}

const CreateAuctionPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Data states
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<CreateAuctionForm>({
    name: '',
    tournamentId: '',
    timerSeconds: 30,
    minBidIncrement: 1000,
    selectedPlayerIds: [],
    autoStart: false
  });

  const steps = ['Basic Details', 'Select Players', 'Review & Create'];

  useEffect(() => {
    fetchTournaments();
    fetchPlayers();
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await axios.get('/api/tournaments');
      const activeTournaments = response.data.tournaments.filter(
        (t: Tournament) => t.status === 'active'
      );
      setTournaments(activeTournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setError('Failed to fetch tournaments');
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await axios.get('/api/players');
      setPlayers(response.data.players || []);
    } catch (error) {
      console.error('Error fetching players:', error);
      setError('Failed to fetch players');
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const validateStep = (step: number) => {
    setError('');
    
    switch (step) {
      case 0:
        if (!formData.name.trim()) {
          setError('Auction name is required');
          return false;
        }
        if (!formData.tournamentId) {
          setError('Tournament is required');
          return false;
        }
        return true;
      
      case 1:
        if (selectedPlayers.length === 0) {
          setError('Please select at least one player');
          return false;
        }
        return true;
      
      case 2:
        return true;
      
      default:
        return true;
    }
  };

  const handleCreateAuction = async () => {
    try {
      setLoading(true);
      setError('');
      
      const auctionData = {
        ...formData,
        selectedPlayerIds: selectedPlayers.map(p => p._id),
        status: formData.autoStart ? 'active' : 'pending'
      };
      
      const response = await axios.post('/api/auctions', auctionData);
      
      if (response.data.success) {
        setSuccess('Auction created successfully!');
        setTimeout(() => {
          router.push(`/dashboard/auction/${response.data.auction._id}`);
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error creating auction:', error);
      setError(error.response?.data?.message || 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerToggle = (player: Player) => {
    setSelectedPlayers(prev => {
      const exists = prev.find(p => p._id === player._id);
      if (exists) {
        return prev.filter(p => p._id !== player._id);
      } else {
        return [...prev, player];
      }
    });
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Auction Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  helperText="Give your auction a descriptive name"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Tournament</InputLabel>
                  <Select
                    value={formData.tournamentId}
                    onChange={(e) => setFormData({ ...formData, tournamentId: e.target.value })}
                    label="Tournament"
                  >
                    {tournaments.map(tournament => (
                      <MenuItem key={tournament._id} value={tournament._id}>
                        {tournament.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Select the tournament for this auction</FormHelperText>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Timer Duration (seconds)"
                  value={formData.timerSeconds}
                  onChange={(e) => setFormData({ ...formData, timerSeconds: parseInt(e.target.value) || 30 })}
                  inputProps={{ min: 10, max: 300 }}
                  helperText="Time allowed for each bid"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Bid Increment"
                  value={formData.minBidIncrement}
                  onChange={(e) => setFormData({ ...formData, minBidIncrement: parseInt(e.target.value) || 1000 })}
                  inputProps={{ min: 100, step: 100 }}
                  helperText="Minimum amount to increase bid"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.autoStart}
                      onChange={(e) => setFormData({ ...formData, autoStart: e.target.checked })}
                    />
                  }
                  label="Start auction immediately after creation"
                />
              </Grid>
            </Grid>
          </Box>
        );
      
      case 1:
        return (
          <Box>
            <Box mb={3}>
              <Typography variant="body1" gutterBottom>
                Selected Players: {selectedPlayers.length}
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setSelectedPlayers(players)}
                >
                  Select All
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setSelectedPlayers([])}
                >
                  Clear All
                </Button>
              </Box>
            </Box>
            
            <Grid container spacing={2}>
              {players.map(player => (
                <Grid item xs={12} sm={6} md={4} key={player._id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      bgcolor: selectedPlayers.find(p => p._id === player._id) ? 'primary.light' : 'background.paper',
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => handlePlayerToggle(player)}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start">
                        <Box>
                          <Typography variant="h6">
                            {player.name}
                          </Typography>
                          <Box display="flex" gap={0.5} flexWrap="wrap" mt={1}>
                            {player.role.map(role => (
                              <Chip key={role} label={role} size="small" />
                            ))}
                          </Box>
                          <Typography variant="body2" color="textSecondary" mt={1}>
                            Base Price: ₹{player.basePrice?.toLocaleString() || '0'}
                          </Typography>
                        </Box>
                        <Checkbox
                          checked={!!selectedPlayers.find(p => p._id === player._id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review Auction Details
            </Typography>
            
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="overline" color="textSecondary">
                      Auction Name
                    </Typography>
                    <Typography variant="h5">
                      {formData.name}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="overline" color="textSecondary">
                      Tournament
                    </Typography>
                    <Typography variant="body1">
                      {tournaments.find(t => t._id === formData.tournamentId)?.name}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="overline" color="textSecondary">
                      Timer Duration
                    </Typography>
                    <Typography variant="body1">
                      {formData.timerSeconds} seconds
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="overline" color="textSecondary">
                      Minimum Bid Increment
                    </Typography>
                    <Typography variant="body1">
                      ₹{formData.minBidIncrement.toLocaleString()}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="overline" color="textSecondary">
                      Auto Start
                    </Typography>
                    <Typography variant="body1">
                      {formData.autoStart ? 'Yes' : 'No'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            <Typography variant="h6" gutterBottom>
              Selected Players ({selectedPlayers.length})
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {selectedPlayers.map(player => (
                <Chip
                  key={player._id}
                  label={`${player.name} - ₹${player.basePrice?.toLocaleString() || '0'}`}
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        );
      
      default:
        return null;
    }
  };

  // Check permissions
  if (user?.role !== 'admin' && user?.role !== 'auctioneer') {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          You do not have permission to create auctions.
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/dashboard/auctions')}
          sx={{ mt: 2 }}
        >
          Back to Auctions
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box mb={3}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/dashboard/auctions')}
          >
            Back
          </Button>
          <Typography variant="h4">
            Create New Auction
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 3, mb: 3 }}>
          {getStepContent(activeStep)}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<ArrowBack />}
          >
            Back
          </Button>
          
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleCreateAuction}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
            >
              Create Auction
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<ArrowForward />}
            >
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateAuctionPage;
