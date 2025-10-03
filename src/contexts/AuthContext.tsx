'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  profile: any;
  isTemporary: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
  createTempViewer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Set axios defaults
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await axios.get('/api/auth/me');
      
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/login', {
        identifier,
        password
      });

      if (response.data.success) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser(user);
        router.push('/dashboard');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      router.push('/login');
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await axios.post('/api/auth/register', {
        username,
        email,
        password
      });

      if (response.data.success) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser(user);
        router.push('/dashboard');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const refreshProfile = async () => {
    await loadUser();
  };

  const updateProfile = async (updates: any) => {
    try {
      const response = await axios.put('/api/auth/me', updates);
      
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Update failed');
    }
  };

  const createTempViewer = async () => {
    try {
      const response = await axios.post('/api/auth/temp-viewer');
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser(user);
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create viewer session');
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    refreshProfile,
    updateProfile,
    createTempViewer
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
