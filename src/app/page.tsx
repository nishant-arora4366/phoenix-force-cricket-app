// @ts-nocheck
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );
}
