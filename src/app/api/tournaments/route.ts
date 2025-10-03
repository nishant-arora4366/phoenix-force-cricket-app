import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/config/database';
import Tournament from '@/lib/models/tournament/Tournament';
import { withAuth, requireAdmin, AuthenticatedRequest } from '@/lib/middleware/auth';

// GET /api/tournaments - Get tournaments
export async function GET(req: NextRequest) {
  const authHandler = withAuth(async (req: AuthenticatedRequest) => {
    try {
      await connectToDatabase();
    
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const format = searchParams.get('format');
    const active = searchParams.get('active');
    const createdBy = searchParams.get('createdBy');
    
    let query: any = { isActive: true };
    
    if (status) {
      query.status = status;
    }
    
    if (format) {
      query.format = format;
    }
    
    if (createdBy) {
      query.createdBy = createdBy;
    }
    
    let tournaments;
    
    if (active === 'true') {
      tournaments = await Tournament.findActive();
    } else {
      tournaments = await Tournament.find(query)
        .populate('teams', 'name')
        .populate('captains', 'username profile')
        .populate('createdBy', 'username')
        .sort({ date: -1 });
    }
    
    return NextResponse.json({
      success: true,
      tournaments,
      count: tournaments.length
    });
    
  } catch (error) {
    console.error('Get tournaments error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch tournaments' },
      { status: 500 }
    );
    }
  });
  
  return authHandler(req);
}

// POST /api/tournaments - Create new tournament (Admin only)
export const POST = requireAdmin(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    
    const tournamentData = await req.json();
    
    // Add creator
    tournamentData.createdBy = req.user!.userId;
    
    // Validate required fields
    if (!tournamentData.name || !tournamentData.date || !tournamentData.format) {
      return NextResponse.json(
        { error: 'Tournament name, date and format are required' },
        { status: 400 }
      );
    }
    
    // Create tournament
    const tournament = await Tournament.createTournament(tournamentData);
    
    // Populate references
    await tournament.populate([
      { path: 'createdBy', select: 'username' }
    ]);
    
    return NextResponse.json({
      success: true,
      tournament,
      message: 'Tournament created successfully'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Create tournament error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create tournament' },
      { status: 500 }
    );
  }
});
