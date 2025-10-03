import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/config/database';
import Team from '@/lib/models/team/Team';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/auth';
import { config } from '@/lib/config/config';

// GET /api/teams/[id] - Get team by ID
export const GET = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await connectToDatabase();
    
    const team = await Team.findById(params.id)
      .populate('tournamentId', 'name format settings')
      .populate('captainId', 'username profile')
      .populate('managerId', 'username profile')
      .populate('players.playerId', 'name role battingStyle bowlingStyle basePrice');
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      team
    });
    
  } catch (error) {
    console.error('Get team error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
});

// PUT /api/teams/[id] - Update team
export const PUT = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await connectToDatabase();
    
    const updates = await req.json();
    const team = await Team.findById(params.id);
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Check permissions
    const isTeamOwner = team.captainId.toString() === req.user!.userId;
    const isAdmin = req.user!.role === config.roles.ADMIN;
    const isAuctioneer = req.user!.role === config.roles.AUCTIONEER;
    
    if (!isTeamOwner && !isAdmin && !isAuctioneer) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update your own team' },
        { status: 403 }
      );
    }
    
    // Remove sensitive fields
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.tournamentId;
    delete updates.captainId;
    delete updates.players;
    delete updates.tokens;
    delete updates.totalSpent;
    
    const updatedTeam = await Team.findByIdAndUpdate(
      params.id,
      updates,
      { new: true, runValidators: true }
    ).populate([
      { path: 'tournamentId', select: 'name format' },
      { path: 'captainId', select: 'username profile' },
      { path: 'managerId', select: 'username profile' }
    ]);
    
    return NextResponse.json({
      success: true,
      team: updatedTeam,
      message: 'Team updated successfully'
    });
    
  } catch (error: any) {
    console.error('Update team error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
});

// DELETE /api/teams/[id] - Deactivate team
export const DELETE = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await connectToDatabase();
    
    const team = await Team.findById(params.id);
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }
    
    // Check permissions
    const isAdmin = req.user!.role === config.roles.ADMIN;
    const isAuctioneer = req.user!.role === config.roles.AUCTIONEER;
    
    if (!isAdmin && !isAuctioneer) {
      return NextResponse.json(
        { error: 'Forbidden - Only admin or auctioneer can delete teams' },
        { status: 403 }
      );
    }
    
    team.isActive = false;
    await team.save();
    
    return NextResponse.json({
      success: true,
      message: 'Team deactivated successfully'
    });
    
  } catch (error) {
    console.error('Delete team error:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
});
