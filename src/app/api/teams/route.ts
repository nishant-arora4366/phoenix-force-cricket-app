import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/config/database';
import Team from '@/lib/models/team/Team';
import { withAuth, requireCaptain, AuthenticatedRequest } from '@/lib/middleware/auth';
import { config } from '@/lib/config/config';

// GET /api/teams - Get teams
export async function GET(req: NextRequest) {
  const authHandler = withAuth(async (req: AuthenticatedRequest) => {
    try {
      await connectToDatabase();
    
    const searchParams = req.nextUrl.searchParams;
    const tournamentId = searchParams.get('tournamentId');
    const captainId = searchParams.get('captainId');
    const myTeam = searchParams.get('myTeam');
    
    let query: any = { isActive: true };
    
    if (tournamentId) {
      query.tournamentId = tournamentId;
    }
    
    if (captainId) {
      query.captainId = captainId;
    }
    
    // If user wants their team only
    if (myTeam === 'true' && req.user) {
      query.captainId = req.user.userId;
    }
    
    const teams = await Team.find(query)
      .populate('tournamentId', 'name format')
      .populate('captainId', 'username profile')
      .populate('managerId', 'username profile')
      .populate('players.playerId', 'name role battingStyle bowlingStyle')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      teams,
      count: teams.length
    });
    
    } catch (error) {
      console.error('Get teams error:', error);
      
      return NextResponse.json(
        { error: 'Failed to fetch teams' },
        { status: 500 }
      );
    }
  });
  
  return authHandler(req);
}

// POST /api/teams - Create new team (Captain or higher)
export async function POST(req: NextRequest) {
  const authHandler = requireCaptain(async (req: AuthenticatedRequest) => {
    try {
      await connectToDatabase();
    
    const teamData = await req.json();
    
    // Validate required fields
    if (!teamData.name || !teamData.tournamentId) {
      return NextResponse.json(
        { error: 'Team name and tournament ID are required' },
        { status: 400 }
      );
    }
    
    // If user is captain, they can only create team for themselves
    if (req.user!.role === config.roles.CAPTAIN) {
      teamData.captainId = req.user!.userId;
    } else if (!teamData.captainId) {
      // Admin/Auctioneer must specify captain
      return NextResponse.json(
        { error: 'Captain ID is required' },
        { status: 400 }
      );
    }
    
    // Check if captain already has a team in this tournament
    const existingTeam = await Team.findOne({
      tournamentId: teamData.tournamentId,
      captainId: teamData.captainId,
      isActive: true
    });
    
    if (existingTeam) {
      return NextResponse.json(
        { error: 'Captain already has a team in this tournament' },
        { status: 400 }
      );
    }
    
    // Create team
    const team = await Team.createTeam(teamData);
    
    // Populate references
    await team.populate([
      { path: 'tournamentId', select: 'name format' },
      { path: 'captainId', select: 'username profile' }
    ]);
    
    return NextResponse.json({
      success: true,
      team,
      message: 'Team created successfully'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Create team error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
    }
  });
  
  return authHandler(req);
}
