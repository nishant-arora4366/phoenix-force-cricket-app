'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ViewerContextType {
  isViewer: boolean;
  viewerName: string;
  setViewerMode: (name: string) => void;
  clearViewerMode: () => void;
}

const ViewerContext = createContext<ViewerContextType | undefined>(undefined);

export const useViewer = () => {
  const context = useContext(ViewerContext);
  if (!context) {
    throw new Error('useViewer must be used within a ViewerProvider');
  }
  return context;
};

interface ViewerProviderProps {
  children: ReactNode;
}

export const ViewerProvider: React.FC<ViewerProviderProps> = ({ children }) => {
  const [isViewer, setIsViewer] = useState(false);
  const [viewerName, setViewerName] = useState('');

  const setViewerMode = (name: string) => {
    setIsViewer(true);
    setViewerName(name);
  };

  const clearViewerMode = () => {
    setIsViewer(false);
    setViewerName('');
  };

  const value = {
    isViewer,
    viewerName,
    setViewerMode,
    clearViewerMode
  };

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
};
