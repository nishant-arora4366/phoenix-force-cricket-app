'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useViewer } from '@/contexts/ViewerContext';
import { CircularProgress, Box } from '@mui/material';

interface ViewerRouteProps {
  children: React.ReactNode;
}

const ViewerRoute: React.FC<ViewerRouteProps> = ({ children }) => {
  const { user, loading, createTempViewer } = useAuth();
  const { setViewerMode } = useViewer();

  useEffect(() => {
    // If no user and not loading, create temporary viewer
    if (!loading && !user) {
      createTempViewer().then(() => {
        setViewerMode('Anonymous Viewer');
      }).catch(error => {
        console.error('Failed to create viewer session:', error);
      });
    }
  }, [user, loading, createTempViewer, setViewerMode]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
};

export default ViewerRoute;
