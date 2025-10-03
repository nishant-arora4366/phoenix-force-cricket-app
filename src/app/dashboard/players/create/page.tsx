// @ts-nocheck
'use client';

import React, { useState } from 'react';
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
  Grid,
  Chip,
  FormHelperText,
  InputAdornment,
  OutlinedInput,
  FormLabel,
  SelectChangeEvent,
  IconButton
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Add,
  Clear,
  SportsCricket,
  Person
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface CreatePlayerForm {
  name: string;
  role: string[];
  battingStyle: string;
  bowlingStyle: string;
  basePrice: number;
  battingRating: number;
  bowlingRating: number;
  playerGroup: string[];
  profileImage?: string;
}

const ROLES = ['Batsman', 'Bowler', 'All-Rounder', 'Wicket-Keeper'];
const BATTING_STYLES = ['Right-Hand Bat', 'Left-Hand Bat'];
const BOWLING_STYLES = ['Right-Arm Fast', 'Left-Arm Fast', 'Right-Arm Medium', 'Left-Arm Medium', 'Right-Arm Spin', 'Left-Arm Spin', 'N/A'];
const PLAYER_GROUPS = ['A', 'B', 'C', 'D', 'Marquee', 'Emerging'];

const CreatePlayerPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState<CreatePlayerForm>({
    name: '',
    role: [],
    battingStyle: '',
    bowlingStyle: '',
    basePrice: 0,
    battingRating: 5,
    bowlingRating: 5,
    playerGroup: [],
    profileImage: ''
  });

  const [bulkMode, setBulkMode] = useState(false);
  const [bulkData, setBulkData] = useState('');

  const handleInputChange = (field: keyof CreatePlayerForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRoleChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      role: typeof value === 'string' ? value.split(',') : value
    }));
  };

  const handleGroupChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      playerGroup: typeof value === 'string' ? value.split(',') : value
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Player name is required');
      return false;
    }
    if (formData.role.length === 0) {
      setError('Please select at least one role');
      return false;
    }
    if (!formData.battingStyle) {
      setError('Batting style is required');
      return false;
    }
    if (!formData.bowlingStyle) {
      setError('Bowling style is required');
      return false;
    }
    if (formData.basePrice < 0) {
      setError('Base price cannot be negative');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');
      
      const response = await axios.post('/api/players', formData);
      
      if (response.data.success) {
        setSuccess('Player created successfully!');
        // Reset form
        setFormData({
          name: '',
          role: [],
          battingStyle: '',
          bowlingStyle: '',
          basePrice: 0,
          battingRating: 5,
          bowlingRating: 5,
          playerGroup: [],
          profileImage: ''
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push('/dashboard/players');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error creating player:', error);
      setError(error.response?.data?.message || 'Failed to create player');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Parse CSV or JSON data
      const players = parseBulkData(bulkData);
      
      if (players.length === 0) {
        setError('No valid player data found');
        return;
      }
      
      const response = await axios.post('/api/players/bulk', { players });
      
      if (response.data.success) {
        setSuccess(`Successfully created ${response.data.count} players!`);
        setBulkData('');
        setTimeout(() => {
          router.push('/dashboard/players');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error creating players:', error);
      setError(error.response?.data?.message || 'Failed to create players');
    } finally {
      setLoading(false);
    }
  };

  const parseBulkData = (data: string) => {
    // Simple CSV parser
    const lines = data.trim().split('\n');
    const players: any[] = [];
    
    // Skip header if present
    const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length >= 5) {
        players.push({
          name: parts[0],
          role: parts[1].split('/').map(r => r.trim()),
          battingStyle: parts[2],
          bowlingStyle: parts[3],
          basePrice: parseInt(parts[4]) || 0,
          battingRating: parseInt(parts[5]) || 5,
          bowlingRating: parseInt(parts[6]) || 5,
          playerGroup: parts[7] ? parts[7].split('/').map(g => g.trim()) : []
        });
      }
    }
    
    return players;
  };

  // Check permissions
  if (user?.role !== 'admin' && user?.role !== 'auctioneer') {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2 }}>
          You do not have permission to create players.
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/dashboard/players')}
          sx={{ mt: 2 }}
        >
          Back to Players
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
            onClick={() => router.push('/dashboard/players')}
          >
            Back
          </Button>
          <Typography variant="h4">
            Create New Player
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
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">
            {bulkMode ? 'Bulk Create Players' : 'Player Details'}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setBulkMode(!bulkMode)}
            startIcon={bulkMode ? <Person /> : <Add />}
          >
            {bulkMode ? 'Single Player' : 'Bulk Import'}
          </Button>
        </Box>

        {!bulkMode ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Player Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SportsCricket />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Roles</InputLabel>
                <Select
                  multiple
                  value={formData.role}
                  onChange={handleRoleChange}
                  input={<OutlinedInput label="Roles" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {ROLES.map((role) => (
                    <MenuItem key={role} value={role}>
                      {role}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Select player roles</FormHelperText>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Batting Style</InputLabel>
                <Select
                  value={formData.battingStyle}
                  onChange={(e) => handleInputChange('battingStyle', e.target.value)}
                  label="Batting Style"
                >
                  {BATTING_STYLES.map((style) => (
                    <MenuItem key={style} value={style}>
                      {style}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Bowling Style</InputLabel>
                <Select
                  value={formData.bowlingStyle}
                  onChange={(e) => handleInputChange('bowlingStyle', e.target.value)}
                  label="Bowling Style"
                >
                  {BOWLING_STYLES.map((style) => (
                    <MenuItem key={style} value={style}>
                      {style}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Base Price"
                value={formData.basePrice}
                onChange={(e) => handleInputChange('basePrice', parseInt(e.target.value) || 0)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                }}
                helperText="Starting auction price for the player"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Player Groups</InputLabel>
                <Select
                  multiple
                  value={formData.playerGroup}
                  onChange={handleGroupChange}
                  input={<OutlinedInput label="Player Groups" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" color="primary" />
                      ))}
                    </Box>
                  )}
                >
                  {PLAYER_GROUPS.map((group) => (
                    <MenuItem key={group} value={group}>
                      {group}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>Select player categories</FormHelperText>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box>
                <FormLabel>Batting Rating</FormLabel>
                <Box display="flex" alignItems="center" gap={2}>
                  <TextField
                    fullWidth
                    type="number"
                    value={formData.battingRating}
                    onChange={(e) => handleInputChange('battingRating', parseInt(e.target.value) || 5)}
                    inputProps={{ min: 1, max: 10 }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    / 10
                  </Typography>
                </Box>
                <FormHelperText>Rate batting skill (1-10)</FormHelperText>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box>
                <FormLabel>Bowling Rating</FormLabel>
                <Box display="flex" alignItems="center" gap={2}>
                  <TextField
                    fullWidth
                    type="number"
                    value={formData.bowlingRating}
                    onChange={(e) => handleInputChange('bowlingRating', parseInt(e.target.value) || 5)}
                    inputProps={{ min: 1, max: 10 }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    / 10
                  </Typography>
                </Box>
                <FormHelperText>Rate bowling skill (1-10)</FormHelperText>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Profile Image URL (Optional)"
                value={formData.profileImage}
                onChange={(e) => handleInputChange('profileImage', e.target.value)}
                helperText="URL to player's profile image"
              />
            </Grid>
          </Grid>
        ) : (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                CSV Format: Name, Role(s), Batting Style, Bowling Style, Base Price, Batting Rating, Bowling Rating, Group(s)
              </Typography>
              <Typography variant="body2">
                Example: Virat Kohli, Batsman/All-Rounder, Right-Hand Bat, Right-Arm Medium, 2000000, 10, 6, Marquee/A
              </Typography>
            </Alert>
            
            <TextField
              fullWidth
              multiline
              rows={12}
              label="Bulk Player Data"
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              placeholder="Paste CSV data here..."
              helperText="Enter player data in CSV format"
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
          <Button
            variant="outlined"
            onClick={() => router.push('/dashboard/players')}
          >
            Cancel
          </Button>
          
          <Button
            variant="contained"
            onClick={bulkMode ? handleBulkSubmit : handleSubmit}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Save />}
          >
            {bulkMode ? 'Import Players' : 'Create Player'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreatePlayerPage;
