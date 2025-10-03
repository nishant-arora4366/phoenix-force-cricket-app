import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/config/database';
import Player from '@/lib/models/player/Player';
import { requireAdmin, AuthenticatedRequest } from '@/lib/middleware/auth';

// GET /api/players/[id] - Get player by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    
    const player = await Player.findById(params.id);
    
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      player
    });
    
  } catch (error) {
    console.error('Get player error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch player' },
      { status: 500 }
    );
  }
}

// PUT /api/players/[id] - Update player (Admin only)
export const PUT = requireAdmin(async (
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await connectToDatabase();
    
    const updates = await req.json();
    
    // Remove sensitive fields
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    
    const player = await Player.findByIdAndUpdate(
      params.id,
      updates,
      { new: true, runValidators: true }
    );
    
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      player,
      message: 'Player updated successfully'
    });
    
  } catch (error: any) {
    console.error('Update player error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { error: messages.join(', ') },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
});

// DELETE /api/players/[id] - Delete player (Admin only)
export const DELETE = requireAdmin(async (
  req: AuthenticatedRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await connectToDatabase();
    
    const player = await Player.findByIdAndUpdate(
      params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Player deactivated successfully'
    });
    
  } catch (error) {
    console.error('Delete player error:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete player' },
      { status: 500 }
    );
  }
});
