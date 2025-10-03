import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/config/database';
import Player from '@/lib/models/player/Player';
import { withAuth, requireAdmin, AuthenticatedRequest } from '@/lib/middleware/auth';

// GET /api/players - Get all players
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const searchParams = req.nextUrl.searchParams;
    const role = searchParams.get('role');
    const group = searchParams.get('group');
    const isActive = searchParams.get('isActive');
    const auctionEligible = searchParams.get('auctionEligible');
    
    let query: any = {};
    
    if (role) {
      query.role = role;
    }
    
    if (group) {
      query.playerGroup = group;
    }
    
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }
    
    let players;
    
    if (auctionEligible === 'true') {
      players = await Player.findEligibleForAuction();
    } else {
      players = await Player.find(query).sort({ name: 1 });
    }
    
    return NextResponse.json({
      success: true,
      players,
      count: players.length
    });
    
  } catch (error) {
    console.error('Get players error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

// POST /api/players - Create new player (Admin only)
export const POST = requireAdmin(async (req: AuthenticatedRequest) => {
  try {
    await connectToDatabase();
    
    const playerData = await req.json();
    
    // Validate required fields
    if (!playerData.name || !playerData.role || playerData.role.length === 0) {
      return NextResponse.json(
        { error: 'Name and at least one role are required' },
        { status: 400 }
      );
    }
    
    // Create player
    const player = await Player.createPlayer(playerData);
    
    return NextResponse.json({
      success: true,
      player,
      message: 'Player created successfully'
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Create player error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    );
  }
});
