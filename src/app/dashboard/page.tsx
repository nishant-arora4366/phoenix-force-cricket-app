// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  People,
  Gavel,
  Groups,
  EmojiEvents,
  TrendingUp,
  MonetizationOn
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface DashboardStats {
  totalPlayers: number;
  activeAuctions: number;
  totalTeams: number;
  upcomingTournaments: number;
  totalRevenue: number;
  averageBidAmount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0,
    activeAuctions: 0,
    totalTeams: 0,
    upcomingTournaments: 0,
    totalRevenue: 0,
    averageBidAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentAuctions, setRecentAuctions] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const [playersRes, auctionsRes, teamsRes, tournamentsRes] = await Promise.all([
        axios.get('/api/players'),
        axios.get('/api/auctions?active=true'),
        axios.get('/api/teams'),
        axios.get('/api/tournaments?active=true')
      ]);

      // Fetch recent auctions
      const recentAuctionsRes = await axios.get('/api/auctions?limit=5');

      setStats({
        totalPlayers: playersRes.data.count,
        activeAuctions: auctionsRes.data.count,
        totalTeams: teamsRes.data.count,
        upcomingTournaments: tournamentsRes.data.count,
        totalRevenue: 0, // Calculate from auction data
        averageBidAmount: 0 // Calculate from bid data
      });

      setRecentAuctions(recentAuctionsRes.data.auctions);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Players',
      value: stats.totalPlayers,
      icon: <People />,
      color: '#1976d2',
      onClick: () => router.push('/dashboard/players')
    },
    {
      title: 'Active Auctions',
      value: stats.activeAuctions,
      icon: <Gavel />,
      color: '#388e3c',
      onClick: () => router.push('/dashboard/auctions')
    },
    {
      title: 'Teams',
      value: stats.totalTeams,
      icon: <Groups />,
      color: '#f57c00',
      onClick: () => router.push('/dashboard/teams'),
      show: ['admin', 'auctioneer', 'captain', 'manager'].includes(user?.role || '')
    },
    {
      title: 'Tournaments',
      value: stats.upcomingTournaments,
      icon: <EmojiEvents />,
      color: '#d32f2f',
      onClick: () => router.push('/dashboard/tournaments'),
      show: ['admin', 'auctioneer'].includes(user?.role || '')
    }
  ];

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
      <Typography variant="h4" gutterBottom>
        Welcome back, {user?.username}!
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.filter(card => card.show !== false).map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
              }}
              onClick={stat.onClick}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      {stat.title}
                    </Typography>
                    <Typography variant="h3">
                      {stat.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: stat.color }}>
                    {React.cloneElement(stat.icon, { fontSize: 'large' })}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Auctions */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Recent Auctions</Typography>
            <Button 
              size="small" 
              onClick={() => router.push('/dashboard/auctions')}
            >
              View All
            </Button>
          </Box>
          
          {recentAuctions.length === 0 ? (
            <Typography color="textSecondary">No auctions found</Typography>
          ) : (
            <Box>
              {recentAuctions.map((auction) => (
                <Box
                  key={auction._id}
                  sx={{
                    p: 2,
                    mb: 1,
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'grey.50' }
                  }}
                  onClick={() => router.push(`/dashboard/auction/${auction._id}`)}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle1">{auction.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {auction.tournamentId?.name}
                      </Typography>
                    </Box>
                    <Chip 
                      label={auction.status}
                      color={auction.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Box mt={3}>
        <Typography variant="h6" gutterBottom>Quick Actions</Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Button 
              variant="contained" 
              startIcon={<People />}
              onClick={() => router.push('/dashboard/players')}
            >
              View Players
            </Button>
          </Grid>
          <Grid item>
            <Button 
              variant="contained" 
              startIcon={<Gavel />}
              onClick={() => router.push('/dashboard/auctions')}
            >
              View Auctions
            </Button>
          </Grid>
          {['admin', 'auctioneer'].includes(user?.role || '') && (
            <Grid item>
              <Button 
                variant="contained" 
                color="secondary"
                startIcon={<EmojiEvents />}
                onClick={() => router.push('/dashboard/tournaments/create')}
              >
                Create Tournament
              </Button>
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
}
