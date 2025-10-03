'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Avatar,
  Breadcrumbs,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack,
  History,
  EmojiEvents,
  Group,
  Gavel,
  ExpandMore,
  People,
  AttachMoney,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface Player {
  _id: string;
  name: string;
  role: string[];
  basePrice: number;
  soldPrice?: number;
  teamId?: string;
}

interface Team {
  _id: string;
  name: string;
  shortName: string;
  budget: number;
  players: Player[];
  tournamentId: string;
}

interface AuctionDetail {
  _id: string;
  name: string;
  status: string;
  tournamentId: string;
  players: Player[];
  soldPlayers: Player[];
  unsoldPlayers: Player[];
  skippedPlayers: Player[];
  createdAt: string;
  updatedAt: string;
}

const AuctionDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const auctionId = params.id as string;
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAuctionDetails();
  }, [auctionId]);

  const fetchAuctionDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch auction details
      const auctionRes = await axios.get(`/api/auctions/${auctionId}`);
      const auctionData = auctionRes.data.auction;
      
      // Fetch teams for this tournament
      const teamsRes = await axios.get(`/api/teams`);
      const allTeams = teamsRes.data.teams || [];
      const tournamentTeams = allTeams.filter((team: Team) => team.tournamentId === auctionData.tournamentId);
      
      setAuction(auctionData);
      setTeams(tournamentTeams);
      
      // Initially expand all teams
      const initialExpanded: Record<string, boolean> = {};
      tournamentTeams.forEach((team: Team) => {
        initialExpanded[team._id] = true;
      });
      setExpandedTeams(initialExpanded);
      
    } catch (error) {
      console.error('Error fetching auction details:', error);
      setError('Failed to fetch auction details');
    } finally {
      setLoading(false);
    }
  };

  const toggleTeamExpansion = (teamId: string) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'success' | 'warning' | 'info' | 'error'> = {
      active: 'success',
      pending: 'warning',
      completed: 'info',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  const calculateTeamStats = (team: Team) => {
    const soldPlayers = auction?.soldPlayers.filter(p => p.teamId === team._id) || [];
    const totalSpent = soldPlayers.reduce((sum, player) => sum + (player.soldPrice || 0), 0);
    const remainingBudget = team.budget - totalSpent;
    
    return {
      playerCount: soldPlayers.length,
      totalSpent,
      remainingBudget,
      avgPrice: soldPlayers.length > 0 ? totalSpent / soldPlayers.length : 0,
    };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
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

  const totalSold = auction.soldPlayers?.length || 0;
  const totalUnsold = auction.unsoldPlayers?.length || 0;
  const totalSkipped = auction.skippedPlayers?.length || 0;
  const totalRevenue = auction.soldPlayers?.reduce((sum, p) => sum + (p.soldPrice || 0), 0) || 0;

  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box mb={3}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => router.push('/dashboard')}
          >
            Dashboard
          </Link>
          <Link
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => router.push('/dashboard/auctions')}
          >
            Auctions
          </Link>
          <Typography color="text.primary">{auction.name}</Typography>
        </Breadcrumbs>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" gutterBottom>
            {auction.name}
          </Typography>
          <Box>
            <Chip
              label={auction.status}
              color={getStatusColor(auction.status)}
              sx={{ mr: 1 }}
            />
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => router.push('/dashboard/auctions')}
            >
              Back to Auctions
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <Gavel sx={{ mr: 1, color: 'primary.main' }} />
                <Typography color="textSecondary" gutterBottom>
                  Players Sold
                </Typography>
              </Box>
              <Typography variant="h4">
                {totalSold}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <AttachMoney sx={{ mr: 1, color: 'success.main' }} />
                <Typography color="textSecondary" gutterBottom>
                  Total Revenue
                </Typography>
              </Box>
              <Typography variant="h4">
                ₹{totalRevenue.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <People sx={{ mr: 1, color: 'warning.main' }} />
                <Typography color="textSecondary" gutterBottom>
                  Unsold Players
                </Typography>
              </Box>
              <Typography variant="h4">
                {totalUnsold}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <History sx={{ mr: 1, color: 'info.main' }} />
                <Typography color="textSecondary" gutterBottom>
                  Skipped Players
                </Typography>
              </Box>
              <Typography variant="h4">
                {totalSkipped}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Teams Section */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <Group sx={{ mr: 1 }} />
        Team Compositions
      </Typography>

      {teams.map(team => {
        const stats = calculateTeamStats(team);
        const teamPlayers = auction.soldPlayers.filter(p => p.teamId === team._id);
        
        return (
          <Accordion
            key={team._id}
            expanded={expandedTeams[team._id]}
            onChange={() => toggleTeamExpansion(team._id)}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                  {team.shortName || team.name.substring(0, 2).toUpperCase()}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">{team.name}</Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                    <Typography variant="body2" color="textSecondary">
                      Players: {stats.playerCount}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Spent: ₹{stats.totalSpent.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Remaining: ₹{stats.remainingBudget.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Price: ₹{Math.round(stats.avgPrice).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {teamPlayers.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Player Name</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell align="right">Base Price</TableCell>
                        <TableCell align="right">Sold Price</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {teamPlayers.map(player => (
                        <TableRow key={player._id}>
                          <TableCell>{player.name}</TableCell>
                          <TableCell>
                            {player.role.map(r => (
                              <Chip key={r} label={r} size="small" sx={{ mr: 0.5 }} />
                            ))}
                          </TableCell>
                          <TableCell align="right">
                            ₹{player.basePrice?.toLocaleString() || '0'}
                          </TableCell>
                          <TableCell align="right">
                            <Typography color="primary" fontWeight="medium">
                              ₹{player.soldPrice?.toLocaleString() || '0'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="textSecondary" sx={{ p: 2 }}>
                  No players purchased yet
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Sold Players Section */}
      <Box mt={4}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <EmojiEvents sx={{ mr: 1 }} />
          All Sold Players
        </Typography>
        
        {auction.soldPlayers && auction.soldPlayers.length > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Player Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell align="right">Base Price</TableCell>
                  <TableCell align="right">Sold Price</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auction.soldPlayers
                  .sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0))
                  .map(player => {
                    const team = teams.find(t => t._id === player.teamId);
                    return (
                      <TableRow key={player._id}>
                        <TableCell>{player.name}</TableCell>
                        <TableCell>
                          {player.role.map(r => (
                            <Chip key={r} label={r} size="small" sx={{ mr: 0.5 }} />
                          ))}
                        </TableCell>
                        <TableCell>{team?.name || 'N/A'}</TableCell>
                        <TableCell align="right">
                          ₹{player.basePrice?.toLocaleString() || '0'}
                        </TableCell>
                        <TableCell align="right">
                          <Typography color="primary" fontWeight="medium">
                            ₹{player.soldPrice?.toLocaleString() || '0'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">No players have been sold yet</Alert>
        )}
      </Box>
    </Container>
  );
};

export default AuctionDetailsPage;
