'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Tooltip
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Search,
  Add,
  Edit,
  Delete,
  PersonAdd,
  AdminPanelSettings,
  Block,
  CheckCircle,
  Lock
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

const UserManagementPage = () => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  
  // Form states for adding new user
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'viewer'
  });
  
  // Form state for editing user
  const [editForm, setEditForm] = useState({
    role: ''
  });

  useEffect(() => {
    // Check if user is admin
    if (currentUser?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    
    fetchUsers();
  }, [currentUser, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/auth/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    try {
      const response = await axios.post('/api/auth/register', newUser);
      if (response.data.success) {
        setOpenAddDialog(false);
        setNewUser({ username: '', email: '', password: '', role: 'viewer' });
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error adding user:', error);
      alert(error.response?.data?.message || 'Failed to add user');
    }
  };

  const handleUpdateUserRole = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await axios.put(`/api/auth/users/${selectedUser._id}/role`, {
        role: editForm.role
      });
      
      if (response.data.success) {
        setOpenEditDialog(false);
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error updating user role:', error);
      alert(error.response?.data?.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      const response = await axios.delete(`/api/auth/users/${selectedUser._id}`);
      if (response.data.success) {
        setOpenDeleteDialog(false);
        fetchUsers();
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    const colors: Record<string, 'error' | 'warning' | 'info' | 'success' | 'default'> = {
      admin: 'error',
      auctioneer: 'warning',
      captain: 'info',
      manager: 'success',
      bidder: 'default',
      viewer: 'default'
    };
    return colors[role] || 'default';
  };

  const columns: GridColDef[] = [
    {
      field: 'avatar',
      headerName: '',
      width: 60,
      renderCell: (params: GridRenderCellParams) => (
        <Avatar sx={{ width: 32, height: 32 }}>
          {params.row.username.charAt(0).toUpperCase()}
        </Avatar>
      )
    },
    {
      field: 'username',
      headerName: 'Username',
      flex: 1,
      minWidth: 150
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      minWidth: 200
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          color={getRoleColor(params.value)}
          size="small"
          icon={params.value === 'admin' ? <AdminPanelSettings /> : undefined}
        />
      )
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        params.value ? (
          <Chip
            label="Active"
            color="success"
            size="small"
            icon={<CheckCircle />}
          />
        ) : (
          <Chip
            label="Inactive"
            color="error"
            size="small"
            icon={<Block />}
          />
        )
      )
    },
    {
      field: 'lastLogin',
      headerName: 'Last Login',
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        params.value ? new Date(params.value).toLocaleString() : 'Never'
      )
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 180,
      renderCell: (params: GridRenderCellParams) => (
        new Date(params.value).toLocaleDateString()
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <>
          <Tooltip title="Edit Role">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedUser(params.row);
                setEditForm({ role: params.row.role });
                setOpenEditDialog(true);
              }}
              disabled={params.row._id === currentUser?._id}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete User">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedUser(params.row);
                setOpenDeleteDialog(true);
              }}
              disabled={params.row._id === currentUser?._id || params.row.role === 'admin'}
              color="error"
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )
    }
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <Box p={3}>
        <Alert severity="error">
          You do not have permission to access this page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <TextField
            placeholder="Search users..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setOpenAddDialog(true)}
          >
            Add User
          </Button>
        </Box>
        
        <DataGrid
          rows={filteredUsers}
          columns={columns}
          getRowId={(row) => row._id}
          autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
              },
            },
          }}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'action.hover',
            }
          }}
        />
      </Paper>
      
      {/* Add User Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Username"
              fullWidth
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              required
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              required
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              required
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                label="Role"
              >
                <MenuItem value="viewer">Viewer</MenuItem>
                <MenuItem value="bidder">Bidder</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="captain">Captain</MenuItem>
                <MenuItem value="auctioneer">Auctioneer</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button
            onClick={handleAddUser}
            variant="contained"
            disabled={!newUser.username || !newUser.email || !newUser.password}
          >
            Add User
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User Role</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Editing role for: <strong>{selectedUser?.username}</strong>
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={editForm.role}
                onChange={(e) => setEditForm({ role: e.target.value })}
                label="Role"
              >
                <MenuItem value="viewer">Viewer</MenuItem>
                <MenuItem value="bidder">Bidder</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="captain">Captain</MenuItem>
                <MenuItem value="auctioneer">Auctioneer</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateUserRole} variant="contained">
            Update Role
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete User Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user <strong>{selectedUser?.username}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagementPage;
